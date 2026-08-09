/**
 * Agent-engine routing for Echadron's CLI surfaces.
 *
 * Agent-core-v2 is the supported/default engine. Set the legacy switch only
 * when an integration still needs the v1 SDK surface. The experimental
 * switch remains reserved for experimental feature flags; it must not decide
 * which engine the CLI uses.
 */

/** Canonical opt-out switch for the legacy v1 engine. */
export const ECHADRON_LEGACY_ENV = 'ECHADRON_LEGACY_FLAG';
/** @deprecated Use ECHADRON_LEGACY_ENV. */
export const KIMI_LEGACY_ENV = 'KIMI_CODE_LEGACY_FLAG';

/**
 * @deprecated The experimental flag no longer selects the engine. It remains
 * exported for source compatibility with older integrations.
 */
export const ECHADRON_V2_ENV = 'ECHADRON_EXPERIMENTAL_FLAG';
/** @deprecated The experimental flag no longer selects the engine. */
export const KIMI_V2_ENV = 'KIMI_CODE_EXPERIMENTAL_FLAG';

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

function isTruthyEnv(
  key: string,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  return TRUTHY_VALUES.has((env[key] ?? '').trim().toLowerCase());
}

export function isLegacyEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return isTruthyEnv(ECHADRON_LEGACY_ENV, env) || isTruthyEnv(KIMI_LEGACY_ENV, env);
}

/** True unless the caller explicitly opts into the legacy v1 engine. */
export function isKimiV2Enabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return !isLegacyEnabled(env);
}
