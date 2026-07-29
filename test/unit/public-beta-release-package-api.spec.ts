import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PACKAGE_EXPORT_KEYS_V2 } from '../../testkit/fixtures/release-v2/package-api-snapshot-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'package-api' }),
)('F9-PACKAGE-API-001 package-api', () => {
  it('exposes only root and package.json exports', () => {
    const exports = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ).exports as Record<string, unknown>;
    expect(Object.keys(exports).sort()).toEqual([...PACKAGE_EXPORT_KEYS_V2].sort());
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    expect(index).not.toContain('evidence-redactor');
    expect(index).not.toContain('V2LocateResultProjector');
    expect(index).not.toContain('canonical-locate-executor');
  });
});
