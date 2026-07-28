/**
 * Server telemetry bootstrap for the v2 engine.
 *
 * Web sessions run inside kap-server rather than the CLI process. Without an
 * appender, the v2 telemetry service records events but routes them to its
 * null appender. This opt-in host integration attaches the durable,
 * privacy-filtering cloud appender before any session can be created.
 */

import {
  type CloudAppender,
  createCloudAppender,
  IBootstrapService,
  IConfigService,
  type IDisposable,
  IOAuthToolkit,
  ITelemetryService,
  type Scope,
} from '@moonshot-ai/agent-core-v2';
import {
  createKimiDeviceId,
  KIMI_CODE_PROVIDER_NAME,
  ECHADRON_DISABLE_TELEMETRY_ENV,
  LEGACY_TELEMETRY_DISABLE_ENV,
} from '@moonshot-ai/kimi-code-oauth';

const SERVER_TELEMETRY_APP_NAME = 'echadron-cli';
const SERVER_TELEMETRY_UI_MODE = 'web';
const DISABLE_VALUES = new Set(['1', 'true', 't', 'yes', 'y']);
const TELEMETRY_SHUTDOWN_TIMEOUT_MS = 3_000;

export interface ServerTelemetry {
  readonly appender?: CloudAppender;
  readonly registration?: IDisposable;
}

function isTelemetryDisabledByEnv(core: Scope): boolean {
  const bootstrap = core.accessor.get(IBootstrapService);
  return [ECHADRON_DISABLE_TELEMETRY_ENV, LEGACY_TELEMETRY_DISABLE_ENV].some((name) => {
    const value = bootstrap.getEnv(name);
    return value !== undefined && DISABLE_VALUES.has(value.trim().toLowerCase());
  });
}

export async function initializeServerTelemetry(
  core: Scope,
  homeDir: string,
): Promise<ServerTelemetry> {
  const config = core.accessor.get(IConfigService);
  await config.ready;
  if (config.get('telemetry') === false || isTelemetryDisabledByEnv(core)) return {};

  const auth = core.accessor.get(IOAuthToolkit);
  const appender = createCloudAppender(core.accessor, {
    deviceId: createKimiDeviceId(homeDir),
    appName: SERVER_TELEMETRY_APP_NAME,
    uiMode: SERVER_TELEMETRY_UI_MODE,
    model: config.get<string>('defaultModel') ?? undefined,
    getAccessToken: async () =>
      (await auth.getCachedAccessToken(KIMI_CODE_PROVIDER_NAME)) ?? null,
  });
  const registration = core.accessor.get(ITelemetryService).addAppender(appender);
  try {
    appender.startPeriodicFlush();
  } catch (error) {
    registration.dispose();
    throw error;
  }
  return { appender, registration };
}

export async function shutdownServerTelemetry(
  telemetry: ServerTelemetry,
  deadlineMs = Date.now() + TELEMETRY_SHUTDOWN_TIMEOUT_MS,
): Promise<void> {
  telemetry.registration?.dispose();
  if (telemetry.appender === undefined) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      telemetry.appender.shutdown(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, Math.max(0, deadlineMs - Date.now()));
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
