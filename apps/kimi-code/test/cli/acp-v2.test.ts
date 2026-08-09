import { Command } from 'commander';
import { describe, expect, it } from 'vitest';

import { registerAcpV2Command } from '#/cli/sub/acp-v2';

describe('echadron acp-v2', () => {
  it('registers an explicit experimental ACP v2 command', () => {
    const program = new Command('echadron');
    registerAcpV2Command(program);

    const command = program.commands.find((entry) => entry.name() === 'acp-v2');
    expect(command).toBeDefined();
    expect(command?.description()).toContain('Agent Client Protocol');
  });
});
