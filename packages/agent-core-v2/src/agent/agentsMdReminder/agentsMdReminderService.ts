/**
 * `agentsMdReminder` domain (L4) — implementation.
 *
 * Hooks `toolExecutor.onDidExecuteTool`. When a tool touches a directory whose
 * agent file was not part of the injected instructions, appends a one-line
 * reminder to that tool's result.
 *
 * Probing walks from the workspace root down to the touched directory using the
 * same candidate names as the init-time load, so a file the model has already
 * been given is never suggested. Each discovered file is claimed before the
 * reminder is attached, so two tools touching the same new directory in one
 * step produce one reminder rather than two. Bound at Agent scope and gated by
 * the `agents-md-reminder` control, which is off by default.
 */

import { Disposable } from '#/_base/di/lifecycle';
import { LifecycleScope, ScopeActivation, registerScopedService } from '#/_base/di/scope';
import { IFlagService } from '#/app/flag/flag';
import { IAgentToolExecutorService } from '#/agent/toolExecutor/toolExecutor';
import type { ToolDidExecuteContext } from '#/agent/toolExecutor/toolHooks';
import { IHostFileSystem } from '#/os/interface/hostFileSystem';
import { ISessionWorkspaceContext } from '#/session/workspaceContext/workspaceContext';

import { IAgentAgentsMdReminderService } from './agentsMdReminder';
import { AGENTS_MD_REMINDER_FLAG_ID } from './flag';
import { touchedPathForTool } from './touchedPaths';

/** Same candidates the init-time load walks, in the same order. */
const AGENT_FILE_NAMES = ['AGENTS.md', 'agents.md'] as const;

export function buildAgentsMdReminder(paths: readonly string[]): string {
  const list = paths.map((path) => `- ${path}`).join('\n');
  return (
    `\n\n<system-reminder>\nThis directory has instructions you have not read:\n${list}\n` +
    'Read it before making further changes there; it was outside the instruction ' +
    'hierarchy loaded at startup.\n</system-reminder>'
  );
}

export class AgentAgentsMdReminderService
  extends Disposable
  implements IAgentAgentsMdReminderService
{
  declare readonly _serviceBrand: undefined;

  /** Agent files already injected, or already suggested once. */
  private readonly known = new Set<string>();
  /** Directories already probed, so a repeated touch costs no filesystem work. */
  private readonly probed = new Set<string>();

  constructor(
    @IAgentToolExecutorService toolExecutor: IAgentToolExecutorService,
    @IHostFileSystem private readonly fs: IHostFileSystem,
    @ISessionWorkspaceContext private readonly workspace: ISessionWorkspaceContext,
    @IFlagService private readonly flags: IFlagService,
  ) {
    super();
    this._register(
      toolExecutor.hooks.onDidExecuteTool.register('agents-md-reminder', async (ctx, next) => {
        await next();
        if (!this.flags.enabled(AGENTS_MD_REMINDER_FLAG_ID)) return;
        await this.maybeAttach(ctx);
      }),
    );
  }

  seedKnown(paths: Iterable<string>): void {
    for (const path of paths) this.known.add(normalizePath(path));
  }

  private async maybeAttach(ctx: ToolDidExecuteContext): Promise<void> {
    // A vetoed duplicate carries a placeholder result that is swapped for the
    // original's later; attaching here would discard the reminder while the
    // file was already counted as suggested.
    if (ctx.result.isError === true) return;
    const touched = touchedPathForTool(ctx.toolCall.name, ctx.args);
    if (touched === undefined) return;

    const directory = this.directoryOf(touched);
    if (directory === undefined || this.probed.has(directory)) return;
    this.probed.add(directory);

    const discovered = await this.probe(directory);
    if (discovered.length === 0) return;

    const output = typeof ctx.result.output === 'string' ? ctx.result.output : '';
    ctx.result = { ...ctx.result, output: `${output}${buildAgentsMdReminder(discovered)}` };
  }

  /**
   * Agent files between the workspace root and `directory` that were never
   * injected. Claims each before returning it so concurrent calls cannot both
   * report the same file.
   */
  private async probe(directory: string): Promise<string[]> {
    const root = normalizePath(this.workspace.workDir);
    if (!directory.startsWith(root)) return [];

    const found: string[] = [];
    for (const dir of chainFrom(root, directory)) {
      for (const name of AGENT_FILE_NAMES) {
        const candidate = `${dir}/${name}`;
        if (this.known.has(candidate)) continue;
        let text: string;
        try {
          text = await this.fs.readText(candidate);
        } catch {
          continue;
        }
        // Claim before reporting: a blank file is still claimed so it is not
        // re-read on every touch.
        this.known.add(candidate);
        if (text.trim().length > 0) found.push(candidate);
        break;
      }
    }
    return found;
  }

  private directoryOf(touched: string): string | undefined {
    const path = normalizePath(
      touched.startsWith('/') ? touched : `${this.workspace.workDir}/${touched}`,
    );
    // A trailing segment with a dot is treated as a file; anything else is
    // already a directory. Wrong either way only costs one extra probe.
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash <= 0) return undefined;
    const last = path.slice(lastSlash + 1);
    return last.includes('.') ? path.slice(0, lastSlash) : path;
  }
}

function normalizePath(path: string): string {
  const collapsed = path.replaceAll('\\', '/').replaceAll(/\/+/g, '/');
  return collapsed.length > 1 && collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
}

/** Every directory from `root` down to `directory`, inclusive. */
function chainFrom(root: string, directory: string): string[] {
  if (directory === root) return [root];
  const rest = directory.slice(root.length).split('/').filter((part) => part.length > 0);
  const chain = [root];
  let current = root;
  for (const part of rest) {
    current = `${current}/${part}`;
    chain.push(current);
  }
  return chain;
}

registerScopedService(
  LifecycleScope.Agent,
  IAgentAgentsMdReminderService,
  AgentAgentsMdReminderService,
  ScopeActivation.OnScopeCreated,
  'agentsMdReminder',
);
