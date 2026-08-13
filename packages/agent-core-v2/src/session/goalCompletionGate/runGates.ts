/**
 * `goalCompletionGate` domain (L6) — pure command-gate runner.
 *
 * Walks configured commands in order and returns the first failure. Callers
 * supply the process exec so Harbor / local / tests share the same policy.
 */

import type { GoalCompletionGate } from '#/agent/goal/completionGate';

export const MAX_GATE_OUTPUT_CHARS = 6000;

export interface GateCommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut?: boolean;
  readonly error?: string;
}

export async function runGoalCompletionGates(
  commands: readonly string[],
  exec: (command: string, signal: AbortSignal) => Promise<GateCommandResult>,
  signal: AbortSignal,
): Promise<GoalCompletionGate> {
  for (const command of commands) {
    signal.throwIfAborted();
    const result = await exec(command, signal);
    signal.throwIfAborted();
    if (result.timedOut === true) {
      return {
        passed: false,
        command,
        exitText: 'timed out',
        output: truncateGateOutput(joinGateOutput(result)),
      };
    }
    if (result.error !== undefined && result.error.length > 0) {
      return {
        passed: false,
        command,
        exitText: result.error,
        output: truncateGateOutput(joinGateOutput(result)),
      };
    }
    if (result.exitCode !== 0) {
      return {
        passed: false,
        command,
        exitText: `exited ${result.exitCode}`,
        output: truncateGateOutput(joinGateOutput(result)),
      };
    }
  }
  return { passed: true };
}

function joinGateOutput(result: GateCommandResult): string {
  return [result.stdout, result.stderr].filter((part) => part.trim().length > 0).join('\n').trim();
}

function truncateGateOutput(output: string): string {
  if (output.length <= MAX_GATE_OUTPUT_CHARS) return output;
  return `${output.slice(0, MAX_GATE_OUTPUT_CHARS)}\n…(truncated)`;
}
