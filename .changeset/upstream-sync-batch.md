---
"echadron": minor
---

Sync four upstream correctness improvements.

Ctrl+C is responsive while a request is retrying: provider SDK clients are built with `maxRetries: 0`, because their internal backoff sleep never observed the turn's abort signal, so cancelling during a 429 or 5xx only took effect after the sleep elapsed — and those hidden attempts double-counted the engine's own retry budget.

A session interrupted while the model was still streaming its reasoning no longer bricks: the assistant message left holding only a reasoning fragment is now sent with an explicit empty `content`, so strict Chat Completions gateways stop rejecting every later request in that session.

Steering an idle session launches a turn instead of failing, and updates the session title and last prompt the way an ordinary prompt does.

The built-in `coder` profile no longer carries `Agent` and `AgentSwarm`. `coder` is the profile subagents are spawned as, so a subagent could spawn its own subagents and make fan-out recursive. The main agent profile keeps both, and a custom profile that lists them still opts in.

Retry status lines are also capped, so a provider that answers with a large error body (occasionally a whole HTML page) can no longer flood the activity line.
