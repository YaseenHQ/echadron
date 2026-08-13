/**
 * `dateChange` domain (L4) — `IAgentDateChangeService` implementation.
 *
 * Owns the `date_change` context-injection provider. The date is rendered into
 * the system prompt once at profile bind, so a session that runs past midnight
 * keeps a stale date. Re-rendering the prompt would invalidate the entire
 * prompt-cache prefix, so this appends a reminder at the next step boundary
 * instead.
 *
 * The last announced date lives in `agentState`, following `permissionMode`
 * and `swarm`. The first observation seeds that state silently — announcing on
 * the first inject would just repeat what the prompt already says. Bound at
 * Agent scope.
 */

import { Disposable } from '#/_base/di/lifecycle';
import { LifecycleScope, ScopeActivation, registerScopedService } from '#/_base/di/scope';
import { defineState } from '#/_base/state/stateRegistry';
import {
  IAgentContextInjectorService,
  type ContextInjectionContext,
} from '#/agent/contextInjector/contextInjector';
import { IAgentStateService } from '#/agent/state/agentState';

import { IAgentDateChangeService } from './dateChange';

const DATE_CHANGE_INJECTION_VARIANT = 'date_change';

export const dateChangeLastAnnouncedKey = defineState<string | undefined>(
  'dateChange.lastAnnounced',
  () => undefined as string | undefined,
);

/** Local calendar date, which is what the model reasons about. */
export function calendarDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(year)}-${month}-${day}`;
}

export function buildDateChangeReminder(date: string): string {
  return (
    `The date has changed since this conversation started. Today is now ${date}. ` +
    'Use this date for anything time-relative; the date in your system prompt is stale.'
  );
}

export class AgentDateChangeService extends Disposable implements IAgentDateChangeService {
  declare readonly _serviceBrand: undefined;

  constructor(
    @IAgentContextInjectorService dynamicInjector: IAgentContextInjectorService,
    @IAgentStateService private readonly states: IAgentStateService,
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
    this.states.register(dateChangeLastAnnouncedKey);
    this._register(
      dynamicInjector.register(DATE_CHANGE_INJECTION_VARIANT, (ctx) => this.reminder(ctx)),
    );
  }

  private reminder(_ctx: ContextInjectionContext): string | undefined {
    const today = calendarDate(this.now());
    const announced = this.states.get(dateChangeLastAnnouncedKey);
    if (announced === undefined) {
      // First inject of the session: the prompt already carries this date, so
      // record it without telling the model something it just read.
      this.states.set(dateChangeLastAnnouncedKey, today);
      return undefined;
    }
    if (announced === today) return undefined;
    this.states.set(dateChangeLastAnnouncedKey, today);
    return buildDateChangeReminder(today);
  }
}

registerScopedService(
  LifecycleScope.Agent,
  IAgentDateChangeService,
  AgentDateChangeService,
  ScopeActivation.OnScopeCreated,
  'dateChange',
);
