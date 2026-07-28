/**
 * Env-driven knobs for the snapshot read path. Read once at route registration.
 *
 * Mirrors v1 (`packages/server/src/services/snapshot/snapshotConfig.ts`):
 *
 *   ECHADRON_SNAPSHOT_READER       'auto' (default) | 'legacy'
 *   ECHADRON_SNAPSHOT_TIMEOUT_MS   integer ms hard ceiling on the auto path (default 4000)
 *   ECHADRON_SNAPSHOT_CACHE_LIMIT  transcript LRU entries (default 32)
 * The KIMI-prefixed spellings remain accepted for existing installations.
 */

export type SnapshotReaderMode = 'auto' | 'legacy';

export interface SnapshotConfig {
  readonly mode: SnapshotReaderMode;
  readonly timeoutMs: number;
  readonly cacheLimit: number;
}

const DEFAULT_TIMEOUT_MS = 4000;
const DEFAULT_CACHE_LIMIT = 32;

function parseInteger(value: string | undefined, fallback: number, min: number): number {
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

export function loadSnapshotConfig(env: NodeJS.ProcessEnv = process.env): SnapshotConfig {
  const rawMode = (env['ECHADRON_SNAPSHOT_READER'] ?? env['KIMI_SNAPSHOT_READER'])?.trim().toLowerCase();
  const mode: SnapshotReaderMode = rawMode === 'legacy' ? 'legacy' : 'auto';
  return {
    mode,
    timeoutMs: parseInteger(
      env['ECHADRON_SNAPSHOT_TIMEOUT_MS'] ?? env['KIMI_SNAPSHOT_TIMEOUT_MS'],
      DEFAULT_TIMEOUT_MS,
      100,
    ),
    cacheLimit: parseInteger(
      env['ECHADRON_SNAPSHOT_CACHE_LIMIT'] ?? env['KIMI_SNAPSHOT_CACHE_LIMIT'],
      DEFAULT_CACHE_LIMIT,
      1,
    ),
  };
}
