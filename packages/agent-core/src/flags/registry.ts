import type { FlagDefinitionInput } from './types';

/**
 * Feature controls backed by the legacy `[experimental]` config namespace.
 *
 * To add one, append an entry and gate runtime behavior through the scoped
 * resolver available on `KimiCore`, `Session`, or `Agent`:
 *   { id: 'my_feature', title: 'My feature', description: '...', env: 'ECHADRON_EXPERIMENTAL_MY_FEATURE', default: false, surface: 'both' }
 *
 * Keep the `as const satisfies` — it derives the literal `FlagId` union that gives `enabled()`
 * autocomplete and typo-checking. Canonical `env` names start with
 * `ECHADRON_EXPERIMENTAL_`; the resolver also accepts historical
 * `KIMI_CODE_EXPERIMENTAL_` aliases. `id` must not be `flag`.
 */
export const FLAG_DEFINITIONS = [
  {
    id: 'tool-select',
    title: 'Tool select (progressive tool disclosure)',
    description:
      'Keep MCP tool schemas out of the immutable top-level tools[]; the model loads them on demand via the select_tools tool. Only takes effect on models whose capability catalog declares dynamically loaded tools.',
    env: 'ECHADRON_EXPERIMENTAL_TOOL_SELECT',
    default: true,
    surface: 'core',
  },
  {
    id: 'secondary-model',
    title: 'Secondary model for subagents',
    description:
      'Let newly spawned subagents use a separately configured secondary model by default, with an explicit primary-model override for quality-sensitive tasks.',
    env: 'ECHADRON_EXPERIMENTAL_SECONDARY_MODEL',
    default: true,
    surface: 'core',
  },
] as const satisfies readonly FlagDefinitionInput[];

/** Literal union of registered flag ids. */
export type FlagId = (typeof FLAG_DEFINITIONS)[number]['id'];
