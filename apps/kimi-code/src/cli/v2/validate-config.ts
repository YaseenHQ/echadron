/**
 * V2 config.toml validation for `echadron doctor`.
 *
 * This is loaded lazily by the default agent-core-v2 doctor path. It validates
 * against the engine's own section registry rather than the legacy whole-file
 * schema, while preserving the doctor's existing warning/error formatting.
 */

import { parse as parseToml } from 'smol-toml';
import { z } from 'zod';

import {
  ConfigRegistry,
} from '@moonshot-ai/agent-core-v2';
import {
  camelToSnake,
  describeTomlSyntaxError,
  transformTomlData,
} from '@moonshot-ai/agent-core-v2/app/config/toml';

const SCHEMALESS_DOMAINS: ReadonlySet<string> = new Set([
  'defaultModel',
  'defaultProvider',
  'modelOverrides',
  'telemetry',
]);

interface V2ConfigValidationIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

class V2ConfigValidationError extends Error {
  readonly details: { readonly validationIssues: readonly V2ConfigValidationIssue[] };

  constructor(issues: readonly V2ConfigValidationIssue[]) {
    super('v2 config validation failed');
    this.details = { validationIssues: issues };
  }
}

export function validateConfigTomlV2(
  text: string,
  filePath: string,
  getEnv: (name: string) => string | undefined = (name) => process.env[name],
): string | undefined {
  let data: Record<string, unknown> = {};
  if (text.trim().length > 0) {
    try {
      data = parseToml(text) as Record<string, unknown>;
    } catch (error) {
      throw new Error(`Invalid TOML in ${filePath}: ${describeTomlSyntaxError(error)}`, {
        cause: error,
      });
    }
  }

  const registry = new ConfigRegistry();
  const transformed = transformTomlData(data, registry);
  const issues: V2ConfigValidationIssue[] = [];
  const unknownKeys: string[] = [];
  for (const [domain, value] of Object.entries(transformed)) {
    if (registry.getSection(domain) === undefined) {
      if (!SCHEMALESS_DOMAINS.has(domain)) unknownKeys.push(camelToSnake(domain));
      continue;
    }
    try {
      registry.validate(domain, value);
    } catch (error) {
      if (!(error instanceof z.ZodError)) throw error;
      for (const issue of error.issues) {
        issues.push({
          path: [
            domain,
            ...issue.path.map((segment) =>
              typeof segment === 'number' ? segment : String(segment),
            ),
          ],
          message: issue.message,
        });
      }
    }
  }
  if (issues.length > 0) throw new V2ConfigValidationError(issues);

  const warnings: string[] = [];
  // The fork's current v2 registry intentionally does not expose the newer
  // deprecation metadata (`deprecations` / `deprecatedEnv`) yet. Keep doctor
  // compatible with the registry we actually run instead of importing a
  // newer upstream-only module and silently diverging from runtime behavior.
  void getEnv;
  if (unknownKeys.length > 0) {
    warnings.push(
      `Unknown top-level ${unknownKeys.length === 1 ? 'key' : 'keys'} ignored by the v2 engine: ${unknownKeys.join(', ')}.`,
    );
  }
  return warnings.length > 0 ? warnings.join('\n') : undefined;
}
