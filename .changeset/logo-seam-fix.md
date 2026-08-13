---
"echadron": patch
---

Close the horizontal seam through the welcome logo. The cube was drawn with foreground block glyphs, and a font only paints its own glyph box — so in terminals that add line spacing (Terminal.app among them) two stacked rows of `█` showed a gap between them. Solid cells now also set the cell background, which the terminal fills edge to edge regardless of font metrics. The half-block edges and the quadrant that carves the eyes stay foreground-only so their empty parts still show through.
