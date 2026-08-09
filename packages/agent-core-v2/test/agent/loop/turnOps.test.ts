import { describe, expect, it } from 'vitest';

import { MODEL_CROSS_REDUCERS } from '#/wire/model';
import { TurnModel, cancelTurn, endTurn, promptTurn } from '#/agent/loop/turnOps';

function foldLoopEvent(state: import('#/agent/loop/turnOps').TurnModelState, turnId: string) {
  const entries = MODEL_CROSS_REDUCERS.get('context.append_loop_event') ?? [];
  const entry = entries.find((candidate) => candidate.model === TurnModel);
  if (entry === undefined) throw new Error('turn model cross-reducer not registered');
  return entry.reducer(state, { event: { type: 'step.begin', turnId } }) as typeof state;
}

describe('TurnModel lastEnded', () => {
  it('keeps the latest outcome until a newer turn produces events', () => {
    let state = TurnModel.initial();
    state = promptTurn.apply(state, { input: [], origin: { kind: 'user' } });
    state = endTurn.apply(state, { turnId: 0, reason: 'failed' });
    state = promptTurn.apply(state, { input: [], origin: { kind: 'user' } });
    expect(state.lastEnded?.reason).toBe('failed');
    state = cancelTurn.apply(state, { turnId: 1, target: 'queued' });
    expect(state.lastEnded?.reason).toBe('failed');
    state = endTurn.apply(state, { turnId: 1, reason: 'completed' });
    expect(state.lastEnded?.reason).toBe('completed');
  });

  it('clears the old outcome when a newer turn starts producing', () => {
    let state = TurnModel.initial();
    state = promptTurn.apply(state, { input: [], origin: { kind: 'user' } });
    state = endTurn.apply(state, { turnId: 0, reason: 'failed' });
    state = promptTurn.apply(state, { input: [], origin: { kind: 'user' } });
    expect(foldLoopEvent(state, '1').lastEnded).toBeUndefined();
  });
});
