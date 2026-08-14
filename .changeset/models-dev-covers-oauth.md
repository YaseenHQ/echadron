---
"echadron": minor
---

models.dev now updates every provider it knows about, not just those added by API key. Only the API-key catalog import recorded where a provider came from, so a provider created by an OAuth login — xAI, for instance — was skipped by every refresh and its model list stayed frozen at the moment it was added. Provenance is now inferred from the provider id when the catalog knows it, so new models reach you without waiting for an Echadron release. Providers models.dev has never heard of are left alone, and no extra catalog fetch is made.
