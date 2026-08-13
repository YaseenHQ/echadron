import { describe, expect, it } from 'vitest';

import { AgentStateService } from '#/agent/state/agentStateService';
import {
  AgentDateChangeService,
  buildDateChangeReminder,
  calendarDate,
  dateChangeLastAnnouncedKey,
} from '#/agent/dateChange/dateChangeService';
import type { ContextInjectionProvider } from '#/agent/contextInjector/contextInjector';

function harness(clock: { value: Date }) {
  let provider: ContextInjectionProvider | undefined;
  const injector = {
    _serviceBrand: undefined,
    register: (_name: string, p: ContextInjectionProvider) => {
      provider = p;
      return { dispose: () => {} };
    },
    injectAfterCompaction: async () => {},
  };
  const states = new AgentStateService();
  const service = new AgentDateChangeService(injector, states, () => clock.value);
  const inject = async (): Promise<string | undefined> =>
    (await provider?.({ injectedPositions: [], lastInjectedAt: null, isNewTurn: true })) as
      | string
      | undefined;
  return { service, states, inject };
}

describe('date change reminder', () => {
  it('says nothing on the first inject, since the prompt carries that date', async () => {
    const clock = { value: new Date(2026, 7, 13, 9, 0, 0) };
    const { inject, states } = harness(clock);
    expect(await inject()).toBeUndefined();
    expect(states.get(dateChangeLastAnnouncedKey)).toBe('2026-08-13');
  });

  it('announces once the calendar date rolls over', async () => {
    const clock = { value: new Date(2026, 7, 13, 23, 59, 0) };
    const { inject } = harness(clock);
    await inject();

    clock.value = new Date(2026, 7, 14, 0, 1, 0);
    expect(await inject()).toBe(buildDateChangeReminder('2026-08-14'));
  });

  it('announces a date change only once', async () => {
    const clock = { value: new Date(2026, 7, 13, 23, 59, 0) };
    const { inject } = harness(clock);
    await inject();

    clock.value = new Date(2026, 7, 14, 0, 1, 0);
    expect(await inject()).toContain('2026-08-14');
    expect(await inject()).toBeUndefined();
  });

  it('stays quiet across a long day without a rollover', async () => {
    const clock = { value: new Date(2026, 7, 13, 1, 0, 0) };
    const { inject } = harness(clock);
    await inject();
    for (const hour of [6, 12, 18, 23]) {
      clock.value = new Date(2026, 7, 13, hour, 30, 0);
      expect(await inject(), `hour ${String(hour)}`).toBeUndefined();
    }
  });

  it('uses the local calendar date rather than UTC', () => {
    // 23:30 local on the 13th is already the 14th in UTC for positive offsets;
    // the model reasons in local time, which is what the prompt renders.
    expect(calendarDate(new Date(2026, 7, 13, 23, 30, 0))).toBe('2026-08-13');
    expect(calendarDate(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
  });
});
