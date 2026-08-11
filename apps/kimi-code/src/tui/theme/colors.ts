/**
 * Color palette definitions for dark and light themes.
 *
 * `darkColors` / `lightColors` are the semantic `ColorPalette` consumed by
 * every UI component via the global Theme singleton. Each token holds its hex
 * value directly — see the per-token docs on `ColorPalette` for what each one
 * controls.
 *
 * Light palette values are tuned for ≥ 4.5:1 contrast against #FFFFFF
 * for text tokens and ≥ 3:1 for chrome (border / large text), matching
 * WCAG AA.
 */

// Each token below documents where it is actually consumed, so theme authors
// know what changing it affects. "Widely" means the token is read across most
// dialogs/messages rather than in one specific place.
export interface ColorPalette {
  // ── Brand ──
  /** Dominant interactive/identity tone: links & inline code, the selected item
   *  in nearly every dialog, the focused editor border, plan/"running" badges,
   *  spinners. The most widely used token. */
  primary: string;
  /** Secondary identity tone: approval "▶" prefix, device-code box, image
   *  placeholder, BTW / queue panes, custom-registry import. */
  accent: string;

  // ── Text ──
  /** Default body text: dialog bodies, todo titles, footer model label,
   *  markdown headings, tool/read output, and assistant-side message bullets
   *  (assistant / tool / agent / read) plus markdown list bullets. */
  text: string;
  /** Emphasised / bold text: input dialogs, status messages. */
  textStrong: string;
  /** Secondary, dimmed text (the most widely used dim shade): thinking blocks,
   *  hints, descriptions, completed todos, markdown quotes, and the footer
   *  status bar (cwd path, git badge). */
  textDim: string;
  /** Faintest text: counters, scroll info, descriptions, markdown link URLs,
   *  code-block borders. */
  textMuted: string;

  // ── Surface ──
  /** Borders: pane & editor borders, markdown horizontal rule. */
  border: string;
  /** Focus / attention border — currently only the approval panel. */
  borderFocus: string;

  // ── State ──
  /** Success: ✓ marks, "enabled", completed states. */
  success: string;
  /** Warning: auto/yolo badges, stale markers, plan-mode hint. */
  warning: string;
  /** Error: error messages, failed tool output. */
  error: string;

  // ── Diff (all consumed by components/media/diff-preview.ts) ──
  /** Added lines. */
  diffAdded: string;
  /** Removed lines. */
  diffRemoved: string;
  /** Added lines — intra-line changed words (bold). */
  diffAddedStrong: string;
  /** Removed lines — intra-line changed words (bold). */
  diffRemovedStrong: string;
  /** Line-number gutter (also approval panel/preview). */
  diffGutter: string;
  /** Meta / hunk headers. */
  diffMeta: string;

  // ── Roles ──
  /** User message: bullet & text, skill-activation name. Built-in themes keep
   *  this monochrome; custom themes may use a distinct hue. */
  roleUser: string;

  // ── Shell mode ──
  /** Shell mode (`!`): the `!` prompt symbol, bash-mode editor border, and the
   *  echoed `$ command` line. Built-in themes distinguish it tonally from
   *  plan mode and the user role rather than assigning another brand hue. */
  shellMode: string;
}

export const darkColors: ColorPalette = {
  // Echadron's identity is monochrome. Keep colour for operational meaning
  // (status and diffs), not navigation, roles, or modes.
  primary: '#E4E4E4',
  accent: '#B8B8B8',

  text: '#E4E4E4',
  textStrong: '#F4F4F4',
  textDim: '#A0A0A0',
  textMuted: '#858585',

  border: '#646464',
  borderFocus: '#D0D0D0',

  success: '#3FA266',
  warning: '#D6A55D',
  error: '#D74A6A',

  diffAdded: '#3FA266',
  diffRemoved: '#D74A6A',
  diffAddedStrong: '#70B489',
  diffRemovedStrong: '#ED7890',
  diffGutter: '#858585',
  diffMeta: '#A0A0A0',

  roleUser: '#D0D0D0',
  shellMode: '#B0B0B0',
};

export const lightColors: ColorPalette = {
  primary: '#202020',
  accent: '#4B4B4B',

  text: '#1A1A1A',
  textStrong: '#0A0A0A',
  textDim: '#4A4A4A',
  textMuted: '#5F5F5F',

  border: '#737373',
  borderFocus: '#303030',

  success: '#0E7A38',
  warning: '#92660A',
  error: '#B91C1C',

  diffAdded: '#0E7A38',
  diffRemoved: '#B91C1C',
  diffAddedStrong: '#0E7A38',
  diffRemovedStrong: '#B91C1C',
  diffGutter: '#737373',
  diffMeta: '#5F5F5F',

  roleUser: '#363636',
  shellMode: '#565656',
};

export type ResolvedTheme = 'dark' | 'light';

/** Synchronous palette lookup for built-in themes only. */
export function getBuiltInPalette(resolved: ResolvedTheme): ColorPalette {
  return resolved === 'dark' ? darkColors : lightColors;
}
