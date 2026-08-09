/**
 * Experimental ACP protocol-v2 server.
 *
 * ACP v2 is deliberately isolated from the stable ACP adapter. The adapter
 * below reuses the well-tested Echadron SDK session/event mapping, while this
 * package owns the v2 transport, message IDs, upsert semantics, and state
 * updates. This keeps the current `echadron acp` command wire-compatible and
 * makes `echadron acp-v2` an explicit opt-in surface while the ACP v2 RFD is
 * still unstable.
 */

import { Readable, Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';

import {
  agent,
  methods,
  ndJsonStream,
  PROTOCOL_VERSION,
  type AgentConnection,
  type AgentContext,
  type AuthMethod,
  type InitializeResponse,
  type SessionConfigOption,
  type SessionInfo,
  type SessionUpdate,
  type Stream,
} from '@agentclientprotocol/sdk/experimental/v2';
import {
  AcpSession,
  ACP_BUILTIN_SLASH_COMMANDS,
  buildSessionConfigOptions,
} from '@moonshot-ai/acp-adapter';
import {
  type KimiHarness,
  type Session,
  type SessionStatus,
  type SessionSummary,
} from '@moonshot-ai/kimi-code-sdk';

export interface AcpV2ServerOptions {
  readonly agentInfo?: { readonly name: string; readonly version: string };
  readonly terminalAuthEnv?: Readonly<Record<string, string>>;
  readonly terminalAuthCommand?: string;
  readonly input?: NodeJS.ReadableStream;
  readonly output?: NodeJS.WritableStream;
}

export interface RunningAcpV2Server {
  readonly connection: AgentConnection;
  close(): Promise<void>;
}

type V2Client = AgentContext;

interface V2Session {
  readonly session: Session;
  adapter: AcpSession;
  client: V2Client;
  readonly cwd: string;
  readonly additionalDirectories: readonly string[];
  readonly messageIds: {
    agent?: string;
    thought?: string;
  };
  unsubscribe(): void;
}

const DEFAULT_AGENT_INFO = { name: 'Echadron', version: '0.0.0' } as const;

function authMethod(options: AcpV2ServerOptions): AuthMethod {
  const env = Object.entries(options.terminalAuthEnv ?? {}).map(([name, value]) => ({
    name,
    value,
  }));
  const method: AuthMethod = {
    type: 'terminal',
    methodId: 'echadron-oauth',
    name: 'Login with Echadron (OAuth)',
    description: 'Open Echadron’s OAuth login flow in a terminal.',
    args: ['--login'],
    ...(env.length > 0 ? { env } : {}),
  };
  if (options.terminalAuthCommand !== undefined && options.terminalAuthCommand.length > 0) {
    method._meta = {
      'terminal-auth': {
        type: 'terminal',
        command: options.terminalAuthCommand,
        args: ['login'],
        label: 'Login with Echadron (OAuth)',
      },
    };
  }
  return method;
}

function toAbsolutePath(value: string): string {
  if (value.startsWith('/')) return value;
  throw new Error(`ACP v2 requires an absolute path: ${value}`);
}

function statusMode(status: SessionStatus): 'default' | 'plan' | 'auto' | 'yolo' {
  if (status.planMode) return 'plan';
  if (status.permission === 'auto') return 'auto';
  if (status.permission === 'yolo') return 'yolo';
  return 'default';
}

function sessionInfo(summary: SessionSummary): SessionInfo {
  return {
    sessionId: summary.id,
    cwd: toAbsolutePath(summary.workDir),
    ...(summary.additionalDirs !== undefined && summary.additionalDirs.length > 0
      ? { additionalDirectories: summary.additionalDirs.map(toAbsolutePath) }
      : {}),
    ...(summary.title !== undefined ? { title: summary.title } : {}),
    updatedAt: new Date(summary.updatedAt).toISOString(),
  };
}

function v2Content(block: unknown): unknown {
  // ACP v1 and v2 share the content-block shape for text, images and diffs.
  // Keep unknown blocks intact so future v2 content can pass through without
  // making the legacy event adapter depend on the draft schema.
  return block;
}

function displayString(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return `${value}`;
  }
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.stringify(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function legacyUpdateToV2(
  update: { readonly sessionUpdate?: string; readonly [key: string]: unknown },
  state: V2Session,
): SessionUpdate | undefined {
  const value = update as Record<string, unknown>;
  const kind = value['sessionUpdate'];
  if (kind === 'agent_message_chunk') {
    state.messageIds.agent ??= `${state.session.id}:agent:${randomUUID()}`;
    return {
      sessionUpdate: 'agent_message_chunk',
      messageId: state.messageIds.agent,
      content: v2Content(value['content']) as never,
    };
  }
  if (kind === 'thinking_chunk' || kind === 'agent_thought_chunk') {
    state.messageIds.thought ??= `${state.session.id}:thought:${randomUUID()}`;
    return {
      sessionUpdate: 'agent_thought_chunk',
      messageId: state.messageIds.thought,
      content: v2Content(value['content']) as never,
    };
  }
  if (kind === 'tool_call' || kind === 'tool_call_update') {
    const { sessionUpdate: _ignored, ...rest } = value;
    return {
      sessionUpdate: 'tool_call_update',
      ...rest,
      toolCallId: displayString(value['toolCallId'], `${state.session.id}:tool`),
      ...(value['content'] !== undefined
        ? { content: (value['content'] as unknown[]).map(v2Content) as never }
        : {}),
    } as SessionUpdate;
  }
  if (kind === 'plan_update' || kind === 'plan') {
    const plan =
      kind === 'plan_update'
        ? (value['plan'] as Record<string, unknown> | undefined)
        : {
            type: 'items',
            planId: `${state.session.id}:plan`,
            entries: value['entries'] ?? [],
          };
    if (plan === undefined) return undefined;
    return {
      sessionUpdate: 'plan_update',
      plan: plan as never,
    } as SessionUpdate;
  }
  if (kind === 'available_commands_update') {
    return {
      sessionUpdate: 'available_commands_update',
      availableCommands: (value['availableCommands'] ?? value['commands'] ?? []) as never,
    } as SessionUpdate;
  }
  if (kind === 'config_option_update') {
    return {
      sessionUpdate: 'config_option_update',
      configOptions: (value['configOptions'] ?? []) as never,
    } as SessionUpdate;
  }
  if (kind === 'usage_update') {
    return { sessionUpdate: 'usage_update', ...value } as SessionUpdate;
  }
  return undefined;
}

function v2PermissionRequest(
  request: { sessionId: string; options: readonly unknown[]; toolCall: unknown },
): Record<string, unknown> {
  const toolCall = request.toolCall as Record<string, unknown>;
  return {
    sessionId: request.sessionId,
    title: displayString(toolCall['title'], 'Permission required'),
    description:
      typeof toolCall['rawInput'] === 'string' ? toolCall['rawInput'] : undefined,
    subject: { type: 'tool_call', toolCall },
    options: request.options,
  };
}

function v1PermissionResponse(response: Record<string, unknown>): unknown {
  const outcome = response['outcome'] as Record<string, unknown> | undefined;
  if (outcome?.['outcome'] === 'selected' && typeof outcome['optionId'] === 'string') {
    return { outcome: { outcome: 'selected', optionId: outcome['optionId'] } };
  }
  return { outcome: { outcome: 'cancelled' } };
}

function createLegacyConnection(state: V2Session): unknown {
  return {
    sessionUpdate: async (notification: { update: { readonly sessionUpdate?: string; readonly [key: string]: unknown } }) => {
      const update = legacyUpdateToV2(notification.update, state);
      if (update !== undefined) {
        await state.client.notify(methods.client.session.update, {
          sessionId: state.session.id,
          update,
        });
      }
    },
    requestPermission: async (request: { sessionId: string; options: readonly unknown[]; toolCall: unknown }) => {
      const response = await state.client.request(
        methods.client.session.requestPermission,
        v2PermissionRequest(request) as never,
      );
      return v1PermissionResponse(response as Record<string, unknown>);
    },
  };
}

async function sessionOptions(
  harness: KimiHarness,
  state: V2Session,
): Promise<SessionConfigOption[]> {
  const status = await state.session.getStatus();
  return (await buildSessionConfigOptions(
    harness,
    status.model ?? '',
    status.thinkingEffort,
    statusMode(status),
  )) as unknown as SessionConfigOption[];
}

async function createSessionState(
  harness: KimiHarness,
  client: V2Client,
  request: { cwd: string; additionalDirectories?: readonly string[] },
  existingSession?: Session,
): Promise<V2Session> {
  const session =
    existingSession ??
    (await harness.createSession({
      workDir: toAbsolutePath(request.cwd),
      additionalDirs: request.additionalDirectories?.map(toAbsolutePath),
    }));
  const status = await session.getStatus();
  const state = {
    session,
    adapter: undefined as unknown as AcpSession,
    client,
    cwd: request.cwd,
    additionalDirectories: request.additionalDirectories ?? [],
    messageIds: {},
    unsubscribe: () => {},
  } as V2Session;
  state.adapter = new AcpSession(
    createLegacyConnection(state) as never,
    session,
    undefined,
    (event, properties) =>
      { harness.track(event, properties as Parameters<KimiHarness['track']>[1]); },
    status.model ?? '',
    harness,
    status.thinkingEffort,
  );
  const unsubscribe = session.onEvent((event: { type: string; reason?: string }) => {
    if (event.type === 'turn.started') {
      state.messageIds.agent = undefined;
      state.messageIds.thought = undefined;
      void state.client.notify(methods.client.session.update, {
        sessionId: session.id,
        update: { sessionUpdate: 'state_update', state: 'running' },
      });
    } else if (event.type === 'turn.ended') {
      void state.client.notify(methods.client.session.update, {
        sessionId: session.id,
        update: {
          sessionUpdate: 'state_update',
          state: 'idle',
          stopReason:
            event.reason === 'cancelled'
              ? 'cancelled'
              : event.reason === 'blocked'
                ? 'refusal'
                : 'end_turn',
        },
      });
    }
  });
  state.unsubscribe = unsubscribe;
  return state;
}

export function createAcpV2Agent(
  harness: KimiHarness,
  options: AcpV2ServerOptions = {},
): ReturnType<typeof agent> {
  const sessions = new Map<string, V2Session>();
  const app = agent();
  const info = options.agentInfo ?? DEFAULT_AGENT_INFO;

  app.onRequest(methods.agent.initialize, (): InitializeResponse => ({
    protocolVersion: PROTOCOL_VERSION,
    info,
    capabilities: { session: { delete: {}, fork: {} } },
    authMethods: [authMethod(options)],
    _meta: { 'echadron:acp': { protocol: 'v2', experimental: true } },
  }));

  app.onRequest(methods.agent.auth.login, async () => ({}));
  app.onRequest(methods.agent.auth.logout, async () => {
    await harness.auth.logout(undefined, { deprovisionConfig: false });
    return {};
  });

  app.onRequest(methods.agent.session.new, async ({ params, client }) => {
    const request = params;
    const state = await createSessionState(harness, client, request);
    sessions.set(state.session.id, state);
    await client.notify(methods.client.session.update, {
      sessionId: state.session.id,
      update: {
        sessionUpdate: 'available_commands_update',
        availableCommands: ACP_BUILTIN_SLASH_COMMANDS.map((command) => ({
          name: command.name,
          description: command.description,
          ...('input' in command ? { input: command.input } : {}),
        })),
      },
    });
    return {
      sessionId: state.session.id,
      configOptions: await sessionOptions(harness, state),
    };
  });

  app.onRequest(methods.agent.session.list, async ({ params }) => {
    const request = params as { cwd?: string | null };
    const summaries = await harness.listSessions(
      request.cwd === undefined || request.cwd === null ? {} : { workDir: request.cwd },
    );
    return { sessions: summaries.map(sessionInfo) };
  });

  app.onRequest(methods.agent.session.resume, async ({ params, client }) => {
    const request = params as { sessionId: string; cwd: string; additionalDirectories?: string[]; replayFrom?: { type: string } | null };
    let state = sessions.get(request.sessionId);
    if (state !== undefined) state.client = client;
    if (state === undefined) {
      const session = await harness.resumeSession({
        id: request.sessionId,
        additionalDirs: request.additionalDirectories?.map(toAbsolutePath),
      });
      state = await createSessionState(harness, client, {
        cwd: session.workDir,
        additionalDirectories: request.additionalDirectories,
      }, session);
      sessions.set(request.sessionId, state);
    }
    if (request.replayFrom?.type === 'start') await state.adapter.replayHistory();
    return { configOptions: await sessionOptions(harness, state) };
  });

  app.onRequest(methods.agent.session.prompt, async ({ params }) => {
    const request = params;
    const state = sessions.get(request.sessionId);
    if (state === undefined) throw new Error(`Session not found: ${request.sessionId}`);
    await state.adapter.prompt(request.prompt as never);
    return {};
  });

  app.onNotification(methods.agent.session.cancel, async ({ params }) => {
    const state = sessions.get(params.sessionId);
    await state?.adapter.cancel();
  });

  app.onRequest(methods.agent.session.close, async ({ params }) => {
    const state = sessions.get(params.sessionId);
    if (state !== undefined) {
      await state.adapter.cancel();
      state.unsubscribe();
      await harness.closeSession(params.sessionId);
      sessions.delete(params.sessionId);
    }
    return {};
  });

  app.onRequest(methods.agent.session.delete, async ({ params }) => {
    const state = sessions.get(params.sessionId);
    state?.unsubscribe();
    await harness.deleteSession(params.sessionId);
    sessions.delete(params.sessionId);
    return {};
  });

  app.onRequest(methods.agent.session.fork, async ({ params, client }) => {
    const request = params as { sessionId: string; cwd: string };
    const fork = await harness.forkSession({ id: request.sessionId });
    const state = await createSessionState(harness, client, { cwd: fork.workDir }, fork);
    sessions.set(state.session.id, state);
    return { sessionId: state.session.id, configOptions: await sessionOptions(harness, state) };
  });

  app.onRequest(methods.agent.session.setConfigOption, async ({ params }) => {
    const request = params as { sessionId: string; configId: string; value: unknown; type: string };
    const state = sessions.get(request.sessionId);
    if (state === undefined) throw new Error(`Session not found: ${request.sessionId}`);
    if (request.configId === 'model' && typeof request.value === 'string') {
      await state.adapter.setModel(request.value);
    } else if (request.configId === 'thinking' && typeof request.value === 'string') {
      await state.adapter.setThinking(request.value);
    } else if (request.configId === 'mode' && typeof request.value === 'string') {
      await state.adapter.setMode(request.value as never);
    } else {
      throw new Error(`Unsupported session config option: ${request.configId}`);
    }
    return { configOptions: await sessionOptions(harness, state) };
  });

  return app;
}

export async function runAcpV2Server(
  harness: KimiHarness,
  options: AcpV2ServerOptions = {},
): Promise<void> {
  const running = startAcpV2Server(harness, options);
  try {
    await running.connection.closed;
  } finally {
    await running.close();
  }
}

export function startAcpV2Server(
  harness: KimiHarness,
  options: AcpV2ServerOptions = {},
): RunningAcpV2Server {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const stream: Stream = ndJsonStream(
    Writable.toWeb(output as Writable) as WritableStream<Uint8Array>,
    Readable.toWeb(input as Readable) as ReadableStream<Uint8Array>,
  );
  const connection = createAcpV2Agent(harness, options).connect(stream);
  return {
    connection,
    async close() {
      connection.close();
      await harness.close();
    },
  };
}
