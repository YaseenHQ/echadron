---
"echadron": minor
---

Route subagents at any configured model, not just two roles. `Agent` and `AgentSwarm` now accept a `[models]` entry id for `model` in addition to `"primary"` and `"secondary"`, so a task that needs vision, a long context, or a cheaper model can be sent to the model that fits it. The tool description lists what the session has configured, each with its resolved capability flags. Role names still win over an identically-named entry, and agent files can set a concrete `model` that takes precedence over `model_preference`.
