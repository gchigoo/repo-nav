import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PINNED_QUALITY_DEVDEPS_V2 } from '../../testkit/fixtures/release-v2/quality-config-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'quality-gates' }),
)('F9-QUALITY-001 quality-gates', () => {
  it('pins eslint/prettier and keeps lint/format fail-closed scripts', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    for (const [name, version] of Object.entries(PINNED_QUALITY_DEVDEPS_V2)) {
      expect(pkg.devDependencies[name]).toBe(version);
    }
    expect(pkg.scripts.lint).toContain('--max-warnings=0');
    expect(pkg.scripts['format:check']).toContain('prettier --check');
    expect(existsSync(resolve(root, 'eslint.config.mjs'))).toBe(true);
    expect(existsSync(resolve(root, '.prettierrc.json'))).toBe(true);
  });
});
