import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { INSTALL_PACKAGE_MANAGER_V2 } from '../../testkit/fixtures/release-v2/package-install-v2.js';
import { isExplicitlySelected } from '../../testkit/testing/selection.js';
import { readFileSync } from 'node:fs';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isExplicitlySelected({
    group: 'public-beta-release',
    caseId: 'installed-closure',
  }),
)('F9-INSTALL-001 installed-closure', () => {
  it('runs verify-installed-closure against the fresh consumer graph', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as { packageManager?: string };
    expect(pkg.packageManager).toBe(INSTALL_PACKAGE_MANAGER_V2);
    const r = spawnSync(
      process.execPath,
      [resolve(root, 'tools/release/verify-installed-closure.mjs')],
      { cwd: root, encoding: 'utf8', shell: false },
    );
    expect(r.status).toBe(0);
    const report = JSON.parse(r.stdout) as {
      ok: boolean;
      candidate: { tarballSha256: string };
      nodeCount: number;
      edgeCount: number;
      authority: string;
    };
    expect(report.ok).toBe(true);
    expect(report.candidate.tarballSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(report.nodeCount).toBeGreaterThan(0);
    expect(report.edgeCount).toBeGreaterThanOrEqual(0);
    expect(report.authority).toBe(
      'exact-packed-candidate+immutable-copy+fresh-consumer-package-lock+npm-ls',
    );
  }, 120_000);
});
