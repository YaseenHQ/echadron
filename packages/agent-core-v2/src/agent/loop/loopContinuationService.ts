/**
 * `loop` domain (L4) — tool-step continuation aspect.
 *
 * A step that executed tools must drive one more step so the model consumes
 * the tool results: this service watches the loop's `onDidFinishStep` and enqueues
 * a `ContinuationStepRequest` whenever a step ends with `tool_calls` — which
 * is exactly when the step ran tools without a stopTurn tool result (the
 * loop maps that combination onto the `tool_calls` finish reason). When that
 * next step would exceed the composed per-turn ceiling, it enqueues a
 * tool-free landing prompt instead so the turn can emit a final answer from
 * evidence already gathered. The loop itself only drains the queue and
 * dispatches errors; it never enqueues. A hook-set `stopTurn` still wins over
 * the continuation: the turn ends at the step boundary and the turn-scoped
 * request is discarded by the run-end cleanup. Bound at Agent scope and
 * constructed with the scope so the hook registers before the first turn
 * runs (same rationale as `stepRetry`).
 */

import { Disposable } from '#/_base/di/lifecycle';
import { LifecycleScope, ScopeActivation, registerScopedService } from '#/_base/di/scope';
import { IConfigService } from '#/app/config/config';
import { IAgentProfileService } from '#/agent/profile/profile';

import { LOOP_CONTROL_SECTION, type LoopControl } from './configSection';
import {
  IAgentLoopContinuationService,
  LOOP_MAX_STEPS_LANDING_KIND,
  LOOP_MAX_STEPS_LANDING_PROMPT,
} from './loopContinuation';
import { effectiveMaxStepsPerTurn, IAgentLoopService } from './loop';
import { ContinuationStepRequest, MessageStepRequest } from './stepRequest';

export class AgentLoopContinuationService
  extends Disposable
  implements IAgentLoopContinuationService
{
  declare readonly _serviceBrand: undefined;

  constructor(
    @IAgentLoopService private readonly loop: IAgentLoopService,
    @IAgentProfileService private readonly profile: IAgentProfileService,
    @IConfigService private readonly config: IConfigService,
  ) {
    super();
    this._register(
      this.loop.hooks.onDidFinishStep.register('loop-continuation', async (ctx, next) => {
        await next();
        if (ctx.stopTurn || ctx.finishReason !== 'tool_calls') return;
        const maxSteps = this.effectiveCeiling();
        if (maxSteps !== undefined && ctx.step > maxSteps) return;
        if (maxSteps !== undefined && ctx.step === maxSteps) {
          this.loop.enqueue(
            new MessageStepRequest(
              {
                role: 'user',
                content: [{ type: 'text', text: LOOP_MAX_STEPS_LANDING_PROMPT }],
                toolCalls: [],
                origin: { kind: 'system_trigger', name: LOOP_MAX_STEPS_LANDING_KIND },
              },
              { kind: LOOP_MAX_STEPS_LANDING_KIND },
            ),
          );
          return;
        }
        this.loop.enqueue(new ContinuationStepRequest());
      }),
    );
  }

  private effectiveCeiling(): number | undefined {
    return effectiveMaxStepsPerTurn(
      this.config.get<LoopControl>(LOOP_CONTROL_SECTION)?.maxStepsPerTurn,
      this.profile.data().maxStepsPerTurn,
    );
  }
}

registerScopedService(
  LifecycleScope.Agent,
  IAgentLoopContinuationService,
  AgentLoopContinuationService,
  ScopeActivation.OnScopeCreated,
  'loop',
);
