/**
 * `echadron acp-v2` sub-command.
 *
 * Starts the draft Agent Client Protocol (ACP) v2 server over stdio. It is
 * the explicit protocol-v2 counterpart to `echadron acp`; both entry points
 * reuse Echadron's existing SDK session, provider, and auth stores.
 *
 * Wire-up mirrors `echadron acp` for the host-independent parts:
 *  - `--login` pivots into the shared device-code login flow (the entry point
 *    ACP clients hit via the first-class `AuthMethodTerminal` path, re-invoking
 *    the agent binary with the advertised `args:['--login']`).
 *  - `ECHADRON_HOME` (or a legacy alias) is forwarded into `authMethods[0].env` so the
 *    login subprocess writes its token under the same data root the server
 *    reads from, and `process.argv[1]` is advertised as the legacy
 *    `_meta['terminal-auth'].command` fallback.
 *
 * `@moonshot-ai/acp-server` is loaded via a lazy dynamic import so the default
 * CLI / `echadron acp` module graph stays free of the experimental v2 SDK.
 */

import type { Command } from 'commander';

import { getVersion } from '#/cli/version';
import { ECHADRON_HOME_ENV, KIMI_CODE_HOME_ENV } from '#/constant/app';
import { getDataDir } from '#/utils/paths';

import { runLoginFlow } from './login-flow';

export function registerNativeAcpCommand(parent: Command): void {
  registerNativeCommand(parent, 'acp');
}

/** @deprecated Use `echadron acp`; retained for existing ACP v2 clients. */
export function registerAcpV2Command(parent: Command): void {
  registerNativeCommand(parent, 'acp-v2');
}

function registerNativeCommand(parent: Command, commandName: 'acp' | 'acp-v2'): void {
  parent
    .command(commandName)
    .description('Run Echadron as an Agent Client Protocol (ACP v2) server over stdio.')
    .option(
      '--login',
      'Run the device-code login flow then exit (entry point for ACP terminal-auth).',
      false,
    )
    .action(async (opts: { login?: boolean }) => {
      if (opts.login === true) {
        await runLoginFlow();
        return;
      }
      // Forward the resolved Echadron home (if set) into `authMethods[0].env` so the
      // login subprocess clients spawn for terminal-auth writes its token
      // under the same data root the ACP server reads from.
      const sandboxHome =
        process.env[ECHADRON_HOME_ENV] ??
        process.env['ECHADRON_CODE_HOME'] ??
        process.env[KIMI_CODE_HOME_ENV];
      const terminalAuthEnv =
        sandboxHome !== undefined && sandboxHome.length > 0
          ? {
              [ECHADRON_HOME_ENV]: sandboxHome,
              ECHADRON_CODE_HOME: sandboxHome,
              [KIMI_CODE_HOME_ENV]: sandboxHome,
            }
          : undefined;
      // Legacy `_meta.terminal-auth` fallback for clients that don't yet
      // honor the first-class `type:'terminal'`. `command` is the absolute
      // path to this very binary so the client can spawn it for login.
      const legacyCommand = process.argv[1];
      try {
        const { runAcpV2Server } = await import('@moonshot-ai/acp-server');
        const { createKimiHarnessV2 } = await import('@moonshot-ai/kimi-code-sdk');
        const harness = createKimiHarnessV2({
          homeDir: getDataDir(),
          identity: { productName: 'Echadron', version: getVersion(), platform: 'cli' },
          uiMode: 'acp',
        });
        await runAcpV2Server(harness, {
          agentInfo: { name: 'Echadron', version: getVersion() },
          ...(terminalAuthEnv ? { terminalAuthEnv } : {}),
          ...(legacyCommand !== undefined && legacyCommand.length > 0
            ? { terminalAuthCommand: legacyCommand }
            : {}),
        });
        process.exit(0);
      } catch (error) {
        process.stderr.write(`${commandName} server: fatal error: ${String(error)}\n`);
        process.exit(1);
      }
    });
}
