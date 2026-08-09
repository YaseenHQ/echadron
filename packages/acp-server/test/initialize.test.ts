import { client, methods } from '@agentclientprotocol/sdk-v2/experimental/v2';
import { describe, expect, it } from 'vitest';

import { createAcpV2Agent } from '../src/index';

describe('ACP v2 server', () => {
  it('negotiates the draft v2 protocol and advertises Echadron auth', async () => {
    const harness = {} as Parameters<typeof createAcpV2Agent>[0];
    const agent = createAcpV2Agent(harness);
    const host = client();

    const response = await host.connectWith(agent, (connection) =>
      connection.request(methods.agent.initialize, {
        protocolVersion: 2,
        info: { name: 'test-client', version: '0.0.0' },
      }),
    );

    expect(response.protocolVersion).toBe(2);
    expect(response.info.name).toBe('Echadron');
    expect(response.capabilities?.session).toEqual({
      delete: {},
      additionalDirectories: {},
    });
    expect(response.authMethods?.[0]).toMatchObject({
      type: 'terminal',
      name: 'Login with Echadron (OAuth)',
    });
  });
});
