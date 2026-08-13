import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { CanonicalFileKeyV2 } from '../../src/repository/verified-file-snapshot-v2.js';
import {
  createSnapshotBenchmarkRevalidationPlanV2,
  createSnapshotRevalidationPlanV2,
} from '../../src/evidence/request-snapshot/snapshot-revalidation-policy-v2.js';
import {
  isUbuntu2404OsReleaseV2,
  SnapshotRevalidationBenchmarkV1Schema,
  runSnapshotRevalidationBenchmarkV2,
  runSnapshotRevalidationCorrectnessProbesV2,
} from '../../tools/benchmark/snapshot-revalidation-benchmark.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-revalidation-policy',
});
const finalSnapshotCheckSource = readFileSync(
  resolve(
    import.meta.dirname,
    '../../src/evidence/request-snapshot/final-snapshot-check-v2.ts',
  ),
  'utf8',
);
const requestSnapshotSource = readFileSync(
  resolve(
    import.meta.dirname,
    '../../src/evidence/request-snapshot/request-repository-snapshot-v2.ts',
  ),
  'utf8',
);

function key(value: string): CanonicalFileKeyV2 {
  return value as CanonicalFileKeyV2;
}

const planInput = Object.freeze({
  loadedCanonicalKeys: Object.freeze([
    key('zeta.ts'),
    key('alpha.ts'),
    key('eligible.ts'),
    key('alpha.ts'),
  ]),
  retainedEvidenceCanonicalKeys: Object.freeze([
    key('zeta.ts'),
    key('alpha.ts'),
  ]),
  eligibleCanonicalKeys: Object.freeze([key('eligible.ts'), key('alpha.ts')]),
  gitState: 'unknown' as const,
});

function validReportFixture() {
  const policies = [
    {
      policy: 'all-loaded-baseline',
      metadataChecks: 3,
      digestChecks: 3,
      digestBytes: 96,
      eligibleDecisionSafe: true,
    },
    {
      policy: 'retained-digest',
      metadataChecks: 1,
      digestChecks: 1,
      digestBytes: 32,
      eligibleDecisionSafe: false,
    },
    {
      policy: 'conditional-digest',
      metadataChecks: 2,
      digestChecks: 2,
      digestBytes: 64,
      eligibleDecisionSafe: true,
    },
  ].map((row) => ({
    ...row,
    loadedCount: 3,
    retainedCount: 1,
    eligibleCount: 2,
    samplesMicroseconds: [1, 2, 3, 4, 5],
    p50Microseconds: 3,
    p95Microseconds: 5,
  }));
  const correctness = policies.map(({ policy, eligibleDecisionSafe }) => ({
    policy,
    retainedMutationDetected: true,
    eligibleDecisionSafe,
    abortPurged: true,
    unreadablePurged: true,
  }));
  return {
    schemaVersion: 1,
    catalogSha256: 'a'.repeat(64),
    environment: {
      runner: 'ubuntu-24.04',
      nodeMajor: 22,
      platform: 'linux',
      arch: 'x64',
    },
    sampling: {
      warmupRuns: 1,
      measuredRuns: 5,
      quantile: 'nearest-rank',
    },
    policies,
    correctness,
    selected: null,
  };
}

