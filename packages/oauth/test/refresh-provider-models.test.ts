import { afterEach, describe, expect, it, vi } from 'vitest';

import { refreshProviderModels, type RefreshProviderHost } from '../src/refreshProviderModels';
import type { ManagedKimiConfigShape } from '../src/managed-kimi-code';

const SOURCE = {
  kind: 'modelsDev' as const,
  url: 'https://models.dev/api.json',
  catalogId: 'zai-coding-plan',
};

const CATALOG = {
  'zai-coding-plan': {
    id: 'zai-coding-plan',
    name: 'Z.AI Coding Plan',
    npm: '@ai-sdk/openai-compatible',
    api: 'https://api.z.ai/api/coding/paas/v4',
    models: {
      'glm-5.2': {
        id: 'glm-5.2',
        name: 'GLM-5.2',
        reasoning: true,
        reasoning_options: [{ type: 'effort', values: ['high', 'max'] }],
        tool_call: true,
        modalities: { input: ['text'], output: ['text'] },
        limit: { context: 1_000_000, output: 131_072 },
      },
      'glm-5.3': {
        id: 'glm-5.3',
        name: 'GLM-5.3',
        reasoning: true,
        reasoning_options: [{ type: 'effort', values: ['low', 'high', 'max'] }],
        tool_call: true,
        interleaved: { field: 'reasoning_content' },
        modalities: { input: ['text'], output: ['text'] },
        limit: { context: 1_000_000, output: 131_072 },
      },
    },
  },
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function makeHost(initial: ManagedKimiConfigShape): {
  readonly host: RefreshProviderHost;
  getConfig(): ManagedKimiConfigShape;
  readonly removeCalls: string[];
} {
  let config = clone(initial);
  const removeCalls: string[] = [];
  const host: RefreshProviderHost = {
    getConfig: async () => clone(config),
    removeProvider: async (providerId) => {
      removeCalls.push(providerId);
      return clone(config);
    },
    setConfig: async (patch) => {
      config = {
        ...config,
        ...clone(patch),
        providers: clone(patch.providers),
        models: patch.models === undefined ? config.models : clone(patch.models),
      };
      return clone(config);
    },
    resolveOAuthToken: async () => {
      throw new Error('OAuth should not be consulted for an API-key provider.');
    },
    userAgent: 'echadron-test',
  };
  return {
    host,
    getConfig: () => clone(config),
    removeCalls,
  };
}

describe('refreshProviderModels models.dev providers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds newly published models and refreshes metadata without replacing credentials', async () => {
    const initial: ManagedKimiConfigShape = {
      providers: {
        'zai-coding-plan': {
          type: 'openai',
          baseUrl: 'https://api.z.ai/api/coding/paas/v4',
          apiKey: 'keep-this-secret',
          source: SOURCE,
        },
      },
      models: {
        'zai-coding-plan/glm-5.2': {
          provider: 'zai-coding-plan',
          model: 'glm-5.2',
          maxContextSize: 204_800,
          capabilities: ['thinking'],
          overrides: { maxContextSize: 123_456 },
          customField: 'preserve-me',
        },
        'zai-coding-plan/retired-model': {
          provider: 'zai-coding-plan',
          model: 'retired-model',
          maxContextSize: 10_000,
        },
      },
      defaultModel: 'zai-coding-plan/glm-5.2',
      thinking: { enabled: true },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(CATALOG), { status: 200 })),
    );
    const fixture = makeHost(initial);

    const result = await refreshProviderModels(fixture.host);
    const next = fixture.getConfig();

    expect(result).toEqual({
      changed: [
        {
          providerId: 'zai-coding-plan',
          providerName: 'zai-coding-plan',
          added: 1,
          removed: 1,
        },
      ],
      unchanged: [],
      failed: [],
    });
    expect(fixture.removeCalls).toEqual(['zai-coding-plan']);
    expect(next.providers['zai-coding-plan']).toEqual(initial.providers['zai-coding-plan']);
    expect(next.defaultModel).toBe(initial.defaultModel);
    expect(next.thinking).toEqual(initial.thinking);
    expect(next.models?.['zai-coding-plan/retired-model']).toBeUndefined();

    const refreshed = next.models?.['zai-coding-plan/glm-5.2'];
    expect(refreshed).toMatchObject({
      model: 'glm-5.2',
      maxContextSize: 1_000_000,
      maxOutputSize: 131_072,
      supportEfforts: ['high', 'max'],
      customField: 'preserve-me',
      overrides: { maxContextSize: 123_456 },
    });
    expect(next.models?.['zai-coding-plan/glm-5.3']).toMatchObject({
      model: 'glm-5.3',
      maxContextSize: 1_000_000,
      maxOutputSize: 131_072,
      supportEfforts: ['low', 'high', 'max'],
      reasoningKey: 'reasoning_content',
    });
  });

  it('fetches a shared catalog URL once for multiple existing providers', async () => {
    const secondSource = { ...SOURCE, catalogId: 'zai-coding-plan' };
    const initial: ManagedKimiConfigShape = {
      providers: {
        first: { type: 'openai', apiKey: 'first-key', source: SOURCE },
        second: { type: 'openai', apiKey: 'second-key', source: secondSource },
      },
      models: {
        'first/glm-5.2': { provider: 'first', model: 'glm-5.2', maxContextSize: 1 },
        'second/glm-5.2': { provider: 'second', model: 'glm-5.2', maxContextSize: 1 },
      },
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(CATALOG), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const fixture = makeHost(initial);

    const result = await refreshProviderModels(fixture.host);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.changed).toHaveLength(2);
    expect(fixture.getConfig().models?.['first/glm-5.3']).toBeDefined();
    expect(fixture.getConfig().models?.['second/glm-5.3']).toBeDefined();
  });

  it('leaves the saved provider untouched when its catalog entry disappears', async () => {
    const initial: ManagedKimiConfigShape = {
      providers: {
        'zai-coding-plan': {
          type: 'openai',
          apiKey: 'keep-this-secret',
          source: SOURCE,
        },
      },
      models: {
        'zai-coding-plan/glm-5.2': {
          provider: 'zai-coding-plan',
          model: 'glm-5.2',
          maxContextSize: 1_000_000,
        },
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
    );
    const fixture = makeHost(initial);

    const result = await refreshProviderModels(fixture.host);

    expect(result.changed).toEqual([]);
    expect(result.failed).toEqual([
      {
        provider: 'zai-coding-plan',
        reason: 'models.dev catalog does not contain provider zai-coding-plan',
      },
    ]);
    expect(fixture.removeCalls).toEqual([]);
    expect(fixture.getConfig()).toEqual(initial);
  });
});
