import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@elucim/dsl/agent': resolve(__dirname, '../dsl/src/agent.ts'),
      '@elucim/dsl': resolve(__dirname, '../dsl/src/index.ts'),
      '@elucim/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
