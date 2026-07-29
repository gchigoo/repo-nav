import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  RELEASE_FORBIDDEN_SCRIPT_TOKENS_V2,
  RELEASE_READINESS_PRIVATE_V2,
  RELEASE_READINESS_PUBLISH_V2,
} from '../../testkit/fixtures/release-v2/release-readiness-v2.js';
import { EXPECTED_PACKAGE_VERSION_V2 } from '../../testkit/fixtures/release-v2/version-sources-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'release-readiness' }),
)('F9-RELEASE-001 release-readiness', () => {
  it('keeps private true, publish false, and forbids publish/push/release scripts', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as {
      private: boolean;
      version: string;
      scripts: Record<string, string>;
    };
    expect(pkg.private).toBe(RELEASE_READINESS_PRIVATE_V2);
    expect(pkg.version).toBe(EXPECTED_PACKAGE_VERSION_V2);
    expect(RELEASE_READINESS_PUBLISH_V2).toBe(false);
    const scriptBlob = Object.values(pkg.scripts).join('\n');
    for (const token of RELEASE_FORBIDDEN_SCRIPT_TOKENS_V2) {
      expect(scriptBlob).not.toContain(token);
    }
  });
});
