/**
 * The cube's face as the live activity indicator.
 *
 * The welcome header lives in the transcript, so it scrolls away the moment
 * work starts — the idle look/blink/wink there is only ever seen before the
 * first prompt. This is the same character in the one place that stays on
 * screen: the activity line. What it does is a pure function of what the agent
 * is doing, so no new state is introduced.
 *
 * Frames are three cells wide (two eye positions plus a centre) so a glance
 * actually reads at this size, and every cell is a full block for the same
 * reason the header logo is — see `logo-eyes.ts`.
 */

/** What the agent is doing, as far as the face is concerned. */
export type ActivityMood =
  | 'waiting'
  | 'thinking'
  | 'composing'
  | 'tool'
  | 'awaiting'
  | 'retry';

export interface ActivityFaceAnimation {
  /** Identity of the frame set, so re-applying the same mood does not restart it. */
  readonly key: ActivityMood;
  readonly frames: readonly string[];
  readonly intervalMs: number;
}

const OPEN = '▛';
const SHUT = '█';

/** Both eyes open, looking straight ahead. */
const FORWARD = `${OPEN}█${OPEN}`;
/** Eyes closed. */
const CLOSED = `${SHUT}█${SHUT}`;
/** Looking left / right: one pupil slides to the outer cell. */
const LEFT = `${OPEN}██`;
const RIGHT = `██${OPEN}`;

const ANIMATIONS: Record<ActivityMood, ActivityFaceAnimation> = {
  // Idle-ish: mostly forward with an occasional blink, matching the header.
  waiting: {
    key: 'waiting',
    frames: [FORWARD, FORWARD, FORWARD, FORWARD, FORWARD, FORWARD, CLOSED],
    intervalMs: 420,
  },
  // Reading around a problem: the eyes scan.
  thinking: {
    key: 'thinking',
    frames: [FORWARD, LEFT, LEFT, FORWARD, RIGHT, RIGHT],
    intervalMs: 260,
  },
  // Writing: a steady, faster blink — busy but not searching.
  composing: {
    key: 'composing',
    frames: [FORWARD, FORWARD, FORWARD, CLOSED],
    intervalMs: 200,
  },
  // Running something: locked on, eyes half-lidded.
  tool: {
    key: 'tool',
    frames: [FORWARD, FORWARD, CLOSED, CLOSED],
    intervalMs: 300,
  },
  // Waiting on you: looks straight at you and blinks slowly.
  awaiting: {
    key: 'awaiting',
    frames: [FORWARD, FORWARD, FORWARD, FORWARD, FORWARD, FORWARD, FORWARD, CLOSED],
    intervalMs: 500,
  },
  // Something failed and is being retried: darting, unsettled.
  retry: {
    key: 'retry',
    frames: [LEFT, FORWARD, RIGHT, FORWARD],
    intervalMs: 150,
  },
};

export function activityFaceAnimation(mood: ActivityMood): ActivityFaceAnimation {
  return ANIMATIONS[mood];
}

/**
 * Pick the mood from live session state. Ordered by precedence: a retry or a
 * pending approval says more about what is happening than the streaming phase
 * underneath it.
 */
export function activityMoodFor(input: {
  readonly mode: 'waiting' | 'thinking' | 'composing' | 'tool' | 'awaiting';
  readonly retrying: boolean;
}): ActivityMood {
  if (input.retrying) return 'retry';
  return input.mode;
}
