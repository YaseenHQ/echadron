# Custom Themes

Echadron CLI can use a built-in color scheme or a custom JSON theme file. Custom files live in the themes directory and appear in `/theme` alongside the built-in choices.

## Built-in color tokens

Custom themes can override the tokens below. The `dark` and `light` columns show the built-in values; `auto` resolves to one of those palettes at startup, and falls back to `dark` when terminal background detection is unavailable.

| Token | `dark` | `light` | What it controls |
| --- | --- | --- | --- |
| `primary` | `#E1E1E1` | `#262626` | Chrome identity. Selected items, focused editor text, links, inline code |
| `accent` | `#1ABC9C` | `#0A7A62` | Secondary highlight. Approval prefix, queue, device-code box |
| `running` | `#BB9AF7` | `#7D4BC6` | Live-agent pop. Thinking spinner, running badges, in-flight tool icons |
| `text` | `#E1E1E1` | `#262626` | Body text. Dialog bodies, todo titles, Markdown headings, assistant/tool message bullets |
| `textStrong` | `#F3F3F3` | `#141414` | Emphasized / bold text. Input dialogs, status messages |
| `textDim` | `#C8C8C8` | `#444444` | Secondary, dimmed text. Thinking body, hints, descriptions, completed todos, Markdown quotes, footer status bar |
| `textMuted` | `#6C6C6C` | `#767676` | Faintest text. Counters, scroll info, descriptions, Markdown link URLs, code-block borders |
| `border` | `#505058` | `#626262` | Pane and editor borders, Markdown horizontal rule |
| `borderFocus` | `#505058` | `#626262` | Focus / attention border, currently only the approval panel |
| `surfaceTool` | `#1C1C1C` | `#E4E4E4` | Tool execution panel background — neutral surface that groups each tool call |
| `surfaceToolSuccess` | `#141A14` | `#DAF2DC` | Tool panel background on success — slight success tint |
| `surfaceToolError` | `#1C1215` | `#F5DADE` | Tool panel background on error — slight error tint |
| `surfaceUser` | `#242424` | `#DEDEDE` | User message background — distinguishes user input from assistant output |
| `success` | `#9ECE6A` | `#0E7A38` | Success state. `✓`, "enabled", completed |
| `warning` | `#E0AF68` | `#8A5808` | Warning state. auto/yolo badges, stale markers, Plan mode hint |
| `error` | `#F7768E` | `#CD3048` | Error state. Error messages, failed tool output |
| `diffAdded` | `#9ECE6A` | `#0E7A38` | Diff added lines |
| `diffRemoved` | `#F7768E` | `#CD3048` | Diff removed lines |
| `diffAddedStrong` | `#B4E07F` | `#0E7A38` | Diff intra-line changed words, added and bold |
| `diffRemovedStrong` | `#FF9AAD` | `#CD3048` | Diff intra-line changed words, removed and bold |
| `diffGutter` | `#6C6C6C` | `#626262` | Diff line-number gutter |
| `diffMeta` | `#C8C8C8` | `#767676` | Diff meta / hunk headers |
| `roleUser` | `#C8C8C8` | `#444444` | User message bullet and text, skill-activation name |
| `shellMode` | `#E0AF68` | `#8A5808` | Shell mode (`!`) prompt, editor border, and the echoed `$ command` line |
| `onPrimary` | `#141414` | `#FFFFFF` | Text that sits on a `primary` fill (selected tabs) |

## Use the custom-theme skill

You do not need to write the JSON by hand. Run the built-in `/custom-theme [extra text]` skill command to enter the custom-theme workflow; the skill can choose colors, write the file under `~/.echadron/themes/`, validate the hex values, and tell you how to apply it.

Example invocations:

- `/custom-theme Create a warm dark theme with amber accents.`
- `/custom-theme Make a light theme based on Solarized, but keep errors easy to see.`
- `/custom-theme Tweak my ember theme so diffs have higher contrast.`

After activation, the skill usually asks whether you want a light or dark base, what mood or palette you prefer, and whether you have exact colors to include. If you use it to edit an existing theme, make sure it reads and backs up the file before overwriting it.

## Create a theme

Add a `.json` file to the themes directory:

- `~/.echadron/themes/`
- or `$ECHADRON_HOME/themes/` when the `ECHADRON_HOME` environment variable is set

`ECHADRON_HOME` is the canonical data-root variable. The legacy `IMPERIUM_HOME` and `KIMI_CODE_HOME` aliases remain supported.

Create the directory if it does not exist. **The filename is the theme name**: `ember.json` appears in `/theme` as `Custom: ember`.

A minimal theme only sets the colors you want to change; the rest fall back to the **base palette** (`dark` by default):

```json
{
  "name": "ember",
  "colors": {
    "primary": "#83A598",
    "accent": "#FE8019"
  }
}
```

Fields:

- `name` (required): the theme identifier.
- `displayName` (optional): a human-readable name.
- `base` (optional): the built-in palette that unspecified tokens inherit — `"dark"` (default) or `"light"`. Set `"base": "light"` when you are building a **light** theme so the tokens you leave out stay readable on a light background (otherwise they fall back to the dark palette).
- `colors` (optional): the color tokens to override, each a 6-digit hex value (e.g. `#FE8019`).

Use the token names from [Built-in color tokens](#built-in-color-tokens). Any token you omit falls back to the selected base palette, so partial themes are fine:

```json
{
  "name": "just-blue",
  "colors": {
    "primary": "#3B82F6",
    "roleUser": "#3B82F6"
  }
}
```

## Select a theme

Two ways:

1. **The `/theme` command** (recommended): opens the theme picker, where custom themes appear as `Custom: <filename>`. The picker **re-scans the themes directory every time it opens**, so a theme file you just added shows up **without a restart**.
2. **`tui.toml`**: set `theme` to your theme name:

   ```toml
   # ~/.echadron/tui.toml
   theme = "ember"
   ```

## What happens on errors

Custom themes are designed to never get in your way:

- **An invalid color value** (not `#` followed by 6 hex digits): that one entry is silently skipped and falls back to the selected base palette; the rest of the colors still apply.
- **An unrecognized token**: ignored, with no effect on other colors.
- **A missing custom theme file or malformed JSON**: silently falls back to the built-in `dark` palette. It does not retry `auto`.

## Editing the active theme

If you edit the theme file that is **currently active**, the change is not reloaded automatically. To apply the new colors:

- run `/reload-tui` — it reloads `tui.toml` and re-applies the current theme (including re-reading the theme file); or
- switch to another theme in `/theme` and back.

::: warning Note
Re-selecting the **same** theme in `/theme` does not reload it (you get a "Theme unchanged" message). To reload changes to the active theme, use one of the two methods above.
:::
