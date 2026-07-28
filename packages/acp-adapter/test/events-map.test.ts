import { describe, expect, it } from 'vitest';

import { agentStatusToUsageUpdate } from '../src/events-map';

describe('agentStatusToUsageUpdate', () => {
  it('maps the live context window and keeps model details in metadata', () => {
    const update = agentStatusToUsageUpdate('session-1', {
      type: 'agent.status.updated',
      model: 'qwen3.5-plus',
      thinkingEffort: 'high',
      contextTokens: 1234.9,
      maxContextTokens: 983616,
      contextUsage: 0.0012,
    });

    expect(update).toEqual({
      sessionId: 'session-1',
      update: {
        sessionUpdate: 'usage_update',
        used: 1234,
        size: 983616,
        _meta: {
          model: 'qwen3.5-plus',
          thinkingEffort: 'high',
          contextUsage: 0.0012,
        },
      },
    });
  });

  it('ignores status events without a usable context window', () => {
    expect(
      agentStatusToUsageUpdate('session-1', {
        type: 'agent.status.updated',
        contextTokens: 12,
      }),
    ).toBeNull();
  });
});
