import assert from "node:assert";
import { describe, it } from "node:test";

import { Editor } from "../src/components/editor.ts";
import { TuiMainScreen } from "../src/tui-main-screen.ts";
import { defaultEditorTheme } from "./test-themes.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

/**
 * Echadron-local patch: click-to-position-cursor. `placeCursorFromClick`
 * receives terminal display columns, while the editor stores UTF-16 offsets,
 * so the mapping has to spend display width grapheme by grapheme. Adding the
 * two directly lands the cursor in the wrong place for wide glyphs and can
 * split a grapheme.
 */
const WIDTH = 40;

function clickAt(text: string, column: number): number {
	const editor = new Editor(new TuiMainScreen(new VirtualTerminal()), defaultEditorTheme);
	editor.setText(text);
	editor.render(WIDTH);
	editor.placeCursorFromClick(column, 1, WIDTH);
	return (editor as unknown as { state: { cursorCol: number } }).state.cursorCol;
}

describe("Editor.placeCursorFromClick", () => {
	it("maps columns straight through for ASCII", () => {
		for (const column of [1, 4, 7]) {
			assert.strictEqual(clickAt("hello world", column), column);
		}
	});

	it("accounts for double-width glyphs", () => {
		// Each CJK glyph is two cells, so the third one begins at offset 2.
		assert.strictEqual(clickAt("你好世界", 1), 0);
		assert.strictEqual(clickAt("你好世界", 3), 1);
		assert.strictEqual(clickAt("你好世界", 5), 2);
	});

	it("never places the cursor inside a multi-unit grapheme", () => {
		// "a👍b": the thumb is one grapheme of two UTF-16 units and two cells,
		// so offset 2 is interior and must never be selected.
		for (let column = 0; column <= 6; column += 1) {
			const cursor = clickAt("a👍b", column);
			assert.notStrictEqual(cursor, 2, `column ${column} split the grapheme`);
		}
	});

	it("clamps a click past the end of the text", () => {
		assert.strictEqual(clickAt("hi", 30), 2);
	});
});
