# Custom Themes

Echadron CLI can use a built-in color scheme or a custom JSON theme file. Custom files live in the themes directory and appear in `/theme` alongside the built-in choices.

## Built-in color tokens

Custom themes can override the tokens below. The `dark` and `light` columns show the built-in values; `auto` resolves to one of those palettes at startup, and falls back to `dark` when terminal background detection is unavailable.

| Token | `dark` | `light` | What it controls |
| --- | --- | --- | --- |
| `primary` | `#E4E4E4` | `#202020` | The most-used identity tone. Links, inline code, selected items, focused editor border, Plan/"running" badges, spinners |
| `accent` | `#B8B8B8` | `#4B4B4B` | Secondary identity tone. Approval `▶` prefix, device-code box, image placeholder, BTW / queue panes, registry import |
| `text` | `#E4E4E4` | `#1A1A1A` | Body text. Dialog bodies, todo titles, footer model label, Markdown headings, assistant/tool message bullets, list bullets |
| `textStrong` | `#F4F4F4` | `#0A0A0A` | Emphasized / bold text. Input dialogs, status messages |
| `textDim` | `#A0A0A0` | `#4A4A4A` | Secondary, dimmed text. Thinking, hints, descriptions, completed todos, Markdown quotes, footer status bar |
| `textMuted` | `#858585` | `#5F5F5F` | Faintest text. Counters, scroll info, descriptions, Markdown link URLs, code-block borders |
| `border` | `#646464` | `#737373` | Pane and editor borders, Markdown horizontal rule |
| `borderFocus` | `#D0D0D0` | `#303030` | Focus / attention border, currently only the approval panel |
| `success` | `#3FA266` | `#0E7A38` | Success state. `✓`, "enabled", completed |
| `warning` | `#D6A55D` | `#92660A` | Warning state. auto/yolo badges, stale markers, Plan mode hint |
| `error` | `#D74A6A` | `#B91C1C` | Error state. Error messages, failed tool output |
| `diffAdded` | `#3FA266` | `#0E7A38` | Diff added lines |
| `diffRemoved` | `#D74A6A` | `#B91C1C` | Diff removed lines |
| `diffAddedStrong` | `#70B489` | `#0E7A38` | Diff intra-line changed words, added and bold |
| `diffRemovedStrong` | `#ED7890` | `#B91C1C` | Diff intra-line changed words, removed and bold |
| `diffGutter` | `#858585` | `#737373` | Diff line-number gutter |
| `diffMeta` | `#A0A0A0` | `#5F5F5F` | Diff meta / hunk headers |
| `roleUser` | `#D0D0D0` | `#363636` | User message bullet and text, skill-activation name |
| `shellMode` | `#B0B0B0` | `#565656` | Shell mode (`!`) prompt, editor border, and the echoed `$ command` line |

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
