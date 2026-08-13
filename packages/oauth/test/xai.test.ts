import { describe, expect, it } from 'vitest';

import { xaiWireTypeForModel } from '../src/xai';

describe('xaiWireTypeForModel', () => {
  it('uses Responses for Grok 4.5, 4.6, and 4.20 snapshots', () => {
    expect(xaiWireTypeForModel('grok-4.5')).toBe('openai_responses');
    expect(xaiWireTypeForModel('grok-4.6')).toBe('openai_responses');
    expect(xaiWireTypeForModel('grok-4.20-0309-reasoning')).toBe('openai_responses');
  });

  it('keeps Chat Completions for older Grok models', () => {
    expect(xaiWireTypeForModel('grok-4')).toBe('openai');
    expect(xaiWireTypeForModel('grok-4.3')).toBe('openai');
    expect(xaiWireTypeForModel('grok-build-0.1')).toBe('openai');
  });
});
