import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { aggregateRequestOutcomeV2 } from '../../src/evidence/request-outcome/request-outcome-aggregator-v2.js';
import {
  COMPLETE_RIPGREP_V2,
  EARLY_STOP_RIPGREP_V2,
  UNAVAILABLE_CODEGRAPH_V2,
} from '../../testkit/fixtures/request-outcome-v2/backend-outcomes-v2.js';
import { buildAggregationHarnessV2 } from '../../testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.js';
import { LARGE_REQUEST_OUTCOME_PERMUTATION_V2 } from '../../testkit/fixtures/request-outcome-v2/large-request-outcome-permutation-v2.js';
import type { SnapshotObservationLedgerEntryInputV2 } from '../../src/evidence/request-snapshot/snapshot-outcome-contribution-v2.js';
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

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'large-request-outcome-permutation',
  }),
)('F6-LARGE-001 large-request-outcome-permutation', () => {
  it('keeps bounded aggregator hash stable across five ledger permutations', async () => {
    const { maxAnchors, maxExclusionLedgerRows, raceRepetitions } =
      LARGE_REQUEST_OUTCOME_PERMUTATION_V2;

    const baseLedger: SnapshotObservationLedgerEntryInputV2[] = Array.from(
      { length: maxExclusionLedgerRows },
      (_, index) =>
        Object.freeze({
          selected: true,
          scopeIncluded: true,
          maxFileBytesReached: index % 8 === 0,
          maxExcerptBytesReached: index % 8 === 1,
          negativeExcluded: index % 3 === 0,
          duplicateExtraCount: index % 5,
          unverifiedOrdinary: index % 4 === 0,
        }),
    );

    const unsatisfiedAnchors = Array.from({ length: maxAnchors }, (_, index) =>
      Object.freeze({
        requestIndex: index,
        kind: (['symbol', 'file', 'table', 'route', 'term'] as const)[
          index % 5
        ]!,
        satisfaction: 'none' as const,
        reason: 'NOT_FOUND' as const,
      }),
    );

    const hashes: string[] = [];
    for (let round = 0; round < raceRepetitions; round += 1) {
      const ledger = [...baseLedger].sort(() => (round % 2 === 0 ? 1 : -1));
      const anchors = [...unsatisfiedAnchors].sort(() =>
        round % 2 === 0 ? -1 : 1,
      );
      const harness = await buildAggregationHarnessV2({
        outcomes: [UNAVAILABLE_CODEGRAPH_V2, EARLY_STOP_RIPGREP_V2],
        fallback: {
          checked: true,
          required: true,
          completeEquivalentFallback: false,
        },
        snapshotChangedCount: 7,
        locationRedactedTerm: 'SECRET',
        ledger,
        unsatisfiedAnchors: anchors,
        budgetFacts: {
          maxFilesReached: true,
          maxConfirmedReached: true,
          maxCandidatesReached: true,
          preRankingPoolTruncated: true,
          safeSelectorCollision: false,
          safeOrderingCollision: false,
        },
        limits: {
          maxFiles: 20,
          maxConfirmed: 20,
          maxCandidates: 20,
          timeoutMs: 30_000,
        },
      });
      const aggregated = aggregateRequestOutcomeV2(harness.input);
      expect(aggregated.backend.value.outcomes.length).toBeLessThanOrEqual(2);
      expect(aggregated.backend.value.outcomes).toHaveLength(2);
      expect(
        Object.keys(aggregated.requestOutcome.value.exclusionSummary).length,
      ).toBeGreaterThan(0);
      const canonical = {
        statusV2: aggregated.statusV2,
        backend: aggregated.backend.value,
        requestOutcome: aggregated.requestOutcome.value,
      };
      hashes.push(
        createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
      );
    }

    expect(hashes).toHaveLength(raceRepetitions);
    expect(new Set(hashes).size).toBe(1);
    // prove the case is not a no-op against a trivial complete-only input
    const trivial = await buildAggregationHarnessV2({
      outcomes: [COMPLETE_RIPGREP_V2],
    });
    const trivialAggregated = aggregateRequestOutcomeV2(trivial.input);
    const trivialHash = createHash('sha256')
      .update(
        JSON.stringify({
          statusV2: trivialAggregated.statusV2,
          backend: trivialAggregated.backend.value,
          requestOutcome: trivialAggregated.requestOutcome.value,
        }),
      )
      .digest('hex');
    expect(hashes[0]).not.toBe(trivialHash);
  });
});


describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'large-adapter-set',
  }),
)('F8-LARGE-001 large-adapter-set', () => {
  it('keeps extension registry membership bounded and stable', async () => {
    const { requireDefaultLanguageEvidenceAdapterRegistryV2 } = await import(
      '../../src/evidence/language/language-adapter-registry-v2.js'
    );
    const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
    expect(registry.semanticClassification).toEqual([
      'typescript',
      'javascript',
      'sql',
    ]);
    expect(registry.resolveAdapter('.ts')).toBe('typescript');
    expect(registry.resolveAdapter('.py')).toBe('fallback');
  });
});

describe.runIf(
  isSelected({
    group: 'public-beta-release',
    caseId: 'large-release-boundaries',
  }),
)('F9-LARGE-001 large-release-boundaries', () => {
  it('freezes N pass / N+1 fail-closed boundary constants and mutation manifest', async () => {
    const { readFileSync } = await import('node:fs');
    const {
      LARGE_RELEASE_N_PLUS_ONE_V2,
      LARGE_RELEASE_N_V2,
    } = await import(
      '../../testkit/fixtures/release-v2/large-release-v2.js'
    );
    const root = resolve(import.meta.dirname, '../..');
    const boundariesSource = readFileSync(
      resolve(root, 'tools/release/release-boundaries-v1.mjs'),
      'utf8',
    );
    expect(boundariesSource).toContain(
      `packageEntries: ${LARGE_RELEASE_N_V2.packageEntries}`,
    );
    expect(LARGE_RELEASE_N_PLUS_ONE_V2.packageEntries).toBe(
      LARGE_RELEASE_N_V2.packageEntries + 1,
    );
    expect(LARGE_RELEASE_N_PLUS_ONE_V2.sbomBytes).toBe(
      LARGE_RELEASE_N_V2.sbomBytes + 1,
    );
    const mutations = JSON.parse(
      readFileSync(
        resolve(
          root,
          'testkit/manifests/release-v2/release-boundary-mutations-v1.json',
        ),
        'utf8',
      ),
    ) as {
      mutations: readonly { id: string; expect: string; value: number }[];
    };
    const pass = mutations.mutations.filter((m) => m.expect === 'pass');
    const fail = mutations.mutations.filter((m) => m.expect === 'fail');
    expect(pass.length).toBeGreaterThan(0);
    expect(fail.length).toBeGreaterThan(0);
    for (const row of fail) {
      expect(row.value).toBeGreaterThan(LARGE_RELEASE_N_V2.packageEntries - 1);
    }
  });
});
