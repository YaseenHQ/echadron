/**
 * `swarm` domain (L4) — swarm-mode context injection.
 *
 * Owns the `swarm_mode` context-injection provider. It reads live swarm state
 * from the owning `IAgentSwarmService` and announces entry / exit through
 * `contextInjector`, replacing the older push-on-enter / pop-on-exit handling
 * that mutated `ContextModel` directly. Dedup is history-derived the same way
 * as `permissionMode`: the framework mirrors this variant's live positions
 * across splices, so a reminder folded away by compaction is re-announced on
 * the next inject while the mode is still active.
 *
 * The last announced state lives in `agentState` (`IAgentStateService`). A
 * session restored from the wire journal has no such state yet, so the
 * fallback scans context history for this variant — including the legacy
 * `swarm_mode_exit` variant written by the previous implementation — and
 * recovers what the model was last told. Without that scan a restored active
 * swarm would re-announce entry on its first inject.
 *
 * A `'tool'` trigger is deliberately silent: `AgentSwarm` announcing swarm
 * mode back to the model that just called it is noise, and that matches the
 * behaviour of the implementation this replaces.
 */

import { Disposable } from '#/_base/di/lifecycle';
import { defineState } from '#/_base/state/stateRegistry';
import {
  IAgentContextInjectorService,
  type ContextInjectionContext,
} from '#/agent/contextInjector/contextInjector';
import { IAgentContextMemoryService } from '#/agent/contextMemory/contextMemory';
import { IAgentStateService } from '#/agent/state/agentState';

import SWARM_MODE_ENTER_REMINDER from '../enter-reminder.md?raw';
import SWARM_MODE_EXIT_REMINDER from '../exit-reminder.md?raw';
import type { SwarmModeTrigger } from '../swarm';

export const SWARM_MODE_INJECTION_VARIANT = 'swarm_mode';
/** Variant the previous push/pop implementation used for the exit notice. */
export const LEGACY_SWARM_MODE_EXIT_VARIANT = 'swarm_mode_exit';

export const swarmLastAnnouncedKey = defineState<boolean | undefined>(
  'swarm.lastAnnounced',
  () => undefined as boolean | undefined,
);

export interface SwarmInjectionOptions {
  /** Live swarm trigger, or `null` when swarm mode is off. */
  readonly getTrigger: () => SwarmModeTrigger | null;
}

export class SwarmInjection extends Disposable {
  constructor(
    private readonly options: SwarmInjectionOptions,
    @IAgentContextInjectorService dynamicInjector: IAgentContextInjectorService,
    @IAgentContextMemoryService private readonly context: IAgentContextMemoryService,
    @IAgentStateService private readonly states: IAgentStateService,
  ) {
    super();
    this.states.register(swarmLastAnnouncedKey);
    this._register(
      dynamicInjector.register(SWARM_MODE_INJECTION_VARIANT, (ctx) => this.reminder(ctx)),
    );
  }

  private reminder({ injectedPositions }: ContextInjectionContext): string | undefined {
    const active = this.isAnnounceable();
    const announced = this.lastAnnounced() ?? false;

    if (active === announced) {
      // Still in the same state. Re-announce only when the mode is on and
      // compaction (or undo) folded the reminder out of the live context.
      if (!active || injectedPositions.length > 0) return undefined;
      return SWARM_MODE_ENTER_REMINDER;
    }

    this.states.set(swarmLastAnnouncedKey, active);
    return active ? SWARM_MODE_ENTER_REMINDER : SWARM_MODE_EXIT_REMINDER;
  }

  /** Swarm mode is on and was entered by something the model should hear about. */
  private isAnnounceable(): boolean {
    const trigger = this.options.getTrigger();
    return trigger !== null && trigger !== 'tool';
  }

  private lastAnnounced(): boolean | undefined {
    const remembered = this.states.get(swarmLastAnnouncedKey);
    if (remembered !== undefined) return remembered;
    return this.announcedInHistory();
  }

  private announcedInHistory(): boolean | undefined {
    const history = this.context.get();
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const origin = history[index]?.origin;
      if (origin?.kind !== 'injection') continue;
      if (origin.variant === LEGACY_SWARM_MODE_EXIT_VARIANT) return false;
      if (origin.variant === SWARM_MODE_INJECTION_VARIANT) return true;
    }
    return undefined;
  }
}
