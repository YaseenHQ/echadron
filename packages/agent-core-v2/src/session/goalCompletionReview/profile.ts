/**
 * `goalCompletionReview` domain (L6) — builtin verifier profile contribution.
 *
 * Contributes the bounded primary-model verifier resolved by
 * `goalCompletionReview`. The internal profile is hidden from model-facing
 * Agent and AgentSwarm delegation. Loaded for its registration side effect.
 */

import { registerAgentProfile } from '#/app/agentProfileCatalog/contribution';
import {
  renderSystemPrompt,
  skillActiveFor,
  TASK_AGENT_ROLE_PREFIX,
} from '#/app/agentProfileCatalog/profile-shared';

import VERIFIER_ROLE from './verifier.md?raw';

export const GOAL_COMPLETION_VERIFIER_PROFILE_NAME = 'verifier';

export const GOAL_COMPLETION_VERIFIER_MAX_STEPS_PER_TURN = 10;

const VERIFIER_TOOLS = ['Read', 'Glob', 'Grep', 'Bash'] as const;

registerAgentProfile({
  name: GOAL_COMPLETION_VERIFIER_PROFILE_NAME,
  description:
    'Adversarial read-only completion audit that inspects the workspace and exercises shipped behavior.',
  whenToUse:
    'Use this agent to independently verify that a completed implementation satisfies its stated contract before accepting the result.',
  tools: VERIFIER_TOOLS,
  model: 'primary',
  maxStepsPerTurn: GOAL_COMPLETION_VERIFIER_MAX_STEPS_PER_TURN,
  internal: true,
  systemPrompt: (context) =>
    renderSystemPrompt(`${TASK_AGENT_ROLE_PREFIX}\n\n${VERIFIER_ROLE}`, context, {
      skillActive: skillActiveFor(VERIFIER_TOOLS),
    }),
});
