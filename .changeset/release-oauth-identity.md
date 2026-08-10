---
'@yaseenhq/echadron': patch
'@moonshot-ai/kimi-code-oauth': patch
'@moonshot-ai/kimi-code-sdk': patch
'@moonshot-ai/agent-core-v2': patch
---

Keep the managed Kimi subscription labeled as Kimi Code inside the Echadron host, identify ChatGPT Codex requests as Echadron, make device OAuth network waits and polling sleeps cancel immediately, expose model capabilities when agents choose between primary and secondary subagent models, and add v2 config deprecation guidance without breaking existing Echadron config files.
