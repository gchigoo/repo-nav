import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/integration/codegraph-live-smoke.spec.ts'],
    passWithNoTests: false,
    reporters: ['default'],
    testTimeout: 90_000,
  },
});
