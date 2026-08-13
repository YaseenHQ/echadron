import { describe, expect, it } from 'vitest';

import {
  activityFaceAnimation,
  activityMoodFor,
  type ActivityMood,
} from '#/tui/utils/activity-face';

const MOODS: readonly ActivityMood[] = [
  'waiting',
  'thinking',
  'composing',
  'tool',
  'awaiting',
  'retry',
];

describe('activity face', () => {
  it('gives every mood a distinct, non-empty animation', () => {
    const keys = new Set<string>();
    for (const mood of MOODS) {
      const animation = activityFaceAnimation(mood);
      expect(animation.key, mood).toBe(mood);
      expect(animation.frames.length, mood).toBeGreaterThan(1);
      expect(animation.intervalMs, mood).toBeGreaterThan(0);
      keys.add(animation.key);
    }
    expect(keys.size).toBe(MOODS.length);
  });

  it('keeps every frame the same width so the line never jitters', () => {
    for (const mood of MOODS) {
      const widths = new Set(
        activityFaceAnimation(mood).frames.map((frame) => Array.from(frame).length),
      );
      expect(widths, mood).toEqual(new Set([3]));
    }
  });

  it('uses only full-height cells, matching the header logo', () => {
    // A foreground-only glyph renders shorter than a background-filled one, so
    // mixing them would make the face look clipped next to the rest of the line.
    for (const mood of MOODS) {
      for (const frame of activityFaceAnimation(mood).frames) {
        expect(frame, mood).toMatch(/^[▛█]{3}$/u);
      }
    }
  });

  it('never leaves the eyes shut for a whole cycle', () => {
    for (const mood of MOODS) {
      const open = activityFaceAnimation(mood).frames.filter((frame) => frame.includes('▛'));
      expect(open.length, mood).toBeGreaterThan(0);
    }
  });

  it('lets a retry outrank the streaming phase underneath it', () => {
    expect(activityMoodFor({ mode: 'thinking', retrying: true })).toBe('retry');
    expect(activityMoodFor({ mode: 'thinking', retrying: false })).toBe('thinking');
    expect(activityMoodFor({ mode: 'awaiting', retrying: false })).toBe('awaiting');
  });

  it('scans while thinking and holds steady while running a tool', () => {
    const thinking = activityFaceAnimation('thinking').frames;
    const tool = activityFaceAnimation('tool').frames;
    // Thinking moves its pupils between cells; tool work only opens and closes.
    expect(new Set(thinking).size).toBeGreaterThan(new Set(tool).size);
    expect(activityFaceAnimation('retry').intervalMs).toBeLessThan(
      activityFaceAnimation('waiting').intervalMs,
    );
  });
});
