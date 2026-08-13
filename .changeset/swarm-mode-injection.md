---
"echadron": patch
---

Announce swarm mode through the context-injection layer instead of pushing and popping reminders directly. Entering or leaving swarm mode no longer mutates conversation history as a side effect, and a swarm-mode reminder lost to compaction is re-announced while the mode is still active.
