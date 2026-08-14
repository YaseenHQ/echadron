---
"echadron": patch
---

Installing Echadron no longer asks you to approve one of its scripts. The package shipped a `postinstall` hook that did nothing — a leftover stub from when the fork renamed an existing executable — but package managers still held it behind an approval prompt on every install. It is gone, along with the migration helpers it no longer used. If the optional native terminal module is left unbuilt, opening an interactive terminal now explains how to enable it instead of failing with a module resolution error.
