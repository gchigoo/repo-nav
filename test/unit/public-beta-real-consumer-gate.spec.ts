import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  REAL_CONSUMER_CONFIRMATION_PATH_V2,
  REAL_CONSUMER_OWNER_BLOCK_EXIT_V2,
} from '../../testkit/fixtures/release-v2/real-consumer-confirmation-schema-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({
    group: 'public-beta-release',
    caseId: 'real-consumer-read-only',
  }),
)('F9-REAL-MCP-001 real-consumer-read-only', () => {
  it('owner-blocks with exit 2 when confirmation is absent (no stub pass)', () => {
    const confirmationAbs = resolve(root, REAL_CONSUMER_CONFIRMATION_PATH_V2);
    // Do not invent RealConsumerConfirmationV1 for a foreign repo.
    if (existsSync(confirmationAbs)) {
      const r = spawnSync(
        process.execPath,
        [
          resolve(root, 'tools/release/run-real-consumer-e2e.mjs'),
          '--confirmation',
          REAL_CONSUMER_CONFIRMATION_PATH_V2,
        ],
        { cwd: root, encoding: 'utf8', shell: false },
      );
      expect(r.status).toBe(0);
      expect(r.stderr).toBe('');
      const report = JSON.parse(r.stdout) as { ok: boolean };
      expect(report.ok).toBe(true);
      return;
    }

    const missing = `does-not-exist-${process.pid}.json`;
    const r = spawnSync(
      process.execPath,
      [
        resolve(root, 'tools/release/run-real-consumer-e2e.mjs'),
        '--confirmation',
        missing,
      ],
      { cwd: root, encoding: 'utf8', shell: false },
    );
    expect(r.status).toBe(REAL_CONSUMER_OWNER_BLOCK_EXIT_V2);
    expect(r.stdout).toBe('');
    const report = JSON.parse(r.stderr) as {
      ok: boolean;
      residual: string;
      message: string;
      path?: string;
    };
    expect(report).toEqual({
      ok: false,
      residual: 'real-consumer-confirmation-missing',
      message:
        'Owner must supply RealConsumerConfirmationV1; refusing to invent confirmation JSON.',
    });
    expect(r.stderr).not.toContain(missing);
    expect(report.path).toBeUndefined();
  });

  it('keeps the missing-confirmation owner block available without dist', () => {
    const runner = readFileSync(
      resolve(root, 'tools/release/run-real-consumer-e2e.mjs'),
      'utf8',
    );
    const missingBranch = runner.slice(
      runner.indexOf('if (!existsSync(absoluteConfirmation))'),
      runner.indexOf(
        '\ntry {',
        runner.indexOf('const args = process.argv.slice(2)'),
      ),
    );
    expect(missingBranch).not.toContain('reloadLocateResultSchema');
    expect(missingBranch).not.toContain("import('../../dist/");
    expect(runner.slice(0, runner.indexOf('function main'))).not.toContain(
      "from '../../dist/",
    );
    const packageCandidateIndex = runner.indexOf(
      'const candidate = packageCandidate(consumer)',
    );
    const schemaReloadIndex = runner.indexOf(
      'await reloadLocateResultSchema()',
    );
    expect(packageCandidateIndex).toBeGreaterThanOrEqual(0);
    expect(schemaReloadIndex).toBeGreaterThan(packageCandidateIndex);
  });
});
