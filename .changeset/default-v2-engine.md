---
'@yaseenhq/echadron': minor
'@moonshot-ai/kimi-code-sdk': minor
'@moonshot-ai/agent-core': patch
'@moonshot-ai/kimi-code-oauth': patch
---

Run Echadron's interactive TUI, print mode, doctor, ACP, export, and provider commands on the native agent-core-v2 engine by default. Set `ECHADRON_LEGACY_FLAG=1` (or `KIMI_CODE_LEGACY_FLAG=1`) to use the v1 compatibility path. Remove the dead v1 micro-compaction implementation while preserving historical replay records.
