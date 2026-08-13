---
"echadron": minor
---

Re-baseline the vendored pi-tui on 0.84.1 and add an experimental fullscreen mode. Set `ECHADRON_TUI_FULL_SCREEN=1` to run on the alternate screen, where the transcript scrolls inside its own view and the activity, todo, queue, btw and editor chrome stays docked at the bottom instead of flowing away through the terminal's scrollback. Regular mode is unchanged and remains the default. The upgrade also brings fullscreen transcript search, a large reduction in per-frame allocation on the alternate screen, SSH-aware escape timing, and Windows input fixes.
