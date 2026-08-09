import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'acp-server',
    include: ['test/**/*.test.ts'],
  },
});
