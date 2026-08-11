---
'echadron': patch
---

Harden browser OAuth callbacks with a deadline, provider-error propagation, and a fallback loopback port. Broaden transient 5xx retries and recognize provider "message exceeds budget" failures as context overflow so Echadron can compact and recover.
