#!/usr/bin/env node
/**
 * Echadron postinstall hook.
 *
 * Echadron is intentionally installed beside upstream Kimi Code.  The old
 * fork-era hook tried to find, rename, or delete a `kimi` executable; that is
 * unsafe for a separate product and made global installs interfere with one
 * another. The package manager installs the `echadron`, `chad`, and `maker`
 * shims directly from package.json.
 * There is nothing else to do here.
 *
 * Keep this lifecycle hook as a harmless compatibility stub for package
 * managers that have cached the previous package metadata.  It must remain
 * side-effect free and must never fail an install.
 */

process.exitCode = 0;
