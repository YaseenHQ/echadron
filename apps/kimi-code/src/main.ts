/**
 * Echadron entry point.
 *
 * Parses CLI arguments via Commander.js, validates options, runs the
 * outer update preflight, then delegates to the requested UI runner.
 */

import {
  flushDiagnosticLogs,
  installGlobalProxyDispatcher,
  log,
  resolveGlobalLogPath,
} from '@moonshot-ai/kimi-code-sdk';
import { applyEchadronEnvironmentAliases } from '@moonshot-ai/kimi-code-oauth';
import {
  installCrashHandlers,
  track,
} from '@moonshot-ai/kimi-telemetry';

import { createProgram } from './cli/commands';
import { finalizeHeadlessRun } from './cli/headless-exit';
import type { CLIOptions } from './cli/options';
import { OptionConflictError, validateOptions } from './cli/options';
import { runPrompt } from './cli/run-prompt';
import { runShell } from './cli/run-shell';
import { formatStartupError } from './cli/startup-error';
import { runPluginNodeEntry } from './cli/sub/plugin-run-node';
import { runUpdatePreflight } from './cli/update/preflight';
import { getVersion } from './cli/version';
import { refreshModelsDevCatalog } from './cli/models/catalog-cache';
import {
  ECHADRON_SELF_UPDATE_ENABLED,
  PROCESS_NAME,
} from './constant/app';
import { cleanupStaleNativeCacheForCurrent } from './native/native-assets';
import { installNativeModuleHook } from './native/module-hook';
import { runNativeAssetSmokeIfRequested } from './native/smoke';
import { getDataDir } from './utils/paths';

/**
 * Outcome of a CLI command run, reported back to the process entrypoint.
 *
 * `handleMainCommand` is a reusable, unit-tested handler — it must not terminate
 * the process itself. It reports here whether a headless (`echadron -p`) run
 * completed so the entrypoint (the only place that owns the process) can arm the
 * force-exit fallback.
 */
export interface MainCommandOutcome {
  readonly headlessCompleted: boolean;
}

