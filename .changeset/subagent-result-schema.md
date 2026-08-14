---
"echadron": minor
---

`Agent` and `AgentSwarm` accept a `result_schema`: a flat JSON Schema the subagent must satisfy by ending its final message with a matching JSON object. The parent then receives parsed objects it can merge — a swarm report of JSON instead of a pile of prose — while a child that fails to comply keeps its prose plus a marker, so nothing is lost.
