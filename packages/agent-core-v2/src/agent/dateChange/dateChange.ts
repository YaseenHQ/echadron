/**
 * `dateChange` domain (L4) — `IAgentDateChangeService` contract.
 *
 * Agent-scope marker service. The system prompt renders the current date once,
 * when the profile binds, so a session left open past midnight keeps telling
 * the model a date that has passed. This service announces the change through a
 * `date_change` context-injection reminder instead of re-rendering the prompt,
 * which would invalidate the whole prompt-cache prefix.
 */

import { createDecorator, type ServiceIdentifier } from '#/_base/di/instantiation';

export interface IAgentDateChangeService {
  readonly _serviceBrand: undefined;
}

export const IAgentDateChangeService: ServiceIdentifier<IAgentDateChangeService> =
  createDecorator<IAgentDateChangeService>('agentDateChangeService');
