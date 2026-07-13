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
      'ripgrep-backend',
      'evidence-merge',
      'direct-mapping-classifier',
      'evidence-id-order',
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
      'ripgrep-backend',
      'evidence-merge',
      'direct-mapping-classifier',
      'evidence-id-order',
    ]),
  }),
  golden: Object.freeze({
    groups: new Set([
      'runner-smoke',
      'text-engine-classifier',
      'text-evidence-engine',
    ]),
    cases: new Set([
      'runner-smoke',
      'manifest-schema',
      'evaluator-smoke',
      'source-field-mapping',
      'false-confirmation-decoys',
      'exclusion-summary',
      'text-engine-baseline',
      'ripgrep-unavailable',
      'ripgrep-failed',
      'ripgrep-incomplete',
      'ripgrep-timeout',
    ]),
  }),
  mcp: Object.freeze({
    groups: new Set(['runner-smoke', 'mcp-surface']),
    cases: new Set([
      'runner-smoke',
      'lifecycle-manifest-schema',
      'initialize-tools-capability',
      'tool-list-schema',
      'single-tool-readonly',
      'unknown-tool-jsonrpc-boundary',
      'source-field-mapping',
      'recoverable-status-parity',
      'invalid-input',
      'invalid-repo',
      'path-outside-root',
      'internal-error-parity',
      'request-cancellation-cleanup',
      'stdio-clean-output',
      'stdio-graceful-shutdown',
    ]),
  }),
});
