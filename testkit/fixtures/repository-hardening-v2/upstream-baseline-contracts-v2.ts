export interface AuthoritativeSelectionCharacterizationV2 {
  readonly ownerFile: string;
  readonly testNames: readonly string[];
}

/** Regressions introduced by the 1.1.0 upstream baseline that later phases must preserve. */
export const AUTHORITATIVE_SELECTION_CHARACTERIZATION_V2: readonly AuthoritativeSelectionCharacterizationV2[] =
  Object.freeze([
    Object.freeze({
      ownerFile: 'test/unit/resolve-verification-hits-v2.spec.ts',
      testNames: Object.freeze([
        'uses authoritative hits when expanded is truncated-but-valid',
        'uses authoritative-complete when expanded is complete',
        'falls back to legacy bridge only when authoritative hits are empty',
      ]),
    }),
    Object.freeze({
      ownerFile: 'test/unit/candidate-policy.spec.ts',
      testNames: Object.freeze([
        'keeps symbol-anchor hit under maxFiles=1 instead of lexicographic noise',
        'keeps symbol-anchor when expanded is incomplete instead of legacy lexicographic bridge',
      ]),
    }),
  ]);

export const UPSTREAM_WORKFLOW_PATHS_V2 = Object.freeze({
  nightlyBenchmark: '.github/workflows/nightly-real-repo-benchmark.yml',
  releaseTag: '.github/workflows/release-tag-ci.yml',
});
