#!/usr/bin/env node
/**
 * Restore the executable bit on the pty `spawn-helper` prebuilt binaries.
 *
 * Why: on macOS/Linux the pty launches the shell through a tiny `spawn-helper`
 * executable shipped under `prebuilds/<platform-arch>/`. pnpm's content-
 * addressable store does not preserve the +x mode on these non-bin prebuild
 * assets, so after `pnpm install` the helper lands as 0644 and any PTY spawn
 * fails with "posix_spawnp failed". npm/yarn (and the published tarball) keep
 * the bit, so this is a pnpm-dev-only fixup.
 *
 * `@lydell/node-pty` splits the binaries into per-platform packages
 * (`@lydell/node-pty-darwin-arm64/prebuilds/darwin-arm64/spawn-helper`), so
 * sweep the whole scope rather than one package directory — an install may
 * carry more than one platform.
 *
 * Idempotent and never fails the install: any error is logged and ignored.
 */
import { chmodSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

function lydellScopeDir() {
  const require = createRequire(import.meta.url);
  // Resolve from the workspace root so we find the hoisted copy regardless of
  // where this script runs.
  const entry = require.resolve('@lydell/node-pty', { paths: [process.cwd()] });
  // .../@lydell/node-pty/index.js -> .../@lydell
  return dirname(dirname(entry));
}

function* spawnHelpers(scopeDir) {
  for (const pkg of readdirSync(scopeDir)) {
    const prebuilds = join(scopeDir, pkg, 'prebuilds');
    if (!existsSync(prebuilds)) continue;
    for (const target of readdirSync(prebuilds)) {
      const helper = join(prebuilds, target, 'spawn-helper');
      if (existsSync(helper)) yield helper;
    }
  }
}

try {
  let fixed = 0;
  for (const helper of spawnHelpers(lydellScopeDir())) {
    if ((statSync(helper).mode & 0o111) === 0o111) continue; // already executable
    chmodSync(helper, 0o755);
    fixed++;
  }
  if (fixed > 0) console.log(`[fix-node-pty-perms] made ${fixed} spawn-helper binary(ies) executable`);
} catch (err) {
  console.warn('[fix-node-pty-perms] skipped:', err instanceof Error ? err.message : String(err));
}
process.exit(0);
