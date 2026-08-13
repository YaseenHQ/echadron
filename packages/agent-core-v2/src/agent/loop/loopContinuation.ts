import { createDecorator } from '#/_base/di/instantiation';

export const LOOP_MAX_STEPS_LANDING_KIND = 'loop_max_steps_landing';

export const LOOP_MAX_STEPS_LANDING_PROMPT =
  'MAXIMUM STEPS REACHED. Tools are disabled for this step. Respond with text only.\n' +
  'If this turn already has a required final output shape, return that now from evidence already gathered. ' +
  'Prefer the strongest concrete observation you have. Do not reject with a process TODO such as "need to inspect more."\n' +
  'Otherwise summarize what was accomplished, what remains, and the single best next step.';

export function isMaxStepsLandingRequest(request: { readonly kind: string }): boolean {
  return request.kind === LOOP_MAX_STEPS_LANDING_KIND;
}

export interface IAgentLoopContinuationService {
  readonly _serviceBrand: undefined;
}

export const IAgentLoopContinuationService = createDecorator<IAgentLoopContinuationService>(
  'agentLoopContinuationService',
);
