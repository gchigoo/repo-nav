import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { LARGE_REQUEST_OUTCOME_PERMUTATION_V2 } from '../../testkit/fixtures/request-outcome-v2/large-request-outcome-permutation-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
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
  it('keeps five real-engine projections stable and records environment-aware timing', async () => {
    const repositoryRoot = resolve(import.meta.dirname, '..', '..');
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), 'repo-nav-large-synthetic-'),
    );
    const report = await runLargeSyntheticPerformance(
      repositoryRoot,
      fixtureRoot,
    );

    expect(report.runs).toHaveLength(5);
    expect(
      new Set(report.runs.map(({ projectionHash }) => projectionHash)).size,
    ).toBe(1);
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
  }, 120_000);
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'large-request-outcome-permutation',
  }),
)('F6-LARGE-001 large-request-outcome-permutation', () => {
  it('keeps bounded finalizer hash stable across five fact permutations', () => {
    const { maxAnchors, maxExclusionLedgerRows, raceRepetitions } =
      LARGE_REQUEST_OUTCOME_PERMUTATION_V2;
    const baseLedger = Array.from(
      { length: maxExclusionLedgerRows },
      (_, index) => index,
    );
    const unsatisfiedAnchors = Array.from({ length: maxAnchors }, (_, index) =>
      Object.freeze({
        requestIndex: index,
        kind: (['symbol', 'file', 'table', 'route', 'term'] as const)[
          index % 5
        ]!,
        satisfaction: 'none' as const,
        reason: 'BUDGET_EXCEEDED' as const,
      }),
    );

    const hashes: string[] = [];
    for (let round = 0; round < raceRepetitions; round += 1) {
      const ledger = [...baseLedger].sort(() => (round % 2 === 0 ? 1 : -1));
      const anchors = [...unsatisfiedAnchors].sort(() =>
        round % 2 === 0 ? -1 : 1,
      );
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Expected success fixture.');
      Object.assign(raw.evidence.coverage, {
        backends: [
          {
            backend: 'codegraph',
            status: 'unavailable',
            completion: 'incomplete',
            termination: 'process-error',
            reasonCode: 'CODEGRAPH_UNAVAILABLE',
            hitCount: 0,
          },
          {
            backend: 'ripgrep',
            status: 'used',
            completion: 'incomplete',
            termination: 'early-stop',
            hitCount: 1,
          },
        ],
        unsatisfiedAnchors: anchors,
        exclusionSummary: {
          NEGATIVE_TERM_MATCH: ledger.filter((index) => index % 3 === 0).length,
          DUPLICATE_LOCATION: ledger.reduce(
            (count, index) => count + (index % 5),
            0,
          ),
          UNVERIFIED_FILE_CONTENT: ledger.filter((index) => index % 4 === 0)
            .length,
          SNAPSHOT_CHANGED: 7,
        },
      });
      Object.assign(raw.evidence.coverage.snapshot, {
        consistency: 'changed',
        discardedEvidenceCount: 7,
      });
      const transport = finalizeLocateResultV2(
        locateExecutionFinalizerInputFromUnsafePublicSourceV2(raw),
      );
      expect(transport.value.ok).toBe(true);
      if (!transport.value.ok) throw new Error('Expected success result.');
      expect(transport.value.evidence.coverage.backends).toHaveLength(2);
      expect(
        Object.keys(transport.value.evidence.coverage.exclusionSummary).length,
      ).toBeGreaterThan(0);
      hashes.push(
        createHash('sha256').update(transport.compactJson).digest('hex'),
      );
    }

    expect(hashes).toHaveLength(raceRepetitions);
    expect(new Set(hashes).size).toBe(1);
    const trivial = finalizeLocateResultV2(
      locateExecutionFinalizerInputFromUnsafePublicSourceV2(
        createUnsafeLocateSuccessV2(),
      ),
    );
    const trivialHash = createHash('sha256')
      .update(trivial.compactJson)
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
    const { requireDefaultLanguageEvidenceAdapterRegistryV2 } =
      await import('../../src/evidence/language/language-adapter-registry-v2.js');
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
    const { LARGE_RELEASE_N_PLUS_ONE_V2, LARGE_RELEASE_N_V2 } =
      await import('../../testkit/fixtures/release-v2/large-release-v2.js');
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
