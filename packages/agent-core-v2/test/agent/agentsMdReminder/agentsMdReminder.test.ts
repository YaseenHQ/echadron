import { describe, expect, it, vi } from 'vitest';

import {
  AgentAgentsMdReminderService,
  buildAgentsMdReminder,
} from '#/agent/agentsMdReminder/agentsMdReminderService';
import { AGENTS_MD_REMINDER_FLAG_ID } from '#/agent/agentsMdReminder/flag';
import { touchedPathForTool } from '#/agent/agentsMdReminder/touchedPaths';

const ROOT = '/repo';

function harness(files: Record<string, string>, enabled = true) {
  let hook: ((ctx: any, next: () => Promise<void>) => Promise<void>) | undefined;
  const toolExecutor = {
    hooks: {
      onDidExecuteTool: {
        register: (_name: string, fn: typeof hook) => {
          hook = fn;
          return { dispose: () => {} };
        },
      },
    },
  } as never;
  const fs = {
    readText: vi.fn(async (path: string) => {
      const value = files[path];
      if (value === undefined) throw new Error('ENOENT');
      return value;
    }),
  } as never;
  const service = new AgentAgentsMdReminderService(
    toolExecutor,
    fs,
    { workDir: ROOT } as never,
    { enabled: () => enabled } as never,
  );
  const run = async (toolName: string, args: unknown, output = 'ok', isError = false) => {
    const ctx = {
      toolCall: { name: toolName },
      args,
      result: { isError, output },
    };
    await hook?.(ctx, async () => {});
    return ctx.result.output as string;
  };
  return { service, run, fs };
}

describe('AGENTS.md discovery reminder', () => {
  it('suggests an agent file the loaded instructions never covered', async () => {
    const { run } = harness({ '/repo/pkg/AGENTS.md': '# rules' });
    const output = await run('Read', { path: '/repo/pkg/thing.ts' });
    expect(output).toContain(buildAgentsMdReminder(['/repo/pkg/AGENTS.md']));
  });

  it('never suggests a file that was already injected', async () => {
    const { run, service } = harness({ '/repo/pkg/AGENTS.md': '# rules' });
    service.seedKnown(['/repo/pkg/AGENTS.md']);
    expect(await run('Read', { path: '/repo/pkg/thing.ts' })).toBe('ok');
  });

  it('suggests each file at most once', async () => {
    const { run } = harness({ '/repo/pkg/AGENTS.md': '# rules' });
    expect(await run('Read', { path: '/repo/pkg/a.ts' })).toContain('AGENTS.md');
    expect(await run('Read', { path: '/repo/pkg/b.ts' })).toBe('ok');
  });

  it('ignores a blank agent file but does not re-read it', async () => {
    const { run, fs } = harness({ '/repo/pkg/AGENTS.md': '   \n' });
    expect(await run('Read', { path: '/repo/pkg/a.ts' })).toBe('ok');
    const callsAfterFirst = (fs as unknown as { readText: { mock: { calls: unknown[] } } }).readText
      .mock.calls.length;
    await run('Read', { path: '/repo/pkg/b.ts' });
    expect(
      (fs as unknown as { readText: { mock: { calls: unknown[] } } }).readText.mock.calls.length,
    ).toBe(callsAfterFirst);
  });

  it('stays silent when the control is off', async () => {
    const { run } = harness({ '/repo/pkg/AGENTS.md': '# rules' }, false);
    expect(await run('Read', { path: '/repo/pkg/thing.ts' })).toBe('ok');
  });

  it('leaves a failed tool result alone', async () => {
    // A vetoed duplicate carries a placeholder result that is swapped for the
    // original's later, so attaching here would discard the reminder while the
    // file was already counted as suggested.
    const { run } = harness({ '/repo/pkg/AGENTS.md': '# rules' });
    expect(await run('Read', { path: '/repo/pkg/a.ts' }, 'boom', true)).toBe('boom');
    // Still eligible afterwards, since it was never claimed.
    expect(await run('Read', { path: '/repo/pkg/a.ts' })).toContain('AGENTS.md');
  });

  it('reads the touched path out of each tool shape', () => {
    expect(touchedPathForTool('Read', { path: 'a/b.ts' })).toBe('a/b.ts');
    expect(touchedPathForTool('Edit', { file_path: 'a/b.ts' })).toBe('a/b.ts');
    expect(touchedPathForTool('Grep', { path: 'src' })).toBe('src');
    expect(touchedPathForTool('Grep', { pattern: 'x' })).toBeUndefined();
    expect(touchedPathForTool('WebSearch', { query: 'x' })).toBeUndefined();
  });
});
