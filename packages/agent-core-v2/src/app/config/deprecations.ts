/** Declarative config-key deprecation detection for on-disk TOML. */

import type { ConfigDiagnostic, ConfigSection } from './config';
import { isPlainObject } from './configPure';
import { camelToSnake } from './toml';

export function collectKeyDeprecations(
  rawSnake: Record<string, unknown>,
  sections: readonly ConfigSection[],
): ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];
  for (const section of sections) {
    if (section.deprecations === undefined) continue;
    const snakeDomain = camelToSnake(section.domain);
    const rawSection = rawSnake[snakeDomain];
    if (!isPlainObject(rawSection)) continue;
    for (const deprecation of section.deprecations) {
      if (rawSection[deprecation.key] === undefined) continue;
      diagnostics.push({
        domain: section.domain,
        severity: 'warning',
        message:
          `[${snakeDomain}] '${deprecation.key}' is deprecated; ` +
          `use '${deprecation.replacement}'.` +
          (deprecation.message === undefined ? '' : ` ${deprecation.message}`),
      });
    }
  }
  return diagnostics;
}
