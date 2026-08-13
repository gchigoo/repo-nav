import { describe, expect, it } from 'vitest';

import {
  buildVitestSurfaceInvocation,
  RunnerUsageError,
  runVitestSurfaceSummary,
} from '../../testkit/runners/run-vitest-surface.js';
import {
  isSelected,
  type TestIdentity,
} from '../../testkit/testing/selection.js';

const identity = {
  group: 'runner-smoke',
  caseId: 'runner-exact-selection',
} as const;

const SELECTION_ENV_KEYS = [
  'REPO_NAV_TEST_GROUPS',
  'REPO_NAV_TEST_CASES',
  'REPO_NAV_TEST_IDENTITIES',
] as const;

type SelectionEnvironment = Partial<
  Record<(typeof SELECTION_ENV_KEYS)[number], string>
>;

function withSelectionEnvironment<T>(
  values: SelectionEnvironment,
  callback: () => T,
): T {
  const previous = new Map<string, string | undefined>();
  for (const key of SELECTION_ENV_KEYS) {
    previous.set(key, process.env[key]);
    const next = values[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }

  try {
    return callback();
  } finally {
    for (const key of SELECTION_ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function setSelection(
  identities: readonly TestIdentity[],
): SelectionEnvironment {
  return {
    REPO_NAV_TEST_IDENTITIES: JSON.stringify(identities),
  };
}

async function expectUsageError(args: readonly string[]): Promise<void> {
  await expect(runVitestSurfaceSummary('unit', args)).rejects.toBeInstanceOf(
    RunnerUsageError,
  );
}

describe.runIf(isSelected(identity))('B1.1 exact runner selection', () => {
  it('selects only exact group/case identities without cross-product expansion', () => {
    withSelectionEnvironment(
      setSelection([
        { group: 'g1', caseId: 'c1' },
        { group: 'g2', caseId: 'c2' },
      ]),
      () => {
        expect(isSelected({ group: 'g1', caseId: 'c1' })).toBe(true);
        expect(isSelected({ group: 'g2', caseId: 'c2' })).toBe(true);
        expect(isSelected({ group: 'g1', caseId: 'c2' })).toBe(false);
        expect(isSelected({ group: 'g2', caseId: 'c1' })).toBe(false);
      },
    );
  });

  it('fails closed when REPO_NAV_TEST_IDENTITIES is malformed', () => {
    withSelectionEnvironment(
      { REPO_NAV_TEST_IDENTITIES: JSON.stringify([{ group: 'g1' }]) },
      () => {
        expect(isSelected({ group: 'g1', caseId: 'c1' })).toBe(false);
      },
    );
  });

  it('preserves group-only selection and ignores REPO_NAV_TEST_CASES', () => {
    withSelectionEnvironment(
      {
        REPO_NAV_TEST_GROUPS: JSON.stringify(['g1']),
        REPO_NAV_TEST_CASES: JSON.stringify(['c2']),
      },
      () => {
        expect(isSelected({ group: 'g1', caseId: 'c1' })).toBe(true);
        expect(isSelected({ group: 'g1', caseId: 'c2' })).toBe(true);
        expect(isSelected({ group: 'g2', caseId: 'c2' })).toBe(false);
      },
    );
  });

  it('rejects malformed identity arguments', async () => {
    await expectUsageError(['--identity', 'runner-smoke']);
    await expectUsageError(['--identity', '/runner-smoke']);
    await expectUsageError(['--identity', 'runner-smoke/']);
    await expectUsageError(['--identity', 'runner-smoke/runner-smoke/extra']);
  });

  it('rejects case-only and ambiguous legacy group/case selections', async () => {
    await expectUsageError(['--case', 'runner-smoke']);
    await expectUsageError([
      '--group',
      'runner-smoke',
      '--group',
      'contract',
      '--case',
      'runner-smoke',
    ]);
    await expectUsageError([
      '--group',
      'runner-smoke',
      '--case',
      'runner-smoke',
      '--case',
      'term-case-parity',
    ]);
  });

  it('rejects identity mixed with group, case, or all selection', async () => {
    await expectUsageError([
      '--identity',
      'runner-smoke/runner-smoke',
      '--group',
      'runner-smoke',
    ]);
    await expectUsageError([
      '--identity',
      'runner-smoke/runner-smoke',
      '--case',
      'runner-smoke',
    ]);
    await expectUsageError([
      '--all',
      '--identity',
      'runner-smoke/runner-smoke',
    ]);
    await expectUsageError(['--all', '--group', 'runner-smoke']);
    await expectUsageError(['--all', '--case', 'runner-smoke']);
  });

  it('normalizes legacy single group/case selection to one exact identity', async () => {
    const summary = await runVitestSurfaceSummary('unit', [
      '--group',
      'runner-smoke',
      '--case',
      'runner-smoke',
    ]);

    expect(summary.selection).toEqual(['identity:runner-smoke/runner-smoke']);
  });

  it('does not expand multi-target group aliases for legacy exact identity selection', () => {
    const invocation = buildVitestSurfaceInvocation('golden', [
      '--group',
      'classification',
      '--case',
      'classification-syntax-family',
    ]);

    expect(invocation.selection).toEqual({
      groups: [],
      identities: [
        { group: 'classification', caseId: 'classification-syntax-family' },
      ],
      all: false,
      reportPerformance: false,
    });
    expect(
      JSON.parse(invocation.environment['REPO_NAV_TEST_GROUPS'] ?? 'null'),
    ).toEqual([]);
    expect(
      JSON.parse(invocation.environment['REPO_NAV_TEST_IDENTITIES'] ?? 'null'),
    ).toEqual([
      { group: 'classification', caseId: 'classification-syntax-family' },
    ]);
  });

  it('continues to expand group aliases for group-only runner environments', () => {
    const invocation = buildVitestSurfaceInvocation('golden', [
      '--group',
      'classification',
    ]);

    expect(invocation.selection).toEqual({
      groups: ['classification'],
      identities: [],
      all: false,
      reportPerformance: false,
    });
    expect(
      JSON.parse(invocation.environment['REPO_NAV_TEST_GROUPS'] ?? 'null'),
    ).toEqual([
      'classification',
      'text-engine-classifier',
      'text-evidence-engine',
    ]);
    expect(
      JSON.parse(invocation.environment['REPO_NAV_TEST_IDENTITIES'] ?? 'null'),
    ).toEqual([]);
  });

  it('reports group-only runner summary output without recursive self-selection', async () => {
    const summary = await runVitestSurfaceSummary('unit', ['--group', 'di']);

    expect(summary.selection).toEqual(['group:di']);
    expect(summary.selection).not.toContain('all');
    expect(summary.selection).not.toContain('identity:di/di-assembly');
    expect(summary.counts.failed).toBe(0);
    expect(summary.counts.passed).toBeGreaterThan(0);
    expect(summary.counts.skipped).toBeGreaterThan(0);
  });

  it('accepts repeated identity selections and reports exact identities', async () => {
    const summary = await runVitestSurfaceSummary('unit', [
      '--identity',
      'runner-smoke/runner-smoke',
      '--identity',
      'contract/term-case-parity',
    ]);

    expect(summary.selection).toEqual([
      'identity:runner-smoke/runner-smoke',
      'identity:contract/term-case-parity',
    ]);
  });
});
