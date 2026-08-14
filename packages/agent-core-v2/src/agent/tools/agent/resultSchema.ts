/**
 * `tools` domain (L7) — structured subagent results.
 *
 * A subagent's result is prose, so a parent fanning out over many children gets
 * back a pile of paragraphs it has to re-read, and no child can build on
 * another's findings. `result_schema` asks the child to finish with a JSON
 * object of a given shape; the parent then merges typed values instead of
 * summaries, which is what makes a second round able to use the first.
 *
 * Extraction is deliberately forgiving — models wrap JSON in prose or a code
 * fence — but validation is not: a value that does not match the requested
 * shape is reported as such rather than passed off as structured.
 */

const MAX_CANDIDATE_STARTS = 64;
const MAX_CANDIDATE_LENGTH = 64 * 1024;

export interface StructuredResult {
  readonly ok: true;
  readonly value: unknown;
}

export interface StructuredResultFailure {
  readonly ok: false;
  readonly reason: string;
}

export function buildResultSchemaInstruction(schema: Record<string, unknown>): string {
  return [
    '',
    'When you are done, end your final message with a single JSON object matching this schema:',
    JSON.stringify(schema),
    'Return the object itself — no code fence, no commentary after it. Anything you want the',
    'caller to act on must be inside the object; text outside it is not read.',
  ].join('\n');
}

/** Every JSON object embedded in `text`, newest-looking first. */
function candidateObjects(text: string): unknown[] {
  const trimmed = text.trim();
  const candidates = new Set<string>([trimmed]);
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  for (const match of trimmed.matchAll(fenced)) {
    if (match[1] !== undefined) candidates.add(match[1]);
  }

  const scanStart = Math.max(0, trimmed.length - MAX_CANDIDATE_LENGTH);
  const starts: number[] = [];
  for (let index = scanStart; index < trimmed.length; index += 1) {
    if (trimmed[index] === '{') starts.push(index);
  }
  for (const start of starts.slice(-MAX_CANDIDATE_STARTS).toReversed()) {
    const end = balancedEnd(trimmed, start);
    if (end !== undefined) candidates.add(trimmed.slice(start, end + 1));
  }

  const parsed: unknown[] = [];
  for (const candidate of candidates) {
    try {
      parsed.push(JSON.parse(candidate));
    } catch {}
  }
  return parsed;
}

function balancedEnd(text: string, start: number): number | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;
  const limit = Math.min(text.length, start + MAX_CANDIDATE_LENGTH);
  for (let index = start; index < limit; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

/**
 * Shape check against the requested JSON Schema. Covers the subset models
 * actually produce — object type, required keys, and top-level property types
 * — rather than pretending to be a full validator: the goal is to reject a
 * result the parent cannot use, not to certify the schema.
 */
export function matchesSchema(value: unknown, schema: Record<string, unknown>): string | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return 'expected a JSON object';
  }
  const record = value as Record<string, unknown>;

  const required = schema['required'];
  if (Array.isArray(required)) {
    const missing = required.filter(
      (key) => typeof key === 'string' && record[key] === undefined,
    );
    if (missing.length > 0) return `missing required ${missing.join(', ')}`;
  }

  const properties = schema['properties'];
  if (properties !== null && typeof properties === 'object') {
    for (const [key, spec] of Object.entries(properties as Record<string, unknown>)) {
      const actual = record[key];
      if (actual === undefined) continue;
      if (spec === null || typeof spec !== 'object') continue;
      const expected = (spec as Record<string, unknown>)['type'];
      if (typeof expected !== 'string') continue;
      if (!isType(actual, expected)) return `"${key}" should be ${expected}`;
    }
  }
  return undefined;
}

function isType(value: unknown, expected: string): boolean {
  switch (expected) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'number':
    case 'integer':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return true;
  }
}

export function extractStructuredResult(
  text: string,
  schema: Record<string, unknown>,
): StructuredResult | StructuredResultFailure {
  let lastReason = 'no JSON object found in the reply';
  for (const candidate of candidateObjects(text)) {
    const problem = matchesSchema(candidate, schema);
    if (problem === undefined) return { ok: true, value: candidate };
    lastReason = problem;
  }
  return { ok: false, reason: lastReason };
}
