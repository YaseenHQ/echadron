import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'pathe';

export function resolveKimiHome(homeDir?: string | undefined): string {
  // Echadron runs beside upstream Kimi Code and therefore has its own home
  // namespace. Keep KIMI_CODE_HOME as the compatibility fallback for hosts
  // that still use the upstream variable.
  return (
    homeDir ??
    process.env['IMPERIUM_HOME'] ??
    process.env['KIMI_CODE_HOME'] ??
    join(homedir(), '.kimi-code')
  );
}

export function resolveConfigPath(input: {
  readonly homeDir?: string | undefined;
  readonly configPath?: string | undefined;
}): string {
  return input.configPath ?? join(resolveKimiHome(input.homeDir), 'config.toml');
}

export function ensureKimiHome(homeDir: string): void {
  mkdirSync(homeDir, { recursive: true, mode: 0o700 });
}
