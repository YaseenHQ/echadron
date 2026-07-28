import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'pathe';

export function resolveKimiHome(homeDir?: string | undefined): string {
  // Echadron runs beside upstream Kimi Code and therefore has its own home
  // namespace. Keep the historical variables as compatibility fallbacks for
  // hosts that still use the upstream names.
  return (
    homeDir ??
    process.env['ECHADRON_HOME'] ??
    process.env['ECHADRON_CODE_HOME'] ??
    process.env['IMPERIUM_HOME'] ??
    process.env['KIMI_CODE_HOME'] ??
    join(homedir(), '.echadron')
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
