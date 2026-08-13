/**
 * `goalCompletionReview` domain (L6) — fresh-context completion verification.
 *
 * Resolves the internal verifier through `sessionAgentProfileCatalog`, creates
 * its ephemeral Agent scope through `agentLifecycle`, drives the bounded audit
 * through `subagent`, and logs fail-closed outcomes through `log`. Inherits the
 * main agent's profile and permission mode. Bound at Session scope.
 */

import {
  type IAgentScopeHandle,
  LifecycleScope,
  ScopeActivation,
  registerScopedService,
} from '#/_base/di/scope';
import { ILogService } from '#/_base/log/log';
import { isPlainRecord } from '#/_base/utils/canonical-args';
import { escapeXml } from '#/_base/utils/xml-escape';
import {
  type GoalCompletionReview,
  type GoalCompletionReviewInput,
  IGoalCompletionReviewService,
} from '#/agent/goal/completionReview';
import { isMaxStepsExceededError } from '#/agent/loop/loop';
import { IAgentPermissionModeService } from '#/agent/permissionMode/permissionMode';
import { IAgentProfileService } from '#/agent/profile/profile';
import {
  IAgentLifecycleService,
  MAIN_AGENT_ID,
} from '#/session/agentLifecycle/agentLifecycle';
import { isTruncatedTurnError } from '#/session/subagent/runAgentTurn';
import { ISessionAgentProfileCatalog } from '#/session/sessionAgentProfileCatalog/sessionAgentProfileCatalog';
import { ISessionSubagentService } from '#/session/subagent/subagent';

import { GOAL_COMPLETION_VERIFIER_PROFILE_NAME } from './profile';

const MAX_REVIEW_GAPS = 8;
const MAX_REVIEW_GAP_LENGTH = 600;
const MAX_REVIEW_EVIDENCE_LENGTH = 1_200;
const MAX_JSON_CANDIDATE_STARTS = 64;
const MAX_JSON_CANDIDATE_LENGTH = 64 * 1024;
const INVALID_REVIEW_GAP =
  'Independent verification did not produce a valid verdict. Inspect and verify the objective before requesting completion again.';

const FORMAT_CONTINUATION_PROMPT =
  'Your previous response could not be parsed as the required JSON verdict. ' +
  'Return ONLY the strict JSON object now — no prose, no code fence. ' +
  `Use the exact shape {"achieved":boolean,"gaps":string[],"evidence":string}. ` +
  'If you approve, set gaps to an empty array. If you found a defect, list terse concrete gaps ' +
  `and cite the inspected path in evidence (at most ${MAX_REVIEW_EVIDENCE_LENGTH} characters). ` +
  'If the audit ended before you gathered enough evidence to approve, reject completion and ' +
  'state the strongest concrete observation you already have as a gap. Do not invent a process TODO.';

class MalformedVerdictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedVerdictError';
  }
}

interface PriorRejection {
  readonly goalId: string;
  readonly gaps: readonly string[];
  readonly evidence: string | undefined;
}

interface ReviewSequencing {
  readonly seq: number;
  readonly goalId: string;
}

export class SessionGoalCompletionReviewService implements IGoalCompletionReviewService {
  declare readonly _serviceBrand: undefined;

  private priorRejection: PriorRejection | undefined;
  private reviewSeq = 0;
  private latestReview: ReviewSequencing | undefined;

  constructor(
    @IAgentLifecycleService private readonly lifecycle: IAgentLifecycleService,
    @ISessionSubagentService private readonly subagents: ISessionSubagentService,
    @ISessionAgentProfileCatalog private readonly catalog: ISessionAgentProfileCatalog,
    @ILogService private readonly log: ILogService,
  ) {}

