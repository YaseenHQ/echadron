/**
 * `goalCompletionGate` domain (L6) — session workspace command gates.
 *
 * Reads `[goal_completion_gates]`, runs each command through the session
 * process runner in the live workspace cwd, and fail-closes on a non-zero
 * exit, timeout, or spawn error. Bound at Session scope.
 */

import { LifecycleScope, ScopeActivation, registerScopedService } from '#/_base/di/scope';
import { IConfigService } from '#/app/config/config';
import {
  type GoalCompletionGate,
  type GoalCompletionGateInput,
  IGoalCompletionGateService,
} from '#/agent/goal/completionGate';
import { IHostEnvironment } from '#/os/interface/hostEnvironment';
import { type IProcess, ISessionProcessRunner } from '#/session/process/processRunner';
import { readStream } from '#/session/sessionFs/fsProcess';
import { ISessionWorkspaceContext } from '#/session/workspaceContext/workspaceContext';

import {
  GOAL_COMPLETION_GATES_SECTION,
  type GoalCompletionGatesConfig,
  resolveGoalCompletionGates,
} from './configSection';
import { type GateCommandResult, runGoalCompletionGates } from './runGates';

export class SessionGoalCompletionGateService implements IGoalCompletionGateService {
  declare readonly _serviceBrand: undefined;

  constructor(
    @IConfigService private readonly config: IConfigService,
    @ISessionProcessRunner private readonly runner: ISessionProcessRunner,
    @IHostEnvironment private readonly env: IHostEnvironment,
    @ISessionWorkspaceContext private readonly workspace: ISessionWorkspaceContext,
  ) {}

  async run(input: GoalCompletionGateInput): Promise<GoalCompletionGate> {
    const resolved = resolveGoalCompletionGates(
      this.config.get<GoalCompletionGatesConfig | undefined>(GOAL_COMPLETION_GATES_SECTION),
    );
    if (resolved.commands.length === 0) return { passed: true };
    return runGoalCompletionGates(
      resolved.commands,
      (command, signal) => this.execGate(command, resolved.timeoutMs, signal),
      input.signal,
    );
  }

  private async execGate(
    command: string,
    timeoutMs: number,
    signal: AbortSignal,
  ): Promise<GateCommandResult> {
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = AbortSignal.any([signal, timeout]);
    let proc: IProcess | undefined;
    const onAbort = (): void => {
      if (proc !== undefined) void proc.kill('SIGKILL');
    };
    try {
      proc = await this.runner.exec(this.shellArgs(command), {
        cwd: this.workspace.workDir,
        env: {
          NO_COLOR: '1',
          TERM: 'dumb',
          GIT_TERMINAL_PROMPT: process.env['GIT_TERMINAL_PROMPT'] ?? '0',
          SHELL: this.env.shellPath,
        },
      });
      try {
        proc.stdin.end();
      } catch {
        // Interactive commands must see EOF instead of hanging on stdin.
      }
      if (combined.aborted) onAbort();
      else combined.addEventListener('abort', onAbort, { once: true });
      const [stdout, stderr, exitCode] = await Promise.all([
        readStream(proc.stdout),
        readStream(proc.stderr),
        proc.wait().catch(() => -1),
      ]);
      if (timeout.aborted && !signal.aborted) {
        return { exitCode, stdout, stderr, timedOut: true };
      }
      return { exitCode, stdout, stderr };
    } catch (error) {
      if (timeout.aborted && !signal.aborted) {
        return { exitCode: -1, stdout: '', stderr: '', timedOut: true };
      }
      return {
        exitCode: -1,
        stdout: '',
        stderr: '',
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      combined.removeEventListener('abort', onAbort);
    }
  }

  private shellArgs(command: string): readonly string[] {
    const cwd =
      this.env.osKind === 'Windows'
        ? windowsPathToPosixPath(this.workspace.workDir)
        : this.workspace.workDir;
    return [this.env.shellPath, '-c', `cd ${shellQuote(cwd)} && ${command}`];
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function windowsPathToPosixPath(path: string): string {
  if (path.startsWith('\\\\')) return path.replaceAll('\\', '/');
  const driveMatch = /^([A-Za-z]):(?:[\\/]|$)/.exec(path);
  if (driveMatch === null) return path.replaceAll('\\', '/');
  const drive = driveMatch[1]!.toLowerCase();
  const rest = path.slice(2).replaceAll('\\', '/');
  return `/${drive}${rest.startsWith('/') ? rest : `/${rest}`}`;
}

registerScopedService(
  LifecycleScope.Session,
  IGoalCompletionGateService,
  SessionGoalCompletionGateService,
  ScopeActivation.OnDemand,
  'goalCompletionGate',
);
