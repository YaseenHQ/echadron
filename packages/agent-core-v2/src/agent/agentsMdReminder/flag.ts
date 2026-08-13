/**
 * `agentsMdReminder` domain (L4) — feature control.
 *
 * Off by default: it adds a filesystem probe per tool call that reaches a new
 * directory, and appends text to tool results. Both are worth opting into
 * rather than imposing.
 */

import { type FlagDefinitionInput, registerFlagDefinition } from '#/app/flag/flagRegistry';

export const AGENTS_MD_REMINDER_FLAG_ID = 'agents-md-reminder';
export const AGENTS_MD_REMINDER_FLAG_ENV = 'ECHADRON_EXPERIMENTAL_AGENTS_MD_REMINDER';

export const agentsMdReminderFlag: FlagDefinitionInput = {
  id: AGENTS_MD_REMINDER_FLAG_ID,
  title: 'AGENTS.md discovery reminder',
  description:
    'When a tool reaches a directory whose AGENTS.md was not part of the loaded instructions, suggest reading it — once per file.',
  env: AGENTS_MD_REMINDER_FLAG_ENV,
  default: false,
  surface: 'core',
};

registerFlagDefinition(agentsMdReminderFlag);