describe.runIf(selected)('snapshot revalidation policy candidates', () => {
  it('keeps production final check on all loaded files until authoritative selection is imported', () => {
    expect(finalSnapshotCheckSource).not.toContain(
      'snapshot-revalidation-policy-v2',
    );
    expect(finalSnapshotCheckSource).not.toContain(
      'SELECTED_SNAPSHOT_REVALIDATION_POLICY_V2',
    );
    expect(finalSnapshotCheckSource).toContain(
      'const sorted = [...input.loadedFiles].sort',
    );
    expect(requestSnapshotSource).toContain(
      'loadedFiles: this.cache.listLoadedCanonicalFiles()',
    );
  });

  it('sorts and deduplicates required checks without admitting the baseline as a production policy', () => {
    expect(
      createSnapshotRevalidationPlanV2('retained-digest', planInput),
    ).toEqual({
      metadataCanonicalKeys: ['alpha.ts', 'zeta.ts'],
      digestCanonicalKeys: ['alpha.ts', 'zeta.ts'],
      eligibleDecisionSafe: false,
    });
    expect(
      createSnapshotRevalidationPlanV2('conditional-digest', planInput),
    ).toEqual({
      metadataCanonicalKeys: ['alpha.ts', 'eligible.ts', 'zeta.ts'],
      digestCanonicalKeys: ['alpha.ts', 'eligible.ts', 'zeta.ts'],
      eligibleDecisionSafe: true,
    });
    expect(
      createSnapshotBenchmarkRevalidationPlanV2(
        'all-loaded-baseline',
        planInput,
      ),
    ).toEqual({
      metadataCanonicalKeys: ['alpha.ts', 'eligible.ts', 'zeta.ts'],
      digestCanonicalKeys: ['alpha.ts', 'eligible.ts', 'zeta.ts'],
      eligibleDecisionSafe: true,
    });
  });

  it('uses metadata checks for clean eligible files while always digesting retained evidence', () => {
    const cleanInput = Object.freeze({
      ...planInput,
      gitState: 'clean' as const,
    });

    expect(
      createSnapshotRevalidationPlanV2('conditional-digest', cleanInput),
    ).toEqual({
      metadataCanonicalKeys: ['alpha.ts', 'eligible.ts', 'zeta.ts'],
      digestCanonicalKeys: ['alpha.ts', 'zeta.ts'],
      eligibleDecisionSafe: true,
    });
  });

  it('records retained mutation, eligible decision, abort, and unreadable correctness outcomes', async () => {
    const rows = await runSnapshotRevalidationCorrectnessProbesV2();

    expect(rows).toEqual([
      {
        policy: 'all-loaded-baseline',
        retainedMutationDetected: true,
        eligibleDecisionSafe: true,
        abortPurged: true,
        unreadablePurged: true,
      },
      {
        policy: 'retained-digest',
        retainedMutationDetected: true,
        eligibleDecisionSafe: false,
        abortPurged: true,
        unreadablePurged: true,
      },
      {
        policy: 'conditional-digest',
        retainedMutationDetected: true,
        eligibleDecisionSafe: true,
        abortPurged: true,
        unreadablePurged: true,
      },
    ]);
  });

  it('rejects non-authoritative environment labels and unknown report keys', () => {
    const base = validReportFixture();

    expect(isUbuntu2404OsReleaseV2('ID=ubuntu\nVERSION_ID="24.04"\n')).toBe(
      true,
    );
    expect(isUbuntu2404OsReleaseV2('ID=debian\nVERSION_ID="24.04"\n')).toBe(
      false,
    );
    expect(isUbuntu2404OsReleaseV2('ID=ubuntu\nVERSION_ID="22.04"\n')).toBe(
      false,
    );
    expect(() =>
      SnapshotRevalidationBenchmarkV1Schema.parse(base),
    ).not.toThrow();
    expect(() =>
      SnapshotRevalidationBenchmarkV1Schema.parse({
        ...base,
        environment: {
          runner: 'ubuntu-24.04',
          nodeMajor: 24,
          platform: 'darwin',
          arch: 'arm64',
        },
      }),
    ).toThrow();
    expect(() =>
      SnapshotRevalidationBenchmarkV1Schema.parse({
        ...base,
        unexpected: true,
      }),
    ).toThrow();
  });

  it('rejects reordered or duplicate policies and inconsistent measurements', () => {
    const base = validReportFixture();
    const [baseline, retained, conditional] = base.policies;
    const [baselineCorrectness, retainedCorrectness, conditionalCorrectness] =
      base.correctness;
    const invalidReports = [
      {
        ...base,
        policies: [retained, baseline, conditional],
      },
      {
        ...base,
        policies: [baseline, baseline, conditional],
      },
      {
        ...base,
        correctness: [
          retainedCorrectness,
          baselineCorrectness,
          conditionalCorrectness,
        ],
      },
      {
        ...base,
        policies: base.policies.map((row, index) =>
          index === 0 ? { ...row, metadataChecks: 2 } : row,
        ),
      },
      {
        ...base,
        policies: base.policies.map((row, index) =>
          index === 1 ? { ...row, p95Microseconds: 4 } : row,
        ),
      },
      {
        ...base,
        policies: base.policies.map((row, index) =>
          index === 2 ? { ...row, loadedCount: 4 } : row,
        ),
      },
      {
        ...base,
        policies: base.policies.map((row, index) =>
          index === 2
            ? {
                ...row,
                metadataChecks: 3,
                digestChecks: 3,
                digestBytes: 80,
              }
            : row,
        ),
      },
      {
        ...base,
        policies: base.policies.map((row) => ({
          ...row,
          retainedCount: 3,
          eligibleCount: 2,
        })),
      },
      {
        ...base,
        policies: base.policies.map((row, index) =>
          index === 2 ? { ...row, eligibleDecisionSafe: false } : row,
        ),
        correctness: base.correctness.map((row, index) =>
          index === 2 ? { ...row, eligibleDecisionSafe: false } : row,
        ),
      },
      {
        ...base,
        policies: base.policies.map((row, index) =>
          index === 0 ? { ...row, eligibleDecisionSafe: false } : row,
        ),
        correctness: base.correctness.map((row, index) =>
          index === 0 ? { ...row, eligibleDecisionSafe: false } : row,
        ),
      },
      {
        ...base,
        correctness: base.correctness.map((row, index) =>
          index === 0 ? { ...row, retainedMutationDetected: false } : row,
        ),
      },
    ];

    for (const report of invalidReports) {
      expect(() =>
        SnapshotRevalidationBenchmarkV1Schema.parse(report),
      ).toThrow();
    }
  });

  it('writes a strict local report with one warmup, five samples, raw catalog digest, and no selection', async () => {
    const workspace = mkdtempSync(
      resolve(tmpdir(), 'repo-nav-snapshot-revalidation-'),
    );
    const outputPath = resolve(workspace, 'report.json');
    try {
      const report = await runSnapshotRevalidationBenchmarkV2({
        mode: 'local',
        warmupRuns: 1,
        measuredRuns: 5,
        outputPath,
      });
      const parsed = SnapshotRevalidationBenchmarkV1Schema.parse(
        JSON.parse(readFileSync(outputPath, 'utf8')),
      );

      expect(parsed).toEqual(report);
      expect(parsed.environment.runner).toBe('local');
      expect(parsed.sampling).toEqual({
        warmupRuns: 1,
        measuredRuns: 5,
        quantile: 'nearest-rank',
      });
      expect(parsed.catalogSha256).toMatch(/^[0-9a-f]{64}$/u);
      expect(parsed.policies.map(({ policy }) => policy)).toEqual([
        'all-loaded-baseline',
        'retained-digest',
        'conditional-digest',
      ]);
      for (const row of parsed.policies) {
        expect(row.samplesMicroseconds).toHaveLength(5);
        expect(row.p50Microseconds).toBeGreaterThanOrEqual(0);
        expect(row.p95Microseconds).toBeGreaterThanOrEqual(row.p50Microseconds);
      }
      expect(parsed.selected).toBeNull();
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
