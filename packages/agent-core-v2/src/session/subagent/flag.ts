/**
 * `subagent` domain (L6) — registers the `secondary-model` feature control
 * into `flag`.
 *
 * Gates secondary-model selection for newly spawned subagents, including the
 * agent-facing model choices and startup validation warning. Released on by
 * default, with the flag retained as a rollback control.
 * Imported for its side effect from the package barrel.
 */

import { type FlagDefinitionInput, registerFlagDefinition } from '#/app/flag/flagRegistry';

export const SECONDARY_MODEL_FLAG_ID = 'secondary-model';
export const SECONDARY_MODEL_FLAG_ENV = 'ECHADRON_EXPERIMENTAL_SECONDARY_MODEL';

export const secondaryModelFlag: FlagDefinitionInput = {
  id: SECONDARY_MODEL_FLAG_ID,
  title: 'Secondary model for subagents',
  description:
    'Let newly spawned subagents use a separately configured secondary model by default, with an explicit primary-model override for quality-sensitive tasks.',
  env: SECONDARY_MODEL_FLAG_ENV,
  default: true,
  surface: 'core',
};

registerFlagDefinition(secondaryModelFlag);
