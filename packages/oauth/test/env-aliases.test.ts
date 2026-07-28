import { describe, expect, it } from 'vitest';

import {
  applyEchadronEnvironmentAliases,
  ECHADRON_HOME_ENV,
} from '../src/env-aliases';

describe('Echadron environment aliases', () => {
  it('maps new names to legacy consumers', () => {
    const env: NodeJS.ProcessEnv = {
      ECHADRON_MODEL_NAME: 'qwen3.5',
      ECHADRON_HOME: '/tmp/echadron',
    };

    applyEchadronEnvironmentAliases(env);

    expect(env['KIMI_MODEL_NAME']).toBe('qwen3.5');
    expect(env[ECHADRON_HOME_ENV]).toBe('/tmp/echadron');
    expect(env['IMPERIUM_HOME']).toBe('/tmp/echadron');
    expect(env['KIMI_CODE_HOME']).toBe('/tmp/echadron');
  });

  it('maps legacy names to the new spelling without overwriting Echadron', () => {
    const env: NodeJS.ProcessEnv = {
      KIMI_MODEL_NAME: 'legacy-model',
      KIMI_CODE_HOME: '/tmp/legacy',
      ECHADRON_MODEL_NAME: 'echadron-model',
    };

    applyEchadronEnvironmentAliases(env);

    expect(env['ECHADRON_MODEL_NAME']).toBe('echadron-model');
    expect(env['ECHADRON_CODE_HOME']).toBe('/tmp/legacy');
    expect(env[ECHADRON_HOME_ENV]).toBe('/tmp/legacy');
    expect(env['KIMI_MODEL_NAME']).toBe('legacy-model');
  });
});
