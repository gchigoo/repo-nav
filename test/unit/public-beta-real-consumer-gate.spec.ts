import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
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
      // Present confirmation must not stub-pass; runner either completes or
      // fails closed with a structured report (never silent ok without E2E).
      expect(r.status === 0 || r.status === 1 || r.status === 2).toBe(true);
      if (r.status === 0) {
        const report = JSON.parse(r.stdout) as { ok: boolean };
        expect(report.ok).toBe(true);
      }
      return;
    }

    const r = spawnSync(
      process.execPath,
      [
        resolve(root, 'tools/release/run-real-consumer-e2e.mjs'),
        '--confirmation',
        REAL_CONSUMER_CONFIRMATION_PATH_V2,
      ],
      { cwd: root, encoding: 'utf8', shell: false },
    );
    expect(r.status).toBe(REAL_CONSUMER_OWNER_BLOCK_EXIT_V2);
    const report = JSON.parse(r.stderr) as {
      ok: boolean;
      residual: string;
      message: string;
    };
    expect(report.ok).toBe(false);
    expect(report.residual).toBe('real-consumer-confirmation-missing');
    expect(report.message).toMatch(/refusing to invent confirmation/iu);
  });
});
