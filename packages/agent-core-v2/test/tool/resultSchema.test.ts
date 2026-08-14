import { describe, expect, it } from 'vitest';

import { SubagentToolInputSchema } from '#/agent/tools/agent/agent';
import {
  buildResultSchemaInstruction,
  extractStructuredResult,
  matchesSchema,
} from '#/agent/tools/agent/resultSchema';
import { AgentSwarmToolInputSchema } from '#/agent/tools/agent-swarm/agent-swarm';

const SCHEMA = {
  type: 'object',
  required: ['file', 'verdict'],
  properties: {
    file: { type: 'string' },
    verdict: { type: 'string' },
    line: { type: 'number' },
  },
} as const satisfies Record<string, unknown>;

describe('structured subagent results', () => {
  it('extracts a bare trailing object', () => {
    const text = 'Reviewed the module.\n\n{"file":"a.ts","verdict":"clean"}';
    expect(extractStructuredResult(text, SCHEMA)).toEqual({
      ok: true,
      value: { file: 'a.ts', verdict: 'clean' },
    });
  });

  it('extracts from a code fence, since models add them despite instructions', () => {
    const text = 'Done.\n```json\n{"file":"a.ts","verdict":"clean"}\n```\nThat is all.';
    expect(extractStructuredResult(text, SCHEMA)).toEqual({
      ok: true,
      value: { file: 'a.ts', verdict: 'clean' },
    });
  });

  it('prefers the newest matching object when prose contains several', () => {
    const text = [
      'First I considered {"file":"draft.ts","verdict":"unsure"} but changed my mind.',
      'Final answer:',
      '{"file":"b.ts","verdict":"broken","line":12}',
    ].join('\n');
    const extracted = extractStructuredResult(text, SCHEMA);
    expect(extracted).toEqual({
      ok: true,
      value: { file: 'b.ts', verdict: 'broken', line: 12 },
    });
  });

  it('handles braces inside JSON strings without losing balance', () => {
    const text = 'Result: {"file":"a{b}.ts","verdict":"has \\"braces\\" }{ inside"}';
    const extracted = extractStructuredResult(text, SCHEMA);
    expect(extracted.ok).toBe(true);
  });

  it('rejects an object missing a required key, naming it', () => {
    const extracted = extractStructuredResult('{"file":"a.ts"}', SCHEMA);
    expect(extracted).toEqual({ ok: false, reason: 'missing required verdict' });
  });

  it('rejects a wrong top-level property type, naming the key', () => {
    expect(matchesSchema({ file: 'a.ts', verdict: 'ok', line: 'twelve' }, SCHEMA)).toBe(
      '"line" should be number',
    );
    expect(matchesSchema(['not', 'an', 'object'], SCHEMA)).toBe('expected a JSON object');
  });

  it('reports plain prose as having no object at all', () => {
    expect(extractStructuredResult('I finished the task successfully.', SCHEMA)).toEqual({
      ok: false,
      reason: 'no JSON object found in the reply',
    });
  });

  it('embeds the schema in the child instruction', () => {
    const instruction = buildResultSchemaInstruction(SCHEMA);
    expect(instruction).toContain(JSON.stringify(SCHEMA));
    expect(instruction).toContain('end your final message with a single JSON object');
  });

  it('is accepted by both tool input schemas', () => {
    const agent = SubagentToolInputSchema.parse({
      prompt: 'review a.ts',
      description: 'Review file',
      result_schema: SCHEMA,
    });
    expect(agent.result_schema).toEqual(SCHEMA);

    const swarm = AgentSwarmToolInputSchema.parse({
      description: 'Review files',
      prompt_template: 'Review {{item}}',
      items: ['a.ts', 'b.ts'],
      result_schema: SCHEMA,
    });
    expect(swarm.result_schema).toEqual(SCHEMA);
  });
});
