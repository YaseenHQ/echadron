/**
 * `goalCompletionGate` domain (L6) — `[goal_completion_gates]` schema and
 * env bindings.
 *
 * Commands run in the session workspace after an LLM completion review
 * approves. An empty list is a no-op (the gate passes). Self-registered at
 * module load via `registerConfigSection`.
 */

import { z } from 'zod';

import { type EnvBindings, envBindings, stripEnvBoundFields } from '#/app/config/config';
import { registerConfigSection } from '#/app/config/configSectionContributions';

export const GOAL_COMPLETION_GATES_SECTION = 'goalCompletionGates';

export const GOAL_GATE_COMMANDS_ENV = 'KIMI_GOAL_GATE_COMMANDS';
export const GOAL_GATE_TIMEOUT_MS_ENV = 'KIMI_GOAL_GATE_TIMEOUT_MS';

export const DEFAULT_GOAL_GATE_TIMEOUT_MS = 5 * 60 * 1000;

export const GoalCompletionGatesSchema = z.object({
  commands: z.array(z.string().min(1)).default([]),
  timeoutMs: z.number().int().min(1).default(DEFAULT_GOAL_GATE_TIMEOUT_MS),
});

export type GoalCompletionGatesConfig = z.infer<typeof GoalCompletionGatesSchema>;

export function parseGoalGateCommandsEnv(raw: string): string[] | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
        return undefined;
      }
      const commands = parsed.map((item) => item.trim()).filter((item) => item.length > 0);
      return commands.length > 0 ? commands : undefined;
    } catch {
      return undefined;
    }
  }
  const commands = trimmed
    .split(/[;\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return commands.length > 0 ? commands : undefined;
}

function parsePositiveInt(raw: string): number | undefined {
  const value = raw.trim();
  if (value.length === 0 || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

export const goalCompletionGatesEnvBindings: EnvBindings<GoalCompletionGatesConfig> = envBindings(
  GoalCompletionGatesSchema,
  {
    commands: { env: GOAL_GATE_COMMANDS_ENV, parse: parseGoalGateCommandsEnv },
    timeoutMs: { env: GOAL_GATE_TIMEOUT_MS_ENV, parse: parsePositiveInt },
  },
);

export const stripGoalCompletionGatesEnv = stripEnvBoundFields(goalCompletionGatesEnvBindings);

registerConfigSection(GOAL_COMPLETION_GATES_SECTION, GoalCompletionGatesSchema, {
  defaultValue: { commands: [], timeoutMs: DEFAULT_GOAL_GATE_TIMEOUT_MS },
  env: goalCompletionGatesEnvBindings,
  stripEnv: stripGoalCompletionGatesEnv,
});

export function resolveGoalCompletionGates(
  value: GoalCompletionGatesConfig | undefined,
): GoalCompletionGatesConfig {
  return {
    commands: value?.commands ?? [],
    timeoutMs: value?.timeoutMs ?? DEFAULT_GOAL_GATE_TIMEOUT_MS,
  };
}
