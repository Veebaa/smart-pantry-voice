import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['client/src/**/*.test.tsx', 'client/src/**/*.test.ts'],
    setupFiles: ['./tests/client-setup.ts'],
    css: true,
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
