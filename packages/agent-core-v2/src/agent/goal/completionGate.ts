/**
 * `goal` domain (L4) — command-based completion-gate contract.
 *
 * After the independent LLM review approves a complete request, configured
 * workspace commands run as a fail-closed host check. Empty command lists
 * pass. The Session-scoped implementation owns process execution.
 */

import { createDecorator } from '#/_base/di/instantiation';

export interface GoalCompletionGateInput {
  readonly signal: AbortSignal;
}

export type GoalCompletionGate =
  | {
      readonly passed: true;
    }
  | {
      readonly passed: false;
      readonly command: string;
      readonly exitText: string;
      readonly output: string;
    };

export interface IGoalCompletionGateService {
  readonly _serviceBrand: undefined;

  run(input: GoalCompletionGateInput): Promise<GoalCompletionGate>;
}

export const IGoalCompletionGateService = createDecorator<IGoalCompletionGateService>(
  'goalCompletionGateService',
);

export function buildGoalCompletionGateFeedback(
  gate: Extract<GoalCompletionGate, { passed: false }>,
): string {
  return [
    'Configured completion gate failed. The goal remains active.',
    `Command: \`${gate.command}\` ${gate.exitText}.`,
    ...(gate.output.length === 0 ? [] : ['Output:', gate.output]),
    'Fix the failure locally, then rerun the same command yourself. Do not launch an Agent or another verifier.',
    'Once the command exits 0, call UpdateGoal with status `complete` so the gate rechecks it.',
  ].join('\n');
}
