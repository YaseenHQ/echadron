---
'@moonshot-ai/agent-core': patch
'@moonshot-ai/agent-core-v2': patch
'@moonshot-ai/kap-server': patch
'@yaseenhq/echadron': patch
'@moonshot-ai/kimi-code-sdk': patch
---

Keep Models.dev adapter and endpoint provenance on imported providers, share the
persisted catalog between `update --models` and the v2 server, and honor the
Echadron home directory when resolving config and server paths.
