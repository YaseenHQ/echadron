---
"@moonshot-ai/kimi-code-sdk": patch
---

Stop listing internal agent profiles as delegatable subagents. Session summaries returned by `resumeSession`, `forkSession`, and `reloadSession` now filter profiles marked internal, so the built-in completion verifier no longer appears alongside `coder`, `explore`, and `plan`.
