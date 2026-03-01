import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@elucim/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
  server: {
    port: 3200,
  },
});
