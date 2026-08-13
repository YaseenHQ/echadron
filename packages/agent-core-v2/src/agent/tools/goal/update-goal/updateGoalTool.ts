/**
 * `tools` domain (L7) — `IUpdateGoalTool` implementation.
 *
 * Updates the current goal's status through the goal service (`goal`); the
 * turn driver reads the status at each turn boundary and stops (`complete` /
 * `blocked`) or keeps going (`active`). Guards against the goal changing or
 * disappearing between resolution and execution, and ends the turn with the
 * completion-summary / blocked-reason prompts (`goal` outcome prompts) on
 * terminal statuses. Registered for the main agent only, mirroring v1's
 * `agent.type === 'main'` gate. Bound at Agent scope.
 */

import { toInputJsonSchema } from '#/tool/input-schema';
import { IAgentScopeContext } from '#/agent/scopeContext/scopeContext';
import { type ToolExecution } from '#/tool/toolContract';
import { registerAgentToolService } from '#/agent/toolRegistry/toolContribution';

import { IAgentGoalService } from '#/agent/goal/goal';
import {
  buildGoalCompletionGateFeedback,
  IGoalCompletionGateService,
} from '#/agent/goal/completionGate';
import { IGoalCompletionReviewService } from '#/agent/goal/completionReview';
import {
  buildGoalBlockedReasonPrompt,
  buildGoalCompletionSummaryPrompt,
} from '#/agent/goal/tools/outcome-prompts';


import DESCRIPTION from './update-goal.md?raw';
import {
  UpdateGoalToolInputSchema,
  IUpdateGoalTool,
  type UpdateGoalToolInput,
} from './update-goal';

export class UpdateGoalTool implements IUpdateGoalTool {
  declare readonly _serviceBrand: undefined;
  readonly name = 'UpdateGoal' as const;
  readonly description: string = DESCRIPTION;
  readonly parameters: Record<string, unknown> = toInputJsonSchema(UpdateGoalToolInputSchema);

  constructor(
    @IAgentGoalService private readonly goal: IAgentGoalService,
    @IGoalCompletionReviewService
    private readonly completionReview: IGoalCompletionReviewService,
    @IGoalCompletionGateService
    private readonly completionGates: IGoalCompletionGateService,
  ) {}

  resolveExecution(args: UpdateGoalToolInput): ToolExecution {
    if (!isUpdateGoalStatus(args.status)) {
      return {
        isError: true,
        output: 'Invalid goal status. Use `active`, `complete`, or `blocked`.',
      };
    }

    const status = args.status;
    const currentGoal = this.goal.getGoal().goal;
    const goalIsActive = currentGoal?.status === 'active';

    return {
      description: `Setting goal status: ${status}`,
      stopBatchAfterThis: status !== 'active' && goalIsActive,
      approvalRule: this.name,
      execute: async ({ turnId, signal }) => {
        const goalAtExecution = this.goal.getGoal().goal;
        if (goalAtExecution === null || (currentGoal === null && status === 'active')) {
          return { output: missingGoalOutput(status) };
        }
        if (
          goalAtExecution.goalId !== currentGoal?.goalId &&
          !this.goal.isGoalToolTarget(turnId, goalAtExecution.goalId)
        ) {
          return { output: changedGoalOutput(status) };
        }
        if (status === 'active') {
          await this.goal.resumeGoal({}, 'model');
          return { output: 'Goal resumed.' };
        }
        if (status === 'complete') {
          const review = await this.completionReview.review({
            goal: goalAtExecution,
            signal,
          });
          const goalAfterReview = this.goal.getGoal().goal;
          if (goalAfterReview?.goalId !== goalAtExecution.goalId) {
            return { output: changedGoalOutput(status) };
          }
          if (!review.achieved) {
            return { output: buildCompletionReviewFeedback(review.gaps, review.evidence) };
          }
          const gate = await this.completionGates.run({ signal });
          const goalAfterGate = this.goal.getGoal().goal;
          if (goalAfterGate?.goalId !== goalAtExecution.goalId) {
            return { output: changedGoalOutput(status) };
          }
          if (!gate.passed) {
            return { output: buildGoalCompletionGateFeedback(gate) };
          }
          const completed = await this.goal.markComplete({}, 'model');
          if (completed === null) {
            return { output: 'Goal not completed: no active goal.' };
          }
          return { output: buildGoalCompletionSummaryPrompt(completed), stopTurn: true };
        }
        if (status === 'blocked') {
          const blocked = await this.goal.markBlocked({}, 'model');
          if (blocked === null) {
            return { output: 'Goal not blocked: no active goal.' };
          }
          return { output: buildGoalBlockedReasonPrompt(blocked), stopTurn: true };
        }
        return {
          isError: true,
          output: 'Invalid goal status. Use `active`, `complete`, or `blocked`.',
        };
      },
    };
  }
}

function buildCompletionReviewFeedback(
  gaps: readonly string[],
  evidence: string | undefined,
): string {
  return [
    'Independent completion review found remaining work. The goal remains active.',
    'Address these concrete gaps before requesting completion again:',
    ...gaps.map((gap) => `- ${gap}`),
    ...(evidence === undefined ? [] : ['Verifier evidence:', evidence]),
    'Repair the defect locally, then rerun the narrowest failing probe or check yourself to '
    + 'confirm it is fixed. Do not launch an Agent or another verifier — verify the actual '
    + 'result directly. Once the narrowest check passes, call UpdateGoal with status `complete` '
    + 'so the gate rechecks it.',
    'Do not merely restate the claim.',
  ].join('\n');
}

function isUpdateGoalStatus(status: unknown): status is UpdateGoalToolInput['status'] {
  return status === 'active' || status === 'complete' || status === 'blocked';
}

function missingGoalOutput(status: UpdateGoalToolInput['status']): string {
  if (status === 'active') return 'Goal not resumed: no current goal.';
  if (status === 'complete') return 'Goal not completed: no active goal.';
  return 'Goal not blocked: no active goal.';
}

function changedGoalOutput(status: UpdateGoalToolInput['status']): string {
  if (status === 'active') return 'Goal not resumed: the current goal changed.';
  if (status === 'complete') return 'Goal not completed: the current goal changed.';
  return 'Goal not blocked: the current goal changed.';
}

registerAgentToolService(IUpdateGoalTool, UpdateGoalTool, {
  name: 'UpdateGoal',
  domain: 'goal',
  when: (accessor) => accessor.get(IAgentScopeContext).agentId === 'main',
});
