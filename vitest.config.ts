import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/**/*.ts', 'apps/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@app': path.resolve(__dirname, 'apps/api/src/app'),
      '@workflows': path.resolve(__dirname, 'apps/workflows/src'),
      '@paypal/*': path.resolve(__dirname, 'packages/shared/src'),
    },
  },
});