import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'dev'),
  plugins: [react()],
  resolve: {
    alias: {
      '@elucim/editor': path.resolve(__dirname, 'src/index.ts'),
      '@elucim/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@elucim/dsl': path.resolve(__dirname, '../dsl/src/index.ts'),
    },
  },
  server: {
    port: 5199,
  },
});
