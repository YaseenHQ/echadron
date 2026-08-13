/**
 * `tools` domain (L7) — `ReadDocument` implementation.
 *
 * Converts document formats to Markdown through `@firecrawl/anydoc`, a local
 * Rust converter with prebuilt binaries. The import is lazy and failure is
 * reported as a tool error rather than thrown: no prebuild exists for Windows
 * on ARM, and a missing optional platform package must degrade to a clear
 * message instead of breaking the agent.
 *
 * Path access goes through the same workspace resolution as `Read`, so this
 * cannot reach outside the workspace. Bound at Agent scope.
 */

import { registerAgentToolService } from '#/agent/toolRegistry/toolContribution';
import { literalRulePattern } from '#/tool/rule-match';
import { IHostEnvironment } from '#/os/interface/hostEnvironment';
import { resolvePathAccessPath } from '#/tool/path-access';
import { ISessionWorkspaceContext } from '#/session/workspaceContext/workspaceContext';
import { ToolResultBuilder } from '#/tool/result-builder';
import { toInputJsonSchema } from '#/tool/input-schema';
import { ToolAccesses, type ToolExecution } from '#/tool/toolContract';

import DESCRIPTION from './read-document.md?raw';
import {
  IReadDocumentTool,
  ReadDocumentInputSchema,
  READ_DOCUMENT_EXTENSIONS,
  type ReadDocumentInput,
} from './readDocument';

type AnydocModule = {
  toMarkdown: (path: string) => Promise<string>;
  formatFromPath: (path: string) => string | null;
};

let anydoc: Promise<AnydocModule | undefined> | undefined;

/** Loaded once and cached, including the failure, so a missing binary is not retried per call. */
async function loadAnydoc(): Promise<AnydocModule | undefined> {
  anydoc ??= import('@firecrawl/anydoc')
    .then((mod) => mod as unknown as AnydocModule)
    .catch(() => undefined);
  return anydoc;
}

export function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot + 1).toLowerCase();
}

export function isSupportedDocument(path: string): boolean {
  return (READ_DOCUMENT_EXTENSIONS as readonly string[]).includes(extensionOf(path));
}

export class ReadDocumentTool implements IReadDocumentTool {
  declare readonly _serviceBrand: undefined;
  readonly name = 'ReadDocument' as const;
  readonly description = DESCRIPTION;
  readonly parameters: Record<string, unknown> = toInputJsonSchema(ReadDocumentInputSchema);

  constructor(
    @IHostEnvironment private readonly env: IHostEnvironment,
    @ISessionWorkspaceContext private readonly workspaceCtx: ISessionWorkspaceContext,
  ) {}

  resolveExecution(args: ReadDocumentInput): ToolExecution {
    const path = resolvePathAccessPath(args.path, {
      env: this.env,
      workspace: {
        workspaceDir: this.workspaceCtx.workDir,
        additionalDirs: this.workspaceCtx.additionalDirs,
      },
      operation: 'read',
    });

    return {
      accesses: ToolAccesses.readFile(path),
      description: `Reading ${args.path} as Markdown`,
      display: { kind: 'file_io', operation: 'read', path },
      approvalRule: literalRulePattern(this.name, path),
      execute: async () => {
        if (!isSupportedDocument(path)) {
          return {
            isError: true,
            output:
              `ReadDocument does not handle "${extensionOf(path) || 'this file'}". ` +
              `Supported: ${READ_DOCUMENT_EXTENSIONS.join(', ')}. Use Read for text files.`,
          };
        }

        const mod = await loadAnydoc();
        if (mod === undefined) {
          return {
            isError: true,
            output:
              'Document conversion is unavailable on this platform, so this file cannot be read. ' +
              'Ask the user to convert it to Markdown or plain text.',
          };
        }

        let markdown: string;
        try {
          markdown = await mod.toMarkdown(path);
        } catch (error) {
          return {
            isError: true,
            output: `Could not read ${args.path}: ${error instanceof Error ? error.message : String(error)}`,
          };
        }

        const builder = new ToolResultBuilder();
        builder.write(markdown);
        return builder.ok('');
      },
    };
  }
}

registerAgentToolService(IReadDocumentTool, ReadDocumentTool, {
  name: 'ReadDocument',
  domain: 'os/backends',
});
