/**
 * `toolSelect` domain (L4) — registers the `tool-select` feature control into
 * `flag`.
 *
 * Gates progressive tool disclosure: MCP tool schemas stay out of the
 * immutable top-level tools[] and are loaded on demand through the
 * `select_tools` tool. Released on by default, with the flag retained as a
 * rollback control for compatible models.
 * Imported for its side effect (registers the definition) from the package
 * barrel.
 */

import { type FlagDefinitionInput, registerFlagDefinition } from '#/app/flag/flagRegistry';

export const TOOL_SELECT_FLAG_ID = 'tool-select';
export const TOOL_SELECT_FLAG_ENV = 'ECHADRON_EXPERIMENTAL_TOOL_SELECT';

export const toolSelectFlag: FlagDefinitionInput = {
  id: TOOL_SELECT_FLAG_ID,
  title: 'Tool select (progressive tool disclosure)',
  description:
    'Keep MCP tool schemas out of the immutable top-level tools[]; the model loads them on demand via the select_tools tool. Only takes effect on models whose capability catalog declares dynamically loaded tools.',
  env: TOOL_SELECT_FLAG_ENV,
  default: true,
  surface: 'core',
};

registerFlagDefinition(toolSelectFlag);
