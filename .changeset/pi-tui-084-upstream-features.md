---
"@moonshot-ai/pi-tui": minor
---

Port the compatible pi-tui improvements through upstream 0.84.1: Unicode LaTeX Markdown rendering with width-aware transforms, terminal-safe image fallbacks and iTerm2 payload metadata, OSC 8-safe truncation, Unicode grapheme width fixes, latency-sensitive input rendering, and the corrected OSC 9;4 progress-clear sequence. The alternate-screen renderer/layout stack remains intentionally deferred because Echadron still uses its existing main-screen renderer.
