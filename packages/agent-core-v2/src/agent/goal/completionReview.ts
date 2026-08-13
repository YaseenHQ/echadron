/**
 * `goal` domain (L4) — independent completion-review contract.
 *
 * A review is requested only when the main agent asks to complete an active
 * goal. The reviewer receives an immutable goal snapshot and returns an
 * adversarial verdict without mutating goal lifecycle state itself. The
 * Session-scoped implementation owns fresh-agent orchestration.
 */

import { createDecorator } from '#/_base/di/instantiation';

import type { GoalSnapshot } from './types';

export interface GoalCompletionReviewInput {
  readonly goal: GoalSnapshot;
  readonly signal: AbortSignal;
}

export type GoalCompletionReview =
  | {
      readonly achieved: true;
      readonly evidence?: string | undefined;
    }
  | {
      readonly achieved: false;
      readonly gaps: readonly string[];
      readonly evidence?: string | undefined;
    };

export interface IGoalCompletionReviewService {
  readonly _serviceBrand: undefined;

  review(input: GoalCompletionReviewInput): Promise<GoalCompletionReview>;
}

export const IGoalCompletionReviewService =
  createDecorator<IGoalCompletionReviewService>('goalCompletionReviewService');
