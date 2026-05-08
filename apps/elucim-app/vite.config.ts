import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@elucim/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@elucim/dsl': resolve(__dirname, '../../packages/dsl/src/index.ts'),
      '@elucim/editor': resolve(__dirname, '../../packages/editor/src/index.ts'),
    },
  },
  server: {
    port: 3300,
    strictPort: true,
  },
  clearScreen: false,
});
