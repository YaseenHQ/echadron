import { Disposable, DisposableStore } from '#/_base/di/lifecycle';
import { LifecycleScope, ScopeActivation, registerScopedService } from '#/_base/di/scope';
import { IEventBus } from '#/app/event/eventBus';
import { IAgentLifecycleService, MAIN_AGENT_ID } from '#/session/agentLifecycle/agentLifecycle';
import { ISessionMetadata } from '#/session/sessionMetadata/sessionMetadata';

import type { SessionTurnOutcome } from './sessionActivity';
import { ISessionOutcomeMirror } from './sessionOutcomeMirror';

// Event handlers intentionally enqueue metadata writes without blocking the
// agent event bus. Keep the promises visible to lifecycle teardown so a close
// cannot remove the session directory while its final outcome is still being
// persisted.
const pendingWrites = new Set<Promise<void>>();

export async function drainSessionMetadataWrites(): Promise<void> {
  while (pendingWrites.size > 0) {
    await Promise.allSettled([...pendingWrites]);
  }
}

/**
 * Keeps the latest main-turn outcome in durable metadata. Live activity state
 * is rebuilt on resume; this small mirror makes cold session listings retain
 * the same outcome without coupling the index to a live agent.
 */
export class SessionOutcomeMirror extends Disposable implements ISessionOutcomeMirror {
  declare readonly _serviceBrand: undefined;

  private lastPersisted: SessionTurnOutcome | undefined;
  private adopted = false;
  private turnStartedHere = false;
  private mainSubscription: DisposableStore | undefined;

  constructor(
    @IAgentLifecycleService private readonly agents: IAgentLifecycleService,
    @ISessionMetadata private readonly metadata: ISessionMetadata,
  ) {
    super();
    void this.metadata.read().then((meta) => {
      if (!this.adopted) this.lastPersisted = meta.lastTurnReason;
    }).catch(() => undefined);
    this.attachMain();
    this._register(this.agents.onDidCreate((handle) => {
      if (handle.id === MAIN_AGENT_ID) this.attachMain();
    }));
    this._register(this.agents.onDidDispose((agentId) => {
      if (agentId !== MAIN_AGENT_ID) return;
      this.mainSubscription?.dispose();
      this.mainSubscription = undefined;
    }));
    this._register({
      dispose: () => {
        this.mainSubscription?.dispose();
        this.mainSubscription = undefined;
      },
    });
  }

  private attachMain(): void {
    if (this.mainSubscription !== undefined) return;
    const bus = this.agents.get(MAIN_AGENT_ID)?.accessor.get(IEventBus) as IEventBus | undefined;
    if (bus === undefined) return;
    const subscription = new DisposableStore();
    this.mainSubscription = subscription;
    subscription.add(bus.subscribe('turn.started', () => {
      this.turnStartedHere = true;
      this.write(undefined);
    }));
    subscription.add(bus.subscribe('turn.ended', (event) => {
      if (event.type !== 'turn.ended') return;
      const reason = (event as { reason?: unknown }).reason;
      const interruptReason = (event as { interruptReason?: unknown }).interruptReason;
      if (reason === 'completed') this.write('completed');
      else if (reason === 'failed' || reason === 'blocked') this.write('failed');
      else if (reason === 'cancelled' && interruptReason === 'user_cancelled') {
        this.write('cancelled');
      }
    }));
    subscription.add(bus.subscribe('agent.activity.updated', (event) => {
      if (this.turnStartedHere || this.lastPersisted !== undefined) return;
      const reason = (event as { lastTurn?: { reason?: unknown } }).lastTurn?.reason;
      if (reason === 'completed' || reason === 'cancelled') {
        this.write(reason, { touchUpdatedAt: false });
      } else if (reason === 'failed' || reason === 'blocked') {
        this.write('failed', { touchUpdatedAt: false });
      }
    }));
  }

  private write(
    outcome: SessionTurnOutcome | undefined,
    opts?: { readonly touchUpdatedAt?: boolean },
  ): void {
    if (outcome === this.lastPersisted) return;
    this.adopted = true;
    const previous = this.lastPersisted;
    this.lastPersisted = outcome;
    const pending = this.metadata.update({ lastTurnReason: outcome }, opts).catch(() => {
      if (this.lastPersisted === outcome) this.lastPersisted = previous;
    });
    pendingWrites.add(pending);
    void pending.finally(() => pendingWrites.delete(pending));
  }
}

registerScopedService(
  LifecycleScope.Session,
  ISessionOutcomeMirror,
  SessionOutcomeMirror,
  ScopeActivation.OnScopeCreated,
  'sessionActivity',
);
