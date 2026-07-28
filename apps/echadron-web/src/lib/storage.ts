// apps/echadron-web/src/lib/storage.ts
// Thin, safe wrapper over localStorage: raw read/write/remove plus JSON
// helpers, each guarded with try/catch. No validation, clamping, or enum
// checks here — those stay at call sites. Read helpers return null when the
// key is missing or storage is unavailable, so callers decide their own
// fallback. Centralizes the persisted key strings so each key has a single
// source of truth.

export const STORAGE_KEYS = {
  // useEchadronWebClient
  permission: 'echadron-web.permission',
  activeWorkspace: 'echadron-active-workspace',
  planMode: 'echadron-web.plan-mode',
  swarmMode: 'echadron-web.swarm-mode',
  goalMode: 'echadron-web.goal-mode',
  uiFontSize: 'echadron-web.ui-font-size',
  starredModels: 'echadron-web.starred-models',
  unread: 'echadron-web.unread',
  onboarded: 'echadron-web.onboarded',
  accent: 'echadron-web.accent',
  colorScheme: 'echadron-web.color-scheme',
  hiddenWorkspaces: 'echadron-web.hidden-workspaces',
  collapsedWorkspaces: 'echadron-web.collapsed-workspaces',
  workspaceOrder: 'echadron-web.workspace-order',
  workspaceNameOverrides: 'echadron-web.workspace-name-overrides',
  workspaceSort: 'echadron-web.workspace-sort',
  // Conversation outline (TOC). The value keeps the legacy `beta-toc` name so
  // users who explicitly turned it off while it was experimental keep their
  // preference after it became on-by-default.
  conversationToc: 'echadron-web.beta-toc',
  notifyOnComplete: 'echadron-web.notify-on-complete',
  notifyOnQuestion: 'echadron-web.notify-on-question',
  notifyOnApproval: 'echadron-web.notify-on-approval',
  soundOnComplete: 'echadron-web.sound-on-complete',
  inputHistory: 'echadron-web.input-history',
  // cross-file
  locale: 'echadron-locale',
  clientId: 'echadron-web.client-id',
  debug: 'echadron-web.debug',
  openInLastTarget: 'echadron-web.open-in.last-target',
  sidebarCollapsed: 'echadron-web.sidebar-collapsed',
  sidebarWidth: 'echadron-web.sidebar-width',
  // deprecated cleanups (kept so the removals still fire for old users)
  codeFont: 'echadron-web.code-font',
  contentAlign: 'echadron-web.content-align',
  theme: 'echadron-web.theme',
  thinking: 'echadron-web.thinking',
} as const;

/**
 * Resolve the browser's pre-Echadron storage namespace during migration.
 * Reads are compatibility-only; all writes use the canonical Echadron key.
 */
function legacyStorageKey(key: string): string | undefined {
  if (key.startsWith('echadron-web.')) return key.replace(/^echadron-web\./, 'kimi-web.');
  if (key === 'echadron-active-workspace') return 'kimi-active-workspace';
  if (key === 'echadron-locale') return 'kimi-locale';
  return undefined;
}

/** Per-session composer draft key. */
export function draftStorageKey(sid: string | undefined): string {
  return `echadron-web.draft.${sid && sid.length > 0 ? sid : '__new__'}`;
}

export function safeGetString(key: string): string | null {
  try {
    const current = globalThis.localStorage.getItem(key);
    if (current !== null) return current;
    const legacy = legacyStorageKey(key);
    if (legacy === undefined) return null;
    const migrated = globalThis.localStorage.getItem(legacy);
    if (migrated !== null) {
      globalThis.localStorage.setItem(key, migrated);
    }
    return migrated;
  } catch {
    return null;
  }
}

export function safeSetString(key: string, value: string): void {
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode, quota, etc.) — ignore
  }
}

export function safeRemove(key: string): void {
  try {
    globalThis.localStorage.removeItem(key);
    const legacy = legacyStorageKey(key);
    if (legacy !== undefined) globalThis.localStorage.removeItem(legacy);
  } catch {
    // ignore
  }
}

