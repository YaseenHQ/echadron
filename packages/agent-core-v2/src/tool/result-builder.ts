/**
 * `tool` domain (L3) — buffered tool-result builder.
 *
 * Shared helper for tools that stream text into a bounded output buffer with
 * optional per-line and total-char truncation. Lives in the foundational tool
 * domain so every tool implementation (file, shell, web, …) can build
 * consistently-truncated `ExecutableToolResult`s without depending on a
 * sibling tool domain. Pure helper; no scoped service.
 */

import type { ExecutableToolErrorResult, ExecutableToolSuccessResult } from './toolContract';

const DEFAULT_MAX_CHARS = 50_000;
const DEFAULT_MAX_LINE_LENGTH = 2000;
const TRUNCATION_MARKER = '[...truncated]';
/**
 * How far past `maxChars` the tail buffer may grow before it is compacted.
 * Trades a bounded amount of retained memory for amortised-constant writes.
 */
const TAIL_SLACK_FACTOR = 4;
const TRUNCATION_MESSAGE = 'Output is truncated to fit in the message.';

export interface ToolResultBuilderOptions {
  readonly maxChars?: number;
  readonly maxLineLength?: number | null;
  /** `head` keeps the start of the stream (default). `tail` keeps the end. */
  readonly keep?: 'head' | 'tail';
}

export type ExecutableToolResultBuilderResult = (
  | ExecutableToolErrorResult
  | ExecutableToolSuccessResult
) & {
  readonly output: string;
  readonly truncated: boolean;
  readonly brief?: string;
};

export class ToolResultBuilder {
  private readonly maxChars: number;
  private readonly maxLineLength: number | null;
  private readonly keep: 'head' | 'tail';

  private readonly buffer: string[] = [];
  private nCharsValue = 0;
  private truncationHappened = false;

  constructor(options: ToolResultBuilderOptions = {}) {
    this.maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
    this.maxLineLength =
      options.maxLineLength === undefined ? DEFAULT_MAX_LINE_LENGTH : options.maxLineLength;
    this.keep = options.keep ?? 'head';

    if (this.maxLineLength !== null && this.maxLineLength <= TRUNCATION_MARKER.length) {
      throw new Error('maxLineLength must be greater than the truncation marker length.');
    }
  }

  get nChars(): number {
    return this.nCharsValue;
  }

  get truncated(): boolean {
    return this.truncationHappened;
  }

  write(text: string): number {
    if (this.keep === 'head' && this.nCharsValue >= this.maxChars) {
      if (text.length > 0 && !this.truncationHappened) {
        this.buffer.push(TRUNCATION_MARKER);
        this.nCharsValue += TRUNCATION_MARKER.length;
        this.truncationHappened = true;
      }
      return 0;
    }

    const lines = text.match(/[^\r\n]*(?:\r\n|[\n\r])|[^\r\n]+/g) ?? [];
    if (lines.length === 0) return 0;

    let charsWritten = 0;
    for (const originalLine of lines) {
      if (this.keep === 'head' && this.nCharsValue >= this.maxChars) {
        if (!this.truncationHappened) {
          this.buffer.push(TRUNCATION_MARKER);
          this.nCharsValue += TRUNCATION_MARKER.length;
          this.truncationHappened = true;
        }
        break;
      }

      const remainingChars =
        this.keep === 'tail' ? Number.POSITIVE_INFINITY : this.maxChars - this.nCharsValue;
      const limit =
        this.maxLineLength === null
          ? remainingChars
          : Math.min(remainingChars, this.maxLineLength);
      let line = originalLine;
      if (line.length > limit) {
        const lineBreak = /[\r\n]+$/.exec(line)?.[0] ?? '';
        const suffix = TRUNCATION_MARKER + lineBreak;
        const effectiveMaxLength = Math.max(limit, suffix.length);
        line = line.slice(0, effectiveMaxLength - suffix.length) + suffix;
      }
      if (line !== originalLine) {
        this.truncationHappened = true;
      }

      this.buffer.push(line);
      charsWritten += line.length;
      this.nCharsValue += line.length;
    }

    if (this.keep === 'tail') this.trimToTail();
    return charsWritten;
  }

  /**
   * Collapse the buffer to its trailing `maxChars`.
   *
   * Only runs once the buffer has grown past `TAIL_SLACK_FACTOR × maxChars`,
   * not on every write. Compacting eagerly would join the whole buffer per
   * chunk — O(chunks × maxChars) on exactly the chatty-command case tail mode
   * exists for. The slack bounds retained memory to a small multiple of
   * `maxChars` while making each write amortised O(1).
   */
  private trimToTail(): void {
    if (this.nCharsValue <= this.maxChars) return;
    // Truncation is decided the moment the cap is passed, even though the
    // buffer is not compacted until it reaches the slack threshold. Callers
    // watch `truncated` mid-stream to react (the Bash tool persists the full
    // log and hands the model a retrieval locator), so this flag must not wait
    // for compaction.
    this.truncationHappened = true;
    if (this.nCharsValue <= this.maxChars * TAIL_SLACK_FACTOR) return;
    this.compactTail();
  }

  private compactTail(): void {
    if (this.nCharsValue <= this.maxChars) return;
    this.truncationHappened = true;
    const prefix = `${TRUNCATION_MARKER}\n`;
    const budget = Math.max(0, this.maxChars - prefix.length);
    const joined = this.buffer.join('').slice(-budget);
    this.buffer.length = 0;
    this.buffer.push(prefix, joined);
    this.nCharsValue = prefix.length + joined.length;
  }

  ok(message = '', options: { readonly brief?: string } = {}): ExecutableToolResultBuilderResult {
    // Compact first: emit-time compaction can be what sets `truncationHappened`,
    // and the notice below is derived from it.
    if (this.keep === 'tail') this.compactTail();
    let finalMessage = message;
    if (finalMessage.length > 0 && !finalMessage.endsWith('.')) {
      finalMessage += '.';
    }
    if (this.truncationHappened) {
      finalMessage =
        finalMessage.length === 0 ? TRUNCATION_MESSAGE : `${finalMessage} ${TRUNCATION_MESSAGE}`;
    }

    const output = this.buffer.join('');
    const shouldAppendMessage =
      finalMessage.length > 0 && (this.truncationHappened || output.length === 0);
    return {
      isError: false,
      output: shouldAppendMessage
        ? output.length === 0
          ? finalMessage
          : output.endsWith('\n')
            ? `${output}${finalMessage}`
            : `${output}\n${finalMessage}`
        : output,
      truncated: this.truncationHappened,
      brief: options.brief,
    };
  }

  error(
    message: string,
    options: { readonly brief?: string } = {},
  ): ExecutableToolResultBuilderResult {
    if (this.keep === 'tail') this.compactTail();
    const finalMessage = this.truncationHappened
      ? message.length === 0
        ? TRUNCATION_MESSAGE
        : `${message} ${TRUNCATION_MESSAGE}`
      : message;
    const output = this.buffer.join('');
    return {
      isError: true,
      output:
        finalMessage.length === 0
          ? output
          : output.length === 0
            ? finalMessage
            : output.endsWith('\n')
              ? `${output}${finalMessage}`
              : `${output}\n${finalMessage}`,
      truncated: this.truncationHappened,
      brief: options.brief,
    };
  }
}
