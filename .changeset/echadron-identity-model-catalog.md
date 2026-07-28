---
'@yaseenhq/echadron': minor
---

Make the fork-owned CLI launch as Echadron (`echadron`/`chad`/`maker`) with an isolated
`~/.echadron` data namespace, and add `echadron update --models` for a
persistent, validator-aware models.dev catalog refresh. Echadron no longer
invokes the upstream Kimi Code self-update path by default, and its install
hook no longer renames or removes an existing `kimi` executable.
