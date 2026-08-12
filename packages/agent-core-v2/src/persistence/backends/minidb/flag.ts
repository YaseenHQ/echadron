/**
 * `minidb` persistence backend — flag contribution.
 *
 * Gates the minidb-backed derived read-model (`IQueryStore`) and the consumers
 * that read through it. Released on by default, with the flag retained as a
 * rollback control for the authoritative read path.
 */

import { type FlagDefinitionInput, registerFlagDefinition } from '#/app/flag/flagRegistry';

export const persistenceMiniDbReadModelFlag: FlagDefinitionInput = {
  id: 'persistence_minidb_readmodel',
  title: 'minidb read model',
  description:
    'Use the minidb-backed IQueryStore as a derived read model for session indexing and wire replay.',
  env: 'ECHADRON_EXPERIMENTAL_PERSISTENCE_MINIDB_READMODEL',
  default: true,
  surface: 'core',
};

registerFlagDefinition(persistenceMiniDbReadModelFlag);
