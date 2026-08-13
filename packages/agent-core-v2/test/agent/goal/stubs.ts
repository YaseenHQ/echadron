/**
 * Shared stubs for goal tests.
 */

import type { IAgentSwarmService } from '#/agent/swarm/swarm';
import type {
  GoalCompletionGate,
  IGoalCompletionGateService,
} from '#/agent/goal/completionGate';
import type {
  GoalCompletionReview,
  IGoalCompletionReviewService,
} from '#/agent/goal/completionReview';

/**
 * Inert stand-in for `IAgentSwarmService`.
 *
 * Goal tests never exercise swarm behavior, but the test-agent harness
 * instantiates every contributed tool, and `AgentSwarmTool` injects the real
 * `AgentSwarmService` — which self-wires executor veto listeners and pulls
 * in the swarm runtime. Stubbing the service keeps goal tests focused on
 * goal wiring.
 */
export function stubAgentSwarm(): IAgentSwarmService {
  return {
    _serviceBrand: undefined,
    isActive: false,
    enter: () => undefined,
    exit: () => undefined,
  };
}

export function stubGoalCompletionReview(
  verdict?: GoalCompletionReview,
): IGoalCompletionReviewService {
  const resolvedVerdict: GoalCompletionReview = verdict ?? { achieved: true };
  return {
    _serviceBrand: undefined,
    review: async () => resolvedVerdict,
  };
}

export function stubGoalCompletionGate(
  verdict?: GoalCompletionGate,
): IGoalCompletionGateService {
  const resolvedVerdict: GoalCompletionGate = verdict ?? { passed: true };
  return {
    _serviceBrand: undefined,
    run: async () => resolvedVerdict,
  };
}
