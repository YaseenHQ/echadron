---
"echadron": patch
---

Pin prompt-cache prefix stability in the test suite. Provider caching only pays off when each request extends the previous one without rewriting earlier history, and nothing checked that before — a regression would only have shown up as a cost and latency drift. Three cases now cover it: the steps of a tool-calling turn, consecutive turns, and a swarm-mode toggle, whose exit reducer pops a reminder back off the history. An opt-in live test additionally proves a real provider cache hit end to end.