export function safeGetJson<T>(key: string): T | null {
  const raw = safeGetString(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function safeSetJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/**
 * Per-session unread flags: a session id is "unread" when its value is `true`.
 * Persisted as a compact map of only the `true` entries (cleared sessions are
 * dropped). Backed by a single localStorage key so the sidebar's unread dots
 * survive a page refresh — there is no server-side read cursor.
 */
export function loadUnread(): Record<string, boolean> {
  const raw = safeGetString(STORAGE_KEYS.unread);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, boolean> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === true) out[id] = true;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Apply a partial set of unread changes on top of the latest stored value.
 * Passing only the changed entries (rather than a full in-memory map) is what
 * keeps a clear that landed from another tab from being overwritten by this
 * tab's stale state. A `true` entry marks the session unread; a `false` entry
 * deletes the key (clearing the unread dot).
 */
export function saveUnread(changes: Record<string, boolean>): void {
  const current = loadUnread();
  const merged: Record<string, boolean> = { ...current };
  for (const [id, value] of Object.entries(changes)) {
    if (value) merged[id] = true;
    else delete merged[id];
  }
  safeSetString(STORAGE_KEYS.unread, JSON.stringify(merged));
}

/**
 * Collapsed workspace ids in the sidebar. Persisted as a JSON array of ids so
 * the fold state of each workspace group survives a page refresh. There is no
 * server-side source of truth for this UI-only state.
 */
export function loadCollapsedWorkspaces(): string[] {
  const parsed = safeGetJson<unknown>(STORAGE_KEYS.collapsedWorkspaces);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((id): id is string => typeof id === 'string');
}

export function saveCollapsedWorkspaces(ids: Iterable<string>): void {
  safeSetJson(STORAGE_KEYS.collapsedWorkspaces, Array.from(ids));
}

/**
 * Display order of workspace ids in the sidebar. Persisted as a JSON array so
 * the user can drag workspaces into a custom order that survives a page
 * refresh. There is no server-side source of truth for this UI-only ordering;
 * workspaces absent from the list are treated as "not yet placed" and inserted
 * by the caller (newest first).
 */
export function loadWorkspaceOrder(): string[] {
  const parsed = safeGetJson<unknown>(STORAGE_KEYS.workspaceOrder);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((id): id is string => typeof id === 'string');
}

export function saveWorkspaceOrder(ids: Iterable<string>): void {
  safeSetJson(STORAGE_KEYS.workspaceOrder, Array.from(ids));
}

/**
 * Local display-name overrides for workspaces the daemon cannot rename — today
 * that is derived workspaces (a cwd with sessions that was never explicitly
 * registered), which `PATCH /workspaces/:id` rejects with 404. Keyed by
 * workspace root (stable across the derived → registered transition) and
 * applied on top of the daemon list so the rename survives a refresh. Cleared
 * once the daemon accepts a rename for that root.
 */
export function loadWorkspaceNameOverrides(): Record<string, string> {
  const parsed = safeGetJson<unknown>(STORAGE_KEYS.workspaceNameOverrides);
  if (!parsed || typeof parsed !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [root, name] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof name === 'string') out[root] = name;
  }
  return out;
}

export function saveWorkspaceNameOverrides(overrides: Record<string, string>): void {
  safeSetJson(STORAGE_KEYS.workspaceNameOverrides, overrides);
}

/**
 * Sidebar workspace sort mode preference (`'manual'` or `'recent'`). Stored as
 * a raw string with no enum check here — the call site narrows it to
 * `WorkspaceSortMode`. Returns null when unset or storage is unavailable.
 */
export function loadWorkspaceSort(): string | null {
  return safeGetString(STORAGE_KEYS.workspaceSort);
}

export function saveWorkspaceSort(mode: string): void {
  safeSetString(STORAGE_KEYS.workspaceSort, mode);
}
