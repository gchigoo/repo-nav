import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CLI_GOLDEN_REMOVED_MARKER_V2,
  CLI_MAIN_RELATIVE_V2,
} from '../../testkit/fixtures/release-v2/cli-closure-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'cli-runtime-closure' }),
)('F9-CLI-CLOSURE-001 cli-runtime-closure', () => {
  it('places CLI under src/cli and removes public golden command', () => {
    const parser = readFileSync(resolve(root, 'src/cli/parser.ts'), 'utf8');
    expect(parser).toContain(CLI_GOLDEN_REMOVED_MARKER_V2);
    expect(parser).not.toMatch(/kind: 'golden'/u);
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as { bin?: Record<string, string> };
    expect(pkg.bin?.['repo-nav']).toBe(CLI_MAIN_RELATIVE_V2);
    expect(readFileSync(resolve(root, 'src/cli/main.ts'), 'utf8').length).toBeGreaterThan(
      0,
    );
  });
});
