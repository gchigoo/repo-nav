import { defineConfig } from 'vitest/config';

const surface = process.env['REPO_NAV_TEST_SURFACE'];

if (surface !== 'unit' && surface !== 'golden' && surface !== 'mcp') {
  throw new Error('REPO_NAV_TEST_SURFACE must be unit, golden, or mcp.');
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: [`test/${surface}/**/*.spec.ts`],
    passWithNoTests: false,
    reporters: ['default'],
  },
});
