/**
 * `agentsMdReminder` domain (L4) — which directory a tool call touched.
 *
 * Pure argument inspection, deliberately conservative: a wrong answer costs a
 * pointless probe or a missed reminder, so anything ambiguous returns nothing
 * rather than guessing. Bash is handled by its own module, since extracting
 * operands from a command line needs the parser.
 */

/** Tools whose first path-like argument names the file or directory touched. */
const PATH_ARG_TOOLS = new Set(['Read', 'Edit', 'Write', 'ReadMediaFile']);
/** Tools that search under a root. */
const SEARCH_ROOT_TOOLS = new Set(['Glob', 'Grep']);

function firstString(args: unknown, keys: readonly string[]): string | undefined {
  if (args === null || typeof args !== 'object') return undefined;
  const record = args as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

/**
 * The path a tool call reached for, or undefined when the tool does not touch
 * the filesystem or the argument is not a plain path.
 */
export function touchedPathForTool(toolName: string, args: unknown): string | undefined {
  if (PATH_ARG_TOOLS.has(toolName)) {
    return firstString(args, ['path', 'file_path', 'filePath']);
  }
  if (SEARCH_ROOT_TOOLS.has(toolName)) {
    // `path` is the search root; a bare pattern with no root stays in cwd,
    // which the initial load already covered.
    return firstString(args, ['path', 'dir', 'directory']);
  }
  return undefined;
}
