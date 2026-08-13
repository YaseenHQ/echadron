---
"echadron": patch
---

Report context windows at the size the provider states. Token counts were formatted in 1024-based units, so a 1M-token window displayed as "977k", 500k as "488k", and 200k as "195k" — every configured window under-reported by 2.4%. Tokens are not bytes, and context sizes are configured and advertised in decimal, so they are now formatted that way.
