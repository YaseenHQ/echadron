/**
 * Compatibility shell for the removed v1 micro-compaction feature.
 *
 * Native compaction is owned by agent-core-v2's full-compaction service. The
 * v1 class remains only so older SDK callers and wire replays can be loaded
 * without changing their public shape; it never mutates context or schedules
 * work. Historical `micro_compaction.apply` records are still accepted by the
 * record reducer for backwards-compatible session replay.
 */

import type { Agent } from '..';
import type { ContextMessage } from '../context';

/** @deprecated Micro compaction is no longer configurable or executed. */
export interface MicroCompactionConfig {
  keepRecentMessages: number;
  minContentTokens: number;
  cacheMissedThresholdMs: number;
  truncatedMarker: string;
  minContextUsageRatio: number;
}

const DEFAULT_CONFIG: MicroCompactionConfig = {
  keepRecentMessages: 20,
  minContentTokens: 100,
  cacheMissedThresholdMs: 60 * 60 * 1000,
  truncatedMarker: '[Old tool result content cleared]',
  minContextUsageRatio: 0.5,
};

export class MicroCompaction {
  private cutoff = 0;
  readonly config: MicroCompactionConfig;

  constructor(
    public readonly agent: Agent,
    config?: Partial<MicroCompactionConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  reset(maxCutoff = 0): void {
    this.cutoff = Math.min(this.cutoff, maxCutoff);
  }

  /** Restore a historical cutoff without changing live context. */
  apply(cutoff: number): void {
    this.agent.records.logRecord({
      type: 'micro_compaction.apply',
      cutoff,
    });
    this.cutoff = cutoff;
  }

  /** @deprecated No-op; v2 owns automatic compaction. */
  detect(): void {}

  /** @deprecated No-op; v2 owns automatic compaction. */
  compact(messages: readonly ContextMessage[]): readonly ContextMessage[] {
    return messages;
  }
}
