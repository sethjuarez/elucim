import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@elucim/core': resolve(__dirname, '../core/src/index.ts'),
      '@elucim/dsl': resolve(__dirname, '../dsl/src/index.ts'),
      '@elucim/editor': resolve(__dirname, '../editor/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html'),
      },
    },
  },
  server: {
    port: 3100,
  },
});
