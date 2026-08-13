import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  MIGRATION_FORBIDDEN_PHRASES_V2,
  MIGRATION_REQUIRED_PHRASES_V2,
} from '../../testkit/fixtures/release-v2/migration-v2.js';
import {
  SECURITY_FORBIDDEN_PHRASES_V2,
  SECURITY_REQUIRED_PHRASES_V2,
} from '../../testkit/fixtures/release-v2/security-metadata-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

/**
 * Design assertion owner for F9-SECURITY-001 / F9-MIGRATION-001.
 * Executed via unit surface copy under test/unit for vitest include rules;
 * this file remains the design-table ownership path and must stay in sync.
 */
describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'security-document' }),
)('F9-SECURITY-001 security-document', () => {
  it('keeps SECURITY.md channel truth without SLA or invented contacts', () => {
    const text = readFileSync(resolve(root, 'SECURITY.md'), 'utf8');
    for (const phrase of SECURITY_REQUIRED_PHRASES_V2) {
      expect(text).toContain(phrase);
    }
    for (const phrase of SECURITY_FORBIDDEN_PHRASES_V2) {
      expect(text).not.toContain(phrase);
    }
  });
});

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'migration-document' }),
)('F9-MIGRATION-001 migration-document', () => {
  it('documents v1→v2 contract, Node range, CLI golden removal, and 1.1.0 install text', () => {
    const text = readFileSync(
      resolve(root, 'docs/migration-v1-to-v2.md'),
      'utf8',
    );
    for (const phrase of MIGRATION_REQUIRED_PHRASES_V2) {
      expect(text).toContain(phrase);
    }
    for (const phrase of MIGRATION_FORBIDDEN_PHRASES_V2) {
      expect(text).not.toContain(phrase);
    }
    const requiredInstall = 'npm i -g repo-nav@1.1.0';
    for (const relativePath of [
      'README.md',
      'docs/getting-started-mcp.md',
      'docs/migration-v1-to-v2.md',
    ]) {
      const installText = readFileSync(resolve(root, relativePath), 'utf8');
      expect(installText).toContain(requiredInstall);
      expect(installText).not.toContain('repo-nav@beta');
    }
  });
});
