import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**/*', 'node_modules'],
    setupFiles: ['./tests/setup.ts'],
    reporters: process.env.GITHUB_ACTIONS 
      ? ['verbose', 'github-actions'] 
      : ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'tests',
        'dist',
        '*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@assets': path.resolve(__dirname, './client/src/assets'),
      '@db/schema': path.resolve(__dirname, './shared/schema'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
