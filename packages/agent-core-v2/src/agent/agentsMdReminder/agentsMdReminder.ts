/**
 * `agentsMdReminder` domain (L4) — contract.
 *
 * The instruction hierarchy is loaded once, and only along the project-root to
 * cwd chain. A tool that reaches into a sibling directory therefore works
 * without ever seeing that directory's `AGENTS.md`. This service watches
 * executed tools and, the first time one touches a directory whose agent file
 * was not part of the injected instructions, appends a short reminder to that
 * tool result.
 */

import { createDecorator, type ServiceIdentifier } from '#/_base/di/instantiation';

export interface IAgentAgentsMdReminderService {
  readonly _serviceBrand: undefined;

  /**
   * Record agent files already present in the injected instructions, so they
   * are never suggested. Called after each successful profile bind.
   */
  seedKnown(paths: Iterable<string>): void;
}

export const IAgentAgentsMdReminderService: ServiceIdentifier<IAgentAgentsMdReminderService> =
  createDecorator<IAgentAgentsMdReminderService>('agentAgentsMdReminderService');
