import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  computeRealRepoBenchmarkCatalogSha256,
  RealRepoBenchmarkCatalogSchema,
} from '../../tools/benchmark/real-repo-benchmark-runner.js';
import {
  CODEGRAPH_DIFFERENTIAL_CASES,
  evaluateCodeGraphDifferential,
  passesCodeGraphNonRegressionContract,
} from '../../tools/benchmark/codegraph-differential-quality-gate.js';
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

describe('CodeGraph differential quality metrics', () => {
  it('keeps the nightly gate pinned, indexed for every language, and fail-closed', () => {
    const workflow = readFileSync(
      resolve(root, '.github/workflows/nightly-real-repo-benchmark.yml'),
      'utf8',
    );
    expect(workflow).toContain('@colbymchenry/codegraph@1.5.0');
    for (const language of ['typescript', 'javascript', 'python', 'go']) {
      expect(workflow).toContain(
        `codegraph init testkit/fixtures/codegraph-differential/${language}`,
      );
    }
    expect(workflow).toContain("REPO_NAV_REQUIRE_CODEGRAPH_DIFFERENTIAL: '1'");
    expect(workflow).toContain('npm run benchmark:quality-gate');
  });

  it('covers real TypeScript and JavaScript symbol fixtures', () => {
    expect(CODEGRAPH_DIFFERENTIAL_CASES.map((entry) => entry.id)).toEqual([
      'codegraph-typescript-symbol',
      'codegraph-javascript-symbol',
      'codegraph-python-symbol',
      'codegraph-go-symbol',
      'codegraph-typescript-term-only',
      'codegraph-javascript-term-only',
      'codegraph-python-term-only',
      'codegraph-go-term-only',
    ]);
  });

  it('detects dropped, reordered, and fallback-amplified CodeGraph results', () => {
    const baseline = {
      orderedLocationKeys: ['best', 'second'],
      confirmedLocationKeys: ['best', 'second'],
      codegraphProvenanceLocationKeys: ['best', 'second'],
      codegraphHitCount: 2,
      ripgrepHitCount: 0,
      fallbackChecked: false,
    } as const;
    const clean = evaluateCodeGraphDifferential(baseline, baseline);
    expect(clean).toMatchObject({
      retainedRatio: 1,
      confirmedRetainedRatio: 1,
      codegraphProvenanceRetainedRatio: 1,
      rankInversions: 0,
      maxRankRegression: 0,
      exactPrefixPreserved: true,
      topOnePreserved: true,
      fallbackAmplification: 0,
    });
    expect(passesCodeGraphNonRegressionContract(clean)).toBe(true);

    const regressed = evaluateCodeGraphDifferential(baseline, {
      orderedLocationKeys: ['second', 'noise'],
      confirmedLocationKeys: ['second', 'noise'],
      codegraphProvenanceLocationKeys: ['second'],
      codegraphHitCount: 2,
      ripgrepHitCount: 20,
      fallbackChecked: true,
    });
    expect(regressed).toMatchObject({
      retainedRatio: 0.5,
      topOnePreserved: false,
      fallbackAmplification: 10,
      fallbackChecked: true,
    });
    expect(passesCodeGraphNonRegressionContract(regressed)).toBe(false);
  });

  it('rejects noise inserted ahead of a standalone CodeGraph result', () => {
    const baseline = {
      orderedLocationKeys: ['best', 'second'],
      confirmedLocationKeys: ['best', 'second'],
      codegraphProvenanceLocationKeys: ['best', 'second'],
      codegraphHitCount: 2,
      ripgrepHitCount: 0,
      fallbackChecked: false,
    } as const;
    const insertedNoise = evaluateCodeGraphDifferential(baseline, {
      orderedLocationKeys: ['best', 'noise', 'second'],
      confirmedLocationKeys: ['best', 'noise', 'second'],
      codegraphProvenanceLocationKeys: ['best', 'second'],
      codegraphHitCount: 2,
      ripgrepHitCount: 0,
      fallbackChecked: false,
    });

    expect(insertedNoise).toMatchObject({
      retainedRatio: 1,
      rankInversions: 0,
      maxRankRegression: 1,
      exactPrefixPreserved: false,
      unexpectedPrefixCount: 1,
    });
    expect(passesCodeGraphNonRegressionContract(insertedNoise)).toBe(false);
  });

  it('rejects evidence or provenance downgrades and ignores duplicate keys', () => {
    const baseline = {
      orderedLocationKeys: ['best', 'best', 'second'],
      confirmedLocationKeys: ['best', 'second'],
      codegraphProvenanceLocationKeys: ['best', 'second'],
      codegraphHitCount: 2,
      ripgrepHitCount: 0,
      fallbackChecked: false,
    } as const;
    const downgraded = evaluateCodeGraphDifferential(baseline, {
      orderedLocationKeys: ['best', 'second'],
      confirmedLocationKeys: ['best'],
      codegraphProvenanceLocationKeys: ['best'],
      codegraphHitCount: 1,
      ripgrepHitCount: 0,
      fallbackChecked: false,
    });

    expect(downgraded).toMatchObject({
      baselineCount: 2,
      retainedRatio: 1,
      confirmedRetainedRatio: 0.5,
      codegraphProvenanceRetainedRatio: 0.5,
      exactPrefixPreserved: true,
    });
    expect(passesCodeGraphNonRegressionContract(downgraded)).toBe(false);
  });
});
