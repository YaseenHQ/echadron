/**
 * Host environment aliases used during the Kimi Code -> Echadron migration.
 *
 * Echadron is the public product name, but the core and provider layers still
 * read a number of Kimi-prefixed variables for wire/config compatibility. We
 * normalize both directions at process boundaries so new Echadron installs can
 * use the new names while existing scripts continue to work. Echadron wins
 * when both spellings are present.
 */

export const ECHADRON_ENV_PREFIX = 'ECHADRON_';
export const KIMI_ENV_PREFIX = 'KIMI_';
export const IMPERIUM_ENV_PREFIX = 'IMPERIUM_';

export const ECHADRON_HOME_ENV = 'ECHADRON_HOME';
export const LEGACY_IMPERIUM_HOME_ENV = 'IMPERIUM_HOME';
export const LEGACY_KIMI_CODE_HOME_ENV = 'KIMI_CODE_HOME';
export const ECHADRON_DISABLE_TELEMETRY_ENV = 'ECHADRON_DISABLE_TELEMETRY';
export const LEGACY_TELEMETRY_DISABLE_ENV = 'KIMI_DISABLE_TELEMETRY';

/**
 * Make the public Echadron environment spelling visible to legacy consumers
 * and make legacy values visible to newer host code. This only fills missing
 * aliases; an explicit Echadron value always takes precedence.
 */
export function applyEchadronEnvironmentAliases(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const entries = Object.entries(env);
  for (const [name, value] of entries) {
    if (value === undefined) continue;
    if (name.startsWith(ECHADRON_ENV_PREFIX)) {
      const suffix = name.slice(ECHADRON_ENV_PREFIX.length);
      fillIfMissing(env, `${KIMI_ENV_PREFIX}${suffix}`, value);
      fillIfMissing(env, `${IMPERIUM_ENV_PREFIX}${suffix}`, value);
    } else if (name.startsWith(KIMI_ENV_PREFIX)) {
      const suffix = name.slice(KIMI_ENV_PREFIX.length);
      fillIfMissing(env, `${ECHADRON_ENV_PREFIX}${suffix}`, value);
    } else if (name.startsWith(IMPERIUM_ENV_PREFIX)) {
      const suffix = name.slice(IMPERIUM_ENV_PREFIX.length);
      fillIfMissing(env, `${ECHADRON_ENV_PREFIX}${suffix}`, value);
    }
  }

  // The core feature registry historically used the longer KIMI_CODE_ prefix
  // while the Echadron host uses ECHADRON_. Keep these exact feature switches
  // synchronized as well; the generic prefix bridge above intentionally does
  // not rewrite ECHADRON_* to KIMI_CODE_* because most legacy variables use
  // KIMI_* directly.
  for (const [echadronName, kimiName] of [
    ['ECHADRON_EXPERIMENTAL_FLAG', 'KIMI_CODE_EXPERIMENTAL_FLAG'],
    ['ECHADRON_EXPERIMENTAL_SECONDARY_MODEL', 'KIMI_CODE_EXPERIMENTAL_SECONDARY_MODEL'],
  ] as const) {
    const value = env[echadronName] ?? env[kimiName];
    if (value !== undefined) {
      fillIfMissing(env, echadronName, value);
      fillIfMissing(env, kimiName, value);
    }
  }

  // HOME was historically exposed as KIMI_CODE_HOME and then IMPERIUM_HOME;
  // Echadron uses the shorter product-owned name. Keep all three synchronized
  // at process boundaries so SDK/core path resolution remains coherent.
  const home =
    env[ECHADRON_HOME_ENV] ??
    env['ECHADRON_CODE_HOME'] ??
    env[LEGACY_IMPERIUM_HOME_ENV] ??
    env[LEGACY_KIMI_CODE_HOME_ENV];
  if (home !== undefined && home !== '') {
    fillIfMissing(env, ECHADRON_HOME_ENV, home);
    fillIfMissing(env, 'ECHADRON_CODE_HOME', home);
    fillIfMissing(env, LEGACY_IMPERIUM_HOME_ENV, home);
    fillIfMissing(env, LEGACY_KIMI_CODE_HOME_ENV, home);
  }
  return env;
}

function fillIfMissing(env: NodeJS.ProcessEnv, name: string, value: string): void {
  if (env[name] === undefined) env[name] = value;
}
