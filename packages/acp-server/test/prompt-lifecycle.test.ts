import { client, methods } from '@agentclientprotocol/sdk-v2/experimental/v2';
import { describe, expect, it, vi } from 'vitest';

import { createAcpV2Agent } from '../src/index';

describe('ACP v2 prompt lifecycle', () => {
  it('acknowledges prompts before foreground work completes and emits v2 state updates', async () => {
    const listeners = new Set<(event: { type: string; reason?: string }) => void>();
    let promptStarted = false;
    let resolvePrompt: (() => void) | undefined;
    const session = {
      id: 'session-1',
      workDir: '/tmp/echadron-acp-v2',
      summary: {
        id: 'session-1',
        workDir: '/tmp/echadron-acp-v2',
        sessionDir: '/tmp/echadron-acp-v2/session-1',
        additionalDirs: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      getStatus: vi.fn(async () => ({
        model: '',
        thinkingEffort: 'off',
        permission: 'manual',
        planMode: false,
        contextTokens: 0,
        maxContextTokens: 1000,
        contextUsage: 0,
      })),
      getResumeState: vi.fn(() => ({
        agents: {
          main: {
            context: {
              history: [
                {
                  role: 'user',
                  content: [{ type: 'text', text: 'previous question' }],
                  toolCalls: [],
                },
                {
                  role: 'assistant',
                  content: [
                    { type: 'text', text: 'previous answer' },
                    { type: 'think', think: 'previous thought' },
                  ],
                  toolCalls: [],
                },
              ],
            },
          },
        },
      })),
      setApprovalHandler: vi.fn(),
      onEvent: vi.fn((listener: (event: { type: string; reason?: string }) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      prompt: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            promptStarted = true;
            resolvePrompt = resolve;
          }),
      ),
      cancel: vi.fn(async () => undefined),
      setAdditionalDirs: vi.fn(async (additionalDirs: readonly string[]) => {
        return { additionalDirs };
      }),
      addAdditionalDir: vi.fn(async () => ({ additionalDirs: [], projectRoot: '', configPath: '', persisted: false })),
    };
    const harness = {
      createSession: vi.fn(async () => session),
      getConfig: vi.fn(async () => ({ models: {} })),
      track: vi.fn(),
    };
    const updates: Array<{ update: { sessionUpdate: string; messageId?: string; state?: string } }> = [];
    const host = client().onNotification(methods.client.session.update, ({ params }) => {
      updates.push(params as (typeof updates)[number]);
    });
    const agent = createAcpV2Agent(harness as never);

    await host.connectWith(agent, async (connection) => {
      await connection.request(methods.agent.initialize, {
        protocolVersion: 2,
        info: { name: 'test-client', version: '0.0.0' },
      });
      const created = await connection.request(methods.agent.session.new, {
        cwd: '/tmp/echadron-acp-v2',
        additionalDirectories: ['/tmp/shared'],
        mcpServers: [
          {
            type: 'stdio',
            name: 'echo',
            command: '/usr/bin/true',
            args: [],
            env: [],
          },
        ],
      });
      expect(created.configOptions?.every((option) => typeof option.configId === 'string')).toBe(true);
      expect(harness.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpServers: {
            echo: {
              transport: 'stdio',
              command: '/usr/bin/true',
              args: [],
              env: {},
            },
          },
        }),
      );
      await connection.request(methods.agent.session.resume, {
        sessionId: created.sessionId,
        cwd: '/tmp/echadron-acp-v2',
        additionalDirectories: [],
        replayFrom: { type: 'start' },
      });
      const promptResponse = connection.request(methods.agent.session.prompt, {
        sessionId: created.sessionId,
        prompt: [{ type: 'text', text: 'hello' }],
      });

      await vi.waitFor(() => {
        expect(promptStarted).toBe(true);
      });
      await expect(promptResponse).resolves.toEqual({});

      for (const listener of listeners) listener({ type: 'turn.started', turnId: 1 } as never);
      for (const listener of listeners) {
        listener({ type: 'assistant.delta', turnId: 1, delta: 'done' } as never);
      }
      resolvePrompt?.();
      for (const listener of listeners) {
        listener({ type: 'turn.ended', reason: 'completed' });
      }
      await vi.waitFor(() => {
        expect(updates.some(({ update }) => update.state === 'idle')).toBe(true);
      });
    });

    expect(updates.some(({ update }) => update.sessionUpdate === 'user_message')).toBe(true);
    expect(updates.some(({ update }) => update.sessionUpdate === 'agent_message')).toBe(true);
    expect(
      updates.some(({ update }) => update.messageId === 'session-1:replay:agent:1'),
    ).toBe(true);
    expect(updates.some(({ update }) => update.state === 'running')).toBe(true);
    expect(updates.some(({ update }) => update.state === 'idle')).toBe(true);
    expect(
      updates
        .filter(({ update }) => update.sessionUpdate === 'user_message')
        .every(({ update }) => typeof update.messageId === 'string'),
    ).toBe(true);
    expect(session.setAdditionalDirs).toHaveBeenLastCalledWith([]);
  });
});