export async function handleMainCommand(
  opts: CLIOptions,
  version: string,
): Promise<MainCommandOutcome> {
  let validated: ReturnType<typeof validateOptions>;
  try {
    validated = validateOptions(opts);
  } catch (error) {
    if (error instanceof OptionConflictError) {
      process.stderr.write(`error: ${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }

  if (ECHADRON_SELF_UPDATE_ENABLED) {
    const preflightResult = await runUpdatePreflight(
      version,
      validated.uiMode === 'print' ? { track, isTTY: false } : { track },
    );
    if (preflightResult === 'exit') {
      process.exit(0);
    }
  }

  if (validated.uiMode === 'print') {
    await runPrompt(validated.options, version);
    return { headlessCompleted: true };
  }

  await runShell(validated.options, version);
  return { headlessCompleted: false };
}

/** `echadron migrate`: launch the migration screen only, then exit. */
async function handleMigrateCommand(version: string): Promise<void> {
  await runShell(MIGRATE_CLI_OPTIONS, version, { migrateOnly: true });
}

export async function handleUpgradeCommand(version: string): Promise<void> {
  void version;
  process.stdout.write(
    'Echadron self-update is not configured yet. Install updates with the Echadron package manager or release channel.\n',
  );
}

/** Refresh Echadron's persisted models.dev metadata without touching auth/config. */
export async function handleModelsUpdateCommand(version = getVersion()): Promise<void> {
  try {
    const result = await refreshModelsDevCatalog({
      force: true,
      userAgent: `echadron-cli/${version}`,
    });
    const providerCount = Object.keys(result.cache.catalog).length;
    const modelCount = Object.values(result.cache.catalog).reduce((total, provider) => {
      const models = provider.models;
      return total + (models === undefined ? 0 : Object.keys(models).length);
    }, 0);
    process.stdout.write(
      `Echadron model catalog ${result.status} (${String(providerCount)} providers, ` +
        `${String(modelCount)} models).\n`,
    );
  } catch (error) {
    process.exitCode = 1;
    process.stderr.write(
      `Failed to refresh Echadron model catalog: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}

/** A neutral CLIOptions value — `kimi migrate` never opens a chat session. */
const MIGRATE_CLI_OPTIONS: CLIOptions = {
  session: undefined,
  continue: false,
  yolo: false,
  auto: false,
  plan: false,
  model: undefined,
  thinking: undefined,
  outputFormat: undefined,
  prompt: undefined,
  skillsDirs: [],
  agent: undefined,
  agentFiles: [],
};

export function main(): void {
  applyEchadronEnvironmentAliases();
  process.title = PROCESS_NAME;
  installCrashHandlers();
  // Route all outbound fetch through HTTP_PROXY/HTTPS_PROXY (honoring NO_PROXY)
  // before any client is constructed. No-op when no proxy variable is set; an
  // invalid proxy URL is reported and ignored rather than aborting startup.
  installGlobalProxyDispatcher();
  installNativeModuleHook();
  if (runNativeAssetSmokeIfRequested()) return;

  // Start the background cleanup of stale native cache. Fire-and-forget; must not block startup or throw.
  queueMicrotask(() => {
    try {
      cleanupStaleNativeCacheForCurrent();
    } catch {
      // ignore: cache GC must never affect process startup
    }
  });

  const version = getVersion();

  const program = createProgram(
    version,
    (opts) => {
      void handleMainCommand(opts, version)
        .then(async (outcome) => {
          // Only the process entrypoint disposes of the process. Print mode
          // relies on the event loop draining to exit; flush any buffered output
          // and then arm an unref'd fallback so a stray ref'd handle left over
          // from the run can't wedge a completed `echadron -p` until an external
          // timeout. A healthy run drains and exits before the fallback fires.
          if (outcome.headlessCompleted) {
            await finalizeHeadlessRun(
              process,
              [process.stdout, process.stderr],
              () => Number(process.exitCode) || 0,
            );
          }
        })
        .catch(async (error: unknown) => {
          // Set the failure exit code synchronously, before any `await`. The
          // terminal `process.exit(1)` below is our intended exit, but it sits
          // behind `await logStartupFailure(...)`; by the time we reach that
          // await, the failed run's `finally` cleanup has already torn down its
          // ref'd handles (sockets, timers, background tasks). If the event loop
          // drains during the await, Node exits on its own with the DEFAULT code
          // 0 and `process.exit(1)` never runs — headless (`echadron -p`) failures
          // would then exit 0 nondeterministically. Setting `process.exitCode`
          // up front makes that drain-exit report failure too.
          process.exitCode = 1;
          const operation = opts.prompt !== undefined ? 'run prompt' : 'start shell';
          await logStartupFailure(operation, error);
          process.stderr.write(
            formatStartupError(error, {
              operation,
            }),
          );
          process.stderr.write(`See log: ${resolveGlobalLogPath(getDataDir())}\n`);
          process.exit(1);
        });
    },
    () => {
      void handleMigrateCommand(version).catch(async (error: unknown) => {
        await logStartupFailure('run migration', error);
        process.stderr.write(formatStartupError(error, { operation: 'run migration' }));
        process.stderr.write(`See log: ${resolveGlobalLogPath(getDataDir())}\n`);
        process.exit(1);
      });
    },
    (entry, args) => {
      void runPluginNodeEntry(entry, args).catch(async (error: unknown) => {
        await logStartupFailure('run plugin node entry', error);
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      });
    },
    () => {
      void handleUpgradeCommand(version).catch(async (error: unknown) => {
        await logStartupFailure('upgrade', error);
        process.stderr.write(formatStartupError(error, { operation: 'upgrade' }));
        process.stderr.write(`See log: ${resolveGlobalLogPath(getDataDir())}\n`);
        process.exit(1);
      });
    },
    () => {
      void handleModelsUpdateCommand(version);
    },
  );

  program.parse(process.argv);
}

main();

async function logStartupFailure(operation: string, error: unknown): Promise<void> {
  log.error('startup failed', { operation, error });
  try {
    await flushDiagnosticLogs();
  } catch {
    // Best-effort diagnostic flush only.
  }
}
