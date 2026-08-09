---
'@yaseenhq/echadron': patch
---

Add an explicit experimental `echadron acp-v2` entry point for the draft ACP protocol v2. The stable `echadron acp` command remains unchanged; the v2 bridge adds batch-capable transport, message IDs, unified tool-call updates, structured plan/state updates, and terminal OAuth metadata.
