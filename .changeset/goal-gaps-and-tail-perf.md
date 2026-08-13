---
"echadron": patch
---

Report every gap an independent completion review finds. A verdict listing more than eight gaps was previously treated as malformed, which replaced the concrete findings with a generic "could not produce a valid verdict" message; the list is now truncated instead. Long Bash output in tail mode is also cheaper to collect — the buffer is compacted on a slack threshold rather than on every chunk, which was quadratic on exactly the chatty commands tail mode exists for.
