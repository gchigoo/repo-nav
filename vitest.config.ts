import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

const surface = process.env['REPO_NAV_TEST_SURFACE'];

if (surface !== 'unit' && surface !== 'golden' && surface !== 'mcp') {
  throw new Error('REPO_NAV_TEST_SURFACE must be unit, golden, or mcp.');
}

const platformResultPath = process.env['REPO_NAV_PLATFORM_RESULT_PATH'];
const setupFiles =
  platformResultPath !== undefined &&
  platformResultPath.length > 0 &&
  (surface === 'unit' || surface === 'mcp')
    ? [resolve('testkit/testing/platform-contract-setup.ts')]
    : [];

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: [`test/${surface}/**/*.spec.ts`],
    passWithNoTests: false,
    reporters: ['default'],
    setupFiles,
  },
});
