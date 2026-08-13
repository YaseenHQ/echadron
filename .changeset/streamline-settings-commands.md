---
"echadron": patch
---

Stop listing configure-once options twice. `/theme`, `/editor`, `/features`, and `/secondary_model` no longer appear in `/` completion or `/help` — they are grouped under `/settings`, which now also offers Secondary model. `/reload-tui` is hidden as a subset of `/reload`. All five still work exactly as before when typed, so existing habits and scripts are unaffected. Session-level toggles you change per task — `/model`, `/effort`, `/permission`, `/plan`, `/swarm`, `/usage` — stay in the list.
