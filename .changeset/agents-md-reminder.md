---
"echadron": minor
---

Point out `AGENTS.md` files the agent has not read. Instructions load once, only along the project-root to cwd chain, so a tool reaching into a sibling directory works there without ever seeing its rules. When that happens, the tool result now carries a short reminder naming the file — once per file. Off by default; enable under Feature controls or with `ECHADRON_EXPERIMENTAL_AGENTS_MD_REMINDER=1`.
