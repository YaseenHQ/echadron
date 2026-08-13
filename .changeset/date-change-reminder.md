---
"echadron": minor
---

Tell the agent when the date changes. The date is rendered into the system prompt once when a session starts, so a session left open past midnight kept reasoning against a stale date. A reminder now announces the new date at the next step instead of re-rendering the prompt, which would throw away the whole prompt cache.