  async review(input: GoalCompletionReviewInput): Promise<GoalCompletionReview> {
    input.signal.throwIfAborted();
    const seq = (this.reviewSeq += 1);
    const goalId = input.goal.goalId;
    this.beginReview(seq, goalId);
    const prior = this.matchingPriorRejection(goalId);
    let verifier: IAgentScopeHandle | undefined;
    try {
      const main = this.lifecycle.get(MAIN_AGENT_ID);
      if (main === undefined) throw new MalformedVerdictError('main agent is unavailable');

      await this.catalog.ready;
      if (this.catalog.get(GOAL_COMPLETION_VERIFIER_PROFILE_NAME) === undefined) {
        throw new MalformedVerdictError('verifier profile is unavailable');
      }

      const mainProfile = main.accessor.get(IAgentProfileService);
      const mainData = mainProfile.data();
      if (mainData.modelAlias === undefined) {
        throw new MalformedVerdictError('main model is unavailable');
      }

      verifier = await this.lifecycle.create({
        binding: {
          profile: GOAL_COMPLETION_VERIFIER_PROFILE_NAME,
          model: mainData.modelAlias,
          thinking: mainProfile.getEffectiveThinkingLevel(),
          cwd: mainData.cwd,
        },
        labels: {
          parentAgentId: MAIN_AGENT_ID,
          purpose: 'goal-completion-review',
        },
      });
      verifier.accessor
        .get(IAgentPermissionModeService)
        .setMode(main.accessor.get(IAgentPermissionModeService).mode);

      const verdict = await this.runVerifyingTurn(verifier, input, prior);
      input.signal.throwIfAborted();
      this.applyVerdictToMemory(verdict, goalId, seq);
      return verdict;
    } catch (error) {
      input.signal.throwIfAborted();
      if (error instanceof MalformedVerdictError) {
        this.log.warn('goal completion verification failed closed', { reason: error.message });
        return invalidReview(error.message);
      }
      this.log.warn('goal completion verification failed closed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return invalidReview(error instanceof Error ? error.message : String(error));
    } finally {
      if (verifier !== undefined) await this.removeVerifier(verifier.id);
    }
  }

  private async runVerifyingTurn(
    verifier: IAgentScopeHandle,
    input: GoalCompletionReviewInput,
    prior: PriorRejection | undefined,
  ): Promise<GoalCompletionReview> {
    const auditPrompt = buildGoalCompletionReviewPrompt(input, prior);
    let summary: string;
    let usedFormatContinuation = false;
    try {
      const run = await this.subagents.run(
        verifier.id,
        { kind: 'prompt', prompt: auditPrompt },
        { signal: input.signal },
      );
      ({ summary } = await run.completion);
    } catch (error) {
      if (input.signal.aborted) throw error;
      if (!isRecoverableRunError(error)) throw error;
      usedFormatContinuation = true;
      summary = await this.formatOnlyContinuation(verifier, input.signal);
    }

    const parsed = parseGoalCompletionReview(summary);
    if (parsed !== undefined) return parsed;
    if (usedFormatContinuation) throw new MalformedVerdictError('verdict was malformed');
    const reformatted = await this.formatOnlyContinuation(verifier, input.signal);
    const reparsed = parseGoalCompletionReview(reformatted);
    if (reparsed === undefined) throw new MalformedVerdictError('verdict was malformed');
    return reparsed;
  }

  private async formatOnlyContinuation(
    verifier: IAgentScopeHandle,
    signal: AbortSignal,
  ): Promise<string> {
    verifier.accessor.get(IAgentProfileService).update({ activeToolNames: [] });
    const run = await this.subagents.run(
      verifier.id,
      { kind: 'prompt', prompt: FORMAT_CONTINUATION_PROMPT },
      { signal },
    );
    const { summary } = await run.completion;
    return summary;
  }

  private beginReview(seq: number, goalId: string): void {
    const previous = this.latestReview;
    this.latestReview = { seq, goalId };
    if (previous !== undefined && previous.goalId !== goalId) {
      this.priorRejection = undefined;
    }
  }

  private matchingPriorRejection(goalId: string): PriorRejection | undefined {
    const prior = this.priorRejection;
    return prior !== undefined && prior.goalId === goalId ? prior : undefined;
  }

  private applyVerdictToMemory(
    verdict: GoalCompletionReview,
    goalId: string,
    seq: number,
  ): void {
    if (this.latestReview?.seq !== seq || this.latestReview.goalId !== goalId) return;
    if (verdict.achieved) {
      if (this.priorRejection?.goalId === goalId) this.priorRejection = undefined;
      return;
    }
    this.priorRejection = {
      goalId,
      gaps: verdict.gaps,
      evidence: verdict.evidence,
    };
  }

  private async removeVerifier(agentId: string): Promise<void> {
    try {
      await this.lifecycle.remove(agentId);
    } catch (error) {
      this.log.warn('goal completion verifier cleanup failed', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function isRecoverableRunError(error: unknown): boolean {
  return isMaxStepsExceededError(error) || isTruncatedTurnError(error);
}

export function buildGoalCompletionReviewPrompt(
  input: GoalCompletionReviewInput,
  prior?: PriorRejection,
): string {
  const criterion = input.goal.completionCriterion?.trim();
  const lines: string[] = [
    'The implementing agent requested that this goal be marked complete.',
    'Independently audit the current workspace against this immutable completion contract:',
    '<untrusted_objective>',
    escapeXml(input.goal.objective),
    '</untrusted_objective>',
    '<untrusted_completion_criterion>',
    criterion === undefined || criterion.length === 0
      ? '(No separate criterion was provided.)'
      : escapeXml(criterion),
    '</untrusted_completion_criterion>',
  ];
  if (prior !== undefined) {
    const escapedEvidence =
      prior.evidence === undefined ? undefined : escapeXml(prior.evidence);
    lines.push(
      '<prior_rejection>',
      'A previous independent review of THIS goal rejected completion with these concrete gaps:',
      ...prior.gaps.map((gap) => `- ${escapeXml(gap)}`),
      ...(escapedEvidence === undefined ? [] : [`Prior evidence: ${escapedEvidence}`]),
      'Recheck this gap FIRST. If it still fails, return the JSON verdict immediately without further probing.',
      'If it is repaired, perform your structural and transitive-contamination probes on the current tree',
      'with at most one narrow adjacent spot-check before deciding.',
      '</prior_rejection>',
    );
  }
  lines.push(
    'Use your tools to inspect and exercise the actual result, then return the required JSON verdict.',
  );
  return lines.join('\n');
}

export function parseGoalCompletionReview(text: string): GoalCompletionReview | undefined {
  for (const value of parseReviewObjects(text)) {
    const review = normalizeGoalCompletionReview(value);
    if (review !== undefined) return review;
  }
  return undefined;
}

function normalizeGoalCompletionReview(
  value: Record<string, unknown>,
): GoalCompletionReview | undefined {
  if (typeof value['achieved'] !== 'boolean') return undefined;

  const rawGaps = value['gaps'];
  if (!Array.isArray(rawGaps)) return undefined;
  const cleaned = rawGaps
    .filter((gap): gap is string => typeof gap === 'string')
    .map((gap) => clampText(gap, MAX_REVIEW_GAP_LENGTH))
    .filter((gap) => gap.length > 0);
  // Reject only genuinely malformed entries (non-strings, or gaps that clamp
  // away to nothing). Overflowing the cap is not malformed: truncate it, so a
  // verifier listing more than MAX_REVIEW_GAPS real defects still reports them
  // instead of collapsing into the generic "verdict was malformed" message.
  if (cleaned.length !== rawGaps.length) return undefined;
  const gaps = cleaned.slice(0, MAX_REVIEW_GAPS);

  const rawEvidence = value['evidence'];
  if (rawEvidence !== undefined && typeof rawEvidence !== 'string') return undefined;
  const evidence =
    typeof rawEvidence === 'string'
      ? clampText(rawEvidence, MAX_REVIEW_EVIDENCE_LENGTH) || undefined
      : undefined;

  if (value['achieved'] && gaps.length === 0) {
    return evidence === undefined ? { achieved: true } : { achieved: true, evidence };
  }
  if (gaps.length === 0) return undefined;
  return {
    achieved: false,
    gaps,
    ...(evidence === undefined ? {} : { evidence }),
  };
}

function invalidReview(reason: string): GoalCompletionReview {
  return {
    achieved: false,
    gaps: [`${INVALID_REVIEW_GAP} (${clampText(reason, MAX_REVIEW_GAP_LENGTH)})`],
  };
}

function parseReviewObjects(text: string): readonly Record<string, unknown>[] {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)?.[1];
  const candidates = new Set<string>([trimmed]);
  if (fenced !== undefined) candidates.add(fenced);

  const scanStart = Math.max(0, trimmed.length - MAX_JSON_CANDIDATE_LENGTH);
  const starts: number[] = [];
  for (let index = scanStart; index < trimmed.length; index += 1) {
    if (trimmed[index] === '{') starts.push(index);
  }
  for (const start of starts.slice(-MAX_JSON_CANDIDATE_STARTS).toReversed()) {
    const end = findBalancedObjectEnd(trimmed, start);
    if (end !== undefined) candidates.add(trimmed.slice(start, end + 1));
  }

  const parsedObjects: Record<string, unknown>[] = [];
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (isPlainRecord(parsed)) parsedObjects.push(parsed);
    } catch {}
  }
  return parsedObjects;
}

function findBalancedObjectEnd(text: string, start: number): number | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;
  const limit = Math.min(text.length, start + MAX_JSON_CANDIDATE_LENGTH);

  for (let index = start; index < limit; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

function clampText(value: string, maxLength: number): string {
  const normalized = value.replaceAll(/\s+/g, ' ').trim();
  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength);
}

registerScopedService(
  LifecycleScope.Session,
  IGoalCompletionReviewService,
  SessionGoalCompletionReviewService,
  ScopeActivation.OnDemand,
  'goalCompletionReview',
);
