import { createServer, get, type Server } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import { runOAuthCallbackServer, type CallbackServerHandle } from '../src/callback-server';

const openHandles: CallbackServerHandle[] = [];

afterEach(() => {
  for (const handle of openHandles.splice(0)) handle.close();
});

async function unusedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Missing test port.');
  await close(server);
  return address.port;
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

function request(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    get(url, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode ?? 0));
    }).once('error', reject);
  });
}

async function start(options: { timeoutMs?: number } = {}): Promise<CallbackServerHandle> {
  const port = await unusedPort();
  const handle = await runOAuthCallbackServer({
    host: '127.0.0.1',
    port,
    path: '/auth/callback',
    expectedState: 'expected-state',
    successMessage: 'Connected.',
    providerLabel: 'Test provider',
    ...options,
  });
  openHandles.push(handle);
  return handle;
}

describe('OAuth callback server', () => {
  it('propagates a provider error carrying the expected state', async () => {
    const handle = await start();
    const result = handle.waitForCode();
    const rejected = expect(result).rejects.toThrow(
      'Test provider authentication failed: User cancelled',
    );

    expect(
      await request(
        `${handle.redirectUri}?error=access_denied&error_description=User%20cancelled&state=expected-state`,
      ),
    ).toBe(400);
    await rejected;
  });

  it('ignores a forged error and keeps waiting for the valid callback', async () => {
    const handle = await start();
    const result = handle.waitForCode();

    expect(await request(`${handle.redirectUri}?error=access_denied&state=wrong-state`)).toBe(400);
    expect(await request(`${handle.redirectUri}?code=valid-code&state=expected-state`)).toBe(200);
    await expect(result).resolves.toEqual({ code: 'valid-code', state: 'expected-state' });
  });

  it('rejects when no valid callback arrives before the deadline', async () => {
    const handle = await start({ timeoutMs: 5 });
    await expect(handle.waitForCode()).rejects.toThrow(
      'Timed out waiting for Test provider authentication.',
    );
  });
});
