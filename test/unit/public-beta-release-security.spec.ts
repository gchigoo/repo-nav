import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AUDIT_MAX_CRITICAL_V2,
  AUDIT_MAX_HIGH_V2,
  SBOM_SPEC_VERSION_V2,
} from '../../testkit/fixtures/release-v2/dependency-closure-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'installed-audit' }),
)('F9-AUDIT-001 installed-audit', () => {
  it(
    'runs audit-installed-closure with high/critical zero',
    () => {
      const r = spawnSync(
        process.execPath,
        [resolve(root, 'tools/release/audit-installed-closure.mjs')],
        { cwd: root, encoding: 'utf8', shell: false },
      );
      expect(r.status).toBe(0);
      const report = JSON.parse(r.stdout) as {
        ok: boolean;
        high: number;
        critical: number;
      };
      expect(report.ok).toBe(true);
      expect(report.high).toBe(AUDIT_MAX_HIGH_V2);
      expect(report.critical).toBe(AUDIT_MAX_CRITICAL_V2);
    },
    120_000,
  );
});

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'installed-sbom' }),
)('F9-SBOM-001 installed-sbom', () => {
  it(
    'runs verify-installed-sbom against canonical shrinkwrap graph',
    () => {
      const r = spawnSync(
        process.execPath,
        [resolve(root, 'tools/release/verify-installed-sbom.mjs')],
        { cwd: root, encoding: 'utf8', shell: false },
      );
      expect(r.status).toBe(0);
      const report = JSON.parse(r.stdout) as {
        ok: boolean;
        specVersion: string;
        componentCount: number;
        edgeCount: number;
      };
      expect(report.ok).toBe(true);
      expect(report.specVersion).toBe(SBOM_SPEC_VERSION_V2);
      expect(report.componentCount).toBeGreaterThan(0);
      expect(report.edgeCount).toBeGreaterThanOrEqual(0);
    },
    120_000,
  );
});
