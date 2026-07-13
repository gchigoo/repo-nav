import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  runLargeSyntheticPerformance,
  writeSyntheticPerformanceReport,
} from '../../testkit/performance/large-synthetic-repository.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'performance',
  caseId: 'large-synthetic-repository',
} as const;

describe.runIf(isSelected(identity))('large synthetic repository', () => {
  it(
    'keeps five real-engine projections stable and records environment-aware timing',
    async () => {
      const repositoryRoot = resolve(import.meta.dirname, '..', '..');
      const fixtureRoot = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-large-synthetic-'),
      );
      const report = await runLargeSyntheticPerformance(
        repositoryRoot,
        fixtureRoot,
      );

      expect(report.runs).toHaveLength(5);
      expect(new Set(report.runs.map(({ projectionHash }) => projectionHash)).size).toBe(1);
      expect(report.cleanup).toEqual({
        attempted: true,
        succeeded: true,
        fixtureRemoved: true,
      });
      expect(report.trend.timingIsBlocking).toBe(false);
      if (process.env['REPO_NAV_REPORT_PERFORMANCE'] === '1') {
        expect(writeSyntheticPerformanceReport(repositoryRoot, report)).toContain(
          'large-synthetic-repository-v1.json',
        );
      }
    },
    120_000,
  );
});
