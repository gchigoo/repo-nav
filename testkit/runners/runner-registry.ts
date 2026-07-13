export type RunnerSurface = 'unit' | 'golden' | 'mcp';

export interface RunnerSelectionRegistry {
  readonly groups: ReadonlySet<string>;
  readonly cases: ReadonlySet<string>;
}

export const RUNNER_SELECTIONS: Readonly<
  Record<RunnerSurface, RunnerSelectionRegistry>
> = Object.freeze({
  unit: Object.freeze({
    groups: new Set([
      'runner-smoke',
      'contract',
      'di',
      'repository-safety',
      'reader-limits',
      'reader-failures',
      'process-contract',
      'process-output-isolation',
      'process-cleanup',
    ]),
    cases: new Set([
      'runner-smoke',
      'term-case-parity',
      'scope-gate-runtime',
      'di-assembly',
      'windows-reparse-policy',
      'reader-limits',
      'reader-failures',
      'process-contract',
      'process-output-isolation',
      'reader-abort-no-late-completion',
    ]),
  }),
  golden: Object.freeze({
    groups: new Set(['runner-smoke']),
    cases: new Set(['runner-smoke', 'manifest-schema', 'evaluator-smoke']),
  }),
  mcp: Object.freeze({
    groups: new Set(['runner-smoke']),
    cases: new Set(['runner-smoke', 'lifecycle-manifest-schema']),
  }),
});
