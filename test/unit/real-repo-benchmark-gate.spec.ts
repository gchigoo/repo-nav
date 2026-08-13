import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  computeRealRepoBenchmarkCatalogSha256,
  RealRepoBenchmarkCatalogSchema,
} from '../../tools/benchmark/real-repo-benchmark-runner.js';
import { SnapshotRevalidationBenchmarkV1Schema } from '../../tools/benchmark/snapshot-revalidation-benchmark.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');
const catalogPath = resolve(
  root,
  'testkit/fixtures/benchmark-repos/catalog.json',
);

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'package-metadata' }),
)('fixture-scenario benchmark gate catalog', () => {
  it('lists at least ten fixture scenarios with required schema fields', () => {
    const raw: unknown = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const catalog = RealRepoBenchmarkCatalogSchema.parse(raw);

    expect(catalog.repos.length).toBeGreaterThanOrEqual(10);
    for (const entry of catalog.repos) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.path.length).toBeGreaterThan(0);
      expect(entry.request.terms.length).toBeGreaterThan(0);
      expect(entry.expectations.minConfirmed).toBeGreaterThanOrEqual(0);
      expect(entry.expectations.maxElapsedMs).toBeGreaterThan(0);
      expect(entry.expectations.forbidPublicAbsolutePath).toBe(true);
    }
  });

  it('binds snapshot benchmark reports to the raw fixture catalog and leaves selection unset', () => {
    const report = SnapshotRevalidationBenchmarkV1Schema.parse({
      schemaVersion: 1,
      catalogSha256: computeRealRepoBenchmarkCatalogSha256(catalogPath),
      environment: {
        runner: 'local',
        nodeMajor: 22,
        platform: 'linux',
        arch: 'x64',
      },
      sampling: {
        warmupRuns: 1,
        measuredRuns: 5,
        quantile: 'nearest-rank',
      },
      policies: [
        {
          policy: 'all-loaded-baseline',
          metadataChecks: 10,
          digestChecks: 10,
          digestBytes: 300,
          eligibleDecisionSafe: true,
        },
        {
          policy: 'retained-digest',
          metadataChecks: 3,
          digestChecks: 3,
          digestBytes: 100,
          eligibleDecisionSafe: false,
        },
        {
          policy: 'conditional-digest',
          metadataChecks: 5,
          digestChecks: 5,
          digestBytes: 200,
          eligibleDecisionSafe: true,
        },
      ].map((row) => ({
        ...row,
        loadedCount: 10,
        retainedCount: 3,
        eligibleCount: 5,
        samplesMicroseconds: [1, 2, 3, 4, 5],
        p50Microseconds: 3,
        p95Microseconds: 5,
      })),
      correctness: [
        'all-loaded-baseline',
        'retained-digest',
        'conditional-digest',
      ].map((policy) => ({
        policy,
        retainedMutationDetected: true,
        eligibleDecisionSafe: policy !== 'retained-digest',
        abortPurged: true,
        unreadablePurged: true,
      })),
      selected: null,
    });

    expect(report.catalogSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(report.selected).toBeNull();
  });
});
