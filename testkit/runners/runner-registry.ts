import type { TestIdentity } from '../testing/selection.js';

export type RunnerSurface = 'unit' | 'golden' | 'mcp';

export interface RunnerSelectionRegistry {
  readonly groups: ReadonlySet<string>;
  readonly cases: ReadonlySet<string>;
}

export interface RunnerIdentityRegistration {
  readonly surface: RunnerSurface;
  readonly identity: TestIdentity;
  readonly ownerFiles: readonly string[];
  readonly platformOwnerFiles?: readonly string[];
}

export type RunnerGroupAliasRegistry = Readonly<
  Record<RunnerSurface, Readonly<Record<string, readonly string[]>>>
>;

export function runnerIdentityKey(
  surface: RunnerSurface,
  identity: TestIdentity,
): string {
  return [surface, identity.group, identity.caseId].join('/');
}

function freezeRunnerIdentityRegistration(
  registration: RunnerIdentityRegistration,
): RunnerIdentityRegistration {
  return Object.freeze({
    surface: registration.surface,
    identity: Object.freeze({ ...registration.identity }),
    ownerFiles: Object.freeze([...registration.ownerFiles]),
    ...(registration.platformOwnerFiles === undefined
      ? {}
      : {
          platformOwnerFiles: Object.freeze([
            ...registration.platformOwnerFiles,
          ]),
        }),
  });
}

function defineRunnerIdentityRegistry(
  registrations: readonly RunnerIdentityRegistration[],
): readonly RunnerIdentityRegistration[] {
  return Object.freeze(registrations.map(freezeRunnerIdentityRegistration));
}

export const RUNNER_IDENTITY_REGISTRY = defineRunnerIdentityRegistry([
  {
    surface: 'golden',
    identity: {
      group: 'backend-transitions',
      caseId: 'backend-transition-family',
    },
    ownerFiles: ['test/golden/mvp-regression-families.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'candidate-policy',
      caseId: 'alias-candidate',
    },
    ownerFiles: ['test/golden/candidate-policy.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'candidate-policy',
      caseId: 'sibling-candidate',
    },
    ownerFiles: ['test/golden/candidate-policy.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'candidate-policy',
      caseId: 'sibling-false-positive',
    },
    ownerFiles: ['test/golden/candidate-policy.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'candidate',
      caseId: 'candidate-family-contract',
    },
    ownerFiles: ['test/golden/mvp-regression-families.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-v1-bridge-parity',
    },
    ownerFiles: ['test/golden/canonical-locate-bridge.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'classification',
      caseId: 'classification-syntax-family',
    },
    ownerFiles: ['test/golden/mvp-regression-families.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'backend-unavailable',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'codegraph-failed',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'codegraph-global-abort-no-fallback',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'codegraph-hit-unverified',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'codegraph-incomplete',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'codegraph-local-timeout-fallback',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'codegraph-missing',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'codegraph-no-result',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'codegraph-secondary-provenance-table',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'codegraph-fallback',
      caseId: 'codegraph-symbol-complete-no-fallback',
    },
    ownerFiles: ['test/golden/codegraph-fallback.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'final-status',
      caseId: 'final-status-family-contract',
    },
    ownerFiles: ['test/golden/mvp-regression-families.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'large-request-outcome-permutation',
    },
    ownerFiles: ['test/golden/large-synthetic-repository.spec.ts'],
    platformOwnerFiles: ['test/golden/large-synthetic-repository.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'v1-compatibility',
    },
    ownerFiles: ['test/golden/input-abort-contract-v2.spec.ts'],
    platformOwnerFiles: ['test/golden/input-abort-contract-v2.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'large-adapter-set',
    },
    ownerFiles: ['test/golden/large-synthetic-repository.spec.ts'],
    platformOwnerFiles: ['test/golden/large-synthetic-repository.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'v2-shadow-and-v1-parity',
    },
    ownerFiles: ['test/golden/language-capability-boundary.spec.ts'],
    platformOwnerFiles: ['test/golden/language-capability-boundary.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'output-redaction',
      caseId: 'redaction-metadata',
    },
    ownerFiles: ['test/golden/output-guardrails.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'output-redaction',
      caseId: 'secret-redaction',
    },
    ownerFiles: ['test/golden/output-guardrails.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'performance',
      caseId: 'large-synthetic-repository',
    },
    ownerFiles: ['test/golden/large-synthetic-repository.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'public-beta-release',
      caseId: 'large-release-boundaries',
    },
    ownerFiles: ['test/golden/large-synthetic-repository.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'public-output-v2',
      caseId: 'public-output-v2-determinism',
    },
    ownerFiles: ['test/golden/public-output-v2.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'public-output-v2',
      caseId: 'public-output-v2-projection',
    },
    ownerFiles: ['test/golden/public-output-v2.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'large-ranking-permutation',
    },
    ownerFiles: ['test/golden/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'multi-anchor-round-robin',
    },
    ownerFiles: ['test/golden/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'z-target-small-budget',
    },
    ownerFiles: ['test/golden/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'large-scope-permutation',
    },
    ownerFiles: ['test/golden/repository-scope-policy.spec.ts'],
    platformOwnerFiles: ['test/golden/repository-scope-policy.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'v1-compatibility',
    },
    ownerFiles: ['test/golden/repository-scope-policy.spec.ts'],
    platformOwnerFiles: ['test/golden/repository-scope-policy.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'large-repository-request-cache',
    },
    ownerFiles: ['test/golden/request-snapshot-cache.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-mutation-golden',
    },
    ownerFiles: ['test/golden/request-snapshot-cache.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'result-limits',
      caseId: 'partial-empty-limit',
    },
    ownerFiles: ['test/golden/output-guardrails.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'result-limits',
      caseId: 'partial-with-evidence',
    },
    ownerFiles: ['test/golden/output-guardrails.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'runner-smoke',
      caseId: 'evaluator-smoke',
    },
    ownerFiles: ['test/golden/golden-contract.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'runner-smoke',
      caseId: 'manifest-schema',
    },
    ownerFiles: ['test/golden/golden-contract.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'runner-smoke',
      caseId: 'runner-smoke',
    },
    ownerFiles: ['test/golden/runner-smoke.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'security',
      caseId: 'security-family-contract',
    },
    ownerFiles: ['test/golden/mvp-regression-families.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'large-streaming-ripgrep',
    },
    ownerFiles: ['test/golden/large-streaming-ripgrep.spec.ts'],
    platformOwnerFiles: ['test/golden/large-streaming-ripgrep.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'text-engine-classifier',
      caseId: 'exclusion-summary',
    },
    ownerFiles: ['test/golden/text-engine-classifier.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'text-engine-classifier',
      caseId: 'false-confirmation-decoys',
    },
    ownerFiles: ['test/golden/text-engine-classifier.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'text-engine-classifier',
      caseId: 'source-field-mapping',
    },
    ownerFiles: ['test/golden/text-engine-classifier.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'text-evidence-engine',
      caseId: 'ripgrep-failed',
    },
    ownerFiles: ['test/golden/text-evidence-engine.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'text-evidence-engine',
      caseId: 'ripgrep-incomplete',
    },
    ownerFiles: ['test/golden/text-evidence-engine.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'text-evidence-engine',
      caseId: 'ripgrep-timeout',
    },
    ownerFiles: ['test/golden/text-evidence-engine.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'text-evidence-engine',
      caseId: 'ripgrep-unavailable',
    },
    ownerFiles: ['test/golden/text-evidence-engine.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'text-evidence-engine',
      caseId: 'text-engine-baseline',
    },
    ownerFiles: ['test/golden/text-evidence-engine.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'verification-contract',
      caseId: 'contract-code-probes',
    },
    ownerFiles: ['test/golden/fixture-completeness.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'verification-contract',
      caseId: 'evaluator-negative-self-test',
    },
    ownerFiles: ['test/golden/mvp-evaluator.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'verification-contract',
      caseId: 'fixture-completeness',
    },
    ownerFiles: ['test/golden/fixture-completeness.spec.ts'],
  },
  {
    surface: 'golden',
    identity: {
      group: 'verification-contract',
      caseId: 'manifest-evaluator',
    },
    ownerFiles: ['test/golden/mvp-evaluator.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'debug-cli-lifecycle',
      caseId: 'closed-stdin-bin',
    },
    ownerFiles: ['test/mcp/cli-closed-stdin.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'mcp-input-and-cancel',
    },
    ownerFiles: ['test/mcp/request-cancellation-v2.spec.ts'],
    platformOwnerFiles: ['test/mcp/request-cancellation-v2.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'lifecycle',
      caseId: 'shutdown-cleanup-probe',
    },
    ownerFiles: ['test/mcp/lifecycle-contract.spec.ts'],
    platformOwnerFiles: ['test/mcp/lifecycle-contract.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'lifecycle',
      caseId: 'stdio-clean-output',
    },
    ownerFiles: ['test/mcp/lifecycle-contract.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'lifecycle',
      caseId: 'stdio-graceful-shutdown',
    },
    ownerFiles: ['test/mcp/lifecycle-contract.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'candidate-minimal-loop',
    },
    ownerFiles: ['test/mcp/candidate-minimal-loop.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'initialize-tools-capability',
    },
    ownerFiles: ['test/mcp/tool-surface.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'internal-error-parity',
    },
    ownerFiles: ['test/mcp/tool-error-parity.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'invalid-input',
    },
    ownerFiles: [
      'test/mcp/tool-error-parity.spec.ts',
      'test/mcp/tool-surface.spec.ts',
    ],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'invalid-repo',
    },
    ownerFiles: ['test/mcp/tool-error-parity.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'mcp-golden-adapter',
    },
    ownerFiles: ['test/mcp/mcp-golden-adapter.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'path-outside-root',
    },
    ownerFiles: ['test/mcp/tool-error-parity.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'recoverable-status-parity',
    },
    ownerFiles: ['test/mcp/tool-output-parity.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'redaction-output-parity',
    },
    ownerFiles: ['test/mcp/redaction-output-parity.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'request-cancellation-cleanup',
    },
    ownerFiles: ['test/mcp/request-cancellation.spec.ts'],
    platformOwnerFiles: ['test/mcp/request-cancellation.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'single-tool-readonly',
    },
    ownerFiles: ['test/mcp/tool-surface.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'source-field-mapping',
    },
    ownerFiles: ['test/mcp/tool-output-parity.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'tool-list-schema',
    },
    ownerFiles: ['test/mcp/tool-surface.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'mcp-surface',
      caseId: 'unknown-tool-jsonrpc-boundary',
    },
    ownerFiles: ['test/mcp/tool-surface.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'runner-smoke',
      caseId: 'lifecycle-manifest-schema',
    },
    ownerFiles: ['test/mcp/lifecycle-contract.spec.ts'],
  },
  {
    surface: 'mcp',
    identity: {
      group: 'runner-smoke',
      caseId: 'runner-smoke',
    },
    ownerFiles: ['test/mcp/runner-smoke.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'candidate-budget',
      caseId: 'candidate-budget',
    },
    ownerFiles: ['test/unit/candidate-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'candidate-classification',
      caseId: 'discovery-key-mutual-exclusion',
    },
    ownerFiles: ['test/unit/candidate-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'candidate-context',
      caseId: 'secondary-backend-provenance-table',
    },
    ownerFiles: ['test/unit/candidate-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'candidate-discovery',
      caseId: 'secondary-backend-provenance-table',
    },
    ownerFiles: ['test/unit/candidate-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'candidate-permutation',
      caseId: 'candidate-permutation',
    },
    ownerFiles: [
      'test/unit/candidate-policy.spec.ts',
      'test/unit/resolve-verification-hits-v2.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'candidate-truth-table',
      caseId: 'secondary-backend-provenance-table',
    },
    ownerFiles: ['test/unit/candidate-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-di-wiring',
    },
    ownerFiles: ['test/unit/di.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-fact-contract',
    },
    ownerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-materialization-seam',
    },
    ownerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-package-declaration-boundary',
    },
    ownerFiles: ['test/unit/canonical-locate-package-boundary.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-real-shadow-no-cutover',
    },
    ownerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-required-owner-finalizer',
    },
    ownerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-safe-error-serialization',
    },
    ownerFiles: ['test/unit/canonical-locate-safe-error-serialization.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-single-execution',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-synthetic-shadow-serialization',
    },
    ownerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-term-case-parity',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-transport-reachability',
    },
    ownerFiles: ['test/unit/public-output-v2-no-cutover.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-v1-projector-parity',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'canonical-locate-bridge',
      caseId: 'canonical-v1-shadow-isolation',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'codegraph-parser',
      caseId: 'codegraph-parser',
    },
    ownerFiles: ['test/unit/codegraph-backend.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'codegraph-probe',
      caseId: 'codegraph-probe',
    },
    ownerFiles: ['test/unit/codegraph-backend.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'codegraph-query-plan',
      caseId: 'codegraph-query-plan',
    },
    ownerFiles: ['test/unit/codegraph-query-planner.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'contract',
      caseId: 'scope-gate-runtime',
    },
    ownerFiles: ['test/unit/scope-gate.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'contract',
      caseId: 'term-case-parity',
    },
    ownerFiles: ['test/unit/contract.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-baseline',
      caseId: 'process-caller-abort-tree-cleanup',
    },
    ownerFiles: ['test/unit/cross-platform-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-baseline',
      caseId: 'process-cleanup-invariant-fault',
    },
    ownerFiles: ['test/unit/cross-platform-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-baseline',
      caseId: 'process-stderr-n-plus-one-boundary',
    },
    ownerFiles: ['test/unit/cross-platform-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-baseline',
      caseId: 'process-stdout-n-plus-one-boundary',
    },
    ownerFiles: ['test/unit/cross-platform-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-baseline',
      caseId: 'process-timeout-tree-cleanup',
    },
    ownerFiles: ['test/unit/cross-platform-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-baseline',
      caseId: 'repository-path-error-redaction',
    },
    ownerFiles: ['test/unit/cross-platform-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-baseline',
      caseId: 'repository-path-invalid-input',
    },
    ownerFiles: ['test/unit/cross-platform-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-baseline',
      caseId: 'repository-path-posix-symlink-escape',
    },
    ownerFiles: ['test/unit/cross-platform-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-baseline',
      caseId: 'repository-path-windows-reparse-escape',
    },
    ownerFiles: ['test/unit/cross-platform-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-ci-contract',
      caseId: 'platform-batch-result',
    },
    ownerFiles: ['test/unit/platform-batch-result.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-ci-contract',
      caseId: 'platform-process-budget',
    },
    ownerFiles: ['test/unit/platform-process-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-ci-contract',
      caseId: 'snapshot-revalidation-benchmark-job',
    },
    ownerFiles: ['test/unit/snapshot-revalidation-workflow-contract.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-ci-contract',
      caseId: 'runtime-cell-contract',
    },
    ownerFiles: ['test/unit/cross-platform-ci-contract.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-ci-contract.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-ci-contract',
      caseId: 'safe-platform-report',
    },
    ownerFiles: ['test/unit/platform-evidence-report.spec.ts'],
    platformOwnerFiles: ['test/unit/platform-evidence-report.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-ci-contract',
      caseId: 'synthetic-extension-protocol',
    },
    ownerFiles: ['test/unit/cross-platform-ci-contract.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-ci-contract.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'cross-platform-ci-contract',
      caseId: 'workflow-matrix-contract',
    },
    ownerFiles: ['test/unit/cross-platform-ci-contract.spec.ts'],
    platformOwnerFiles: ['test/unit/cross-platform-ci-contract.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'debug-cli-lifecycle',
      caseId: 'debug-cli-lifecycle',
    },
    ownerFiles: ['test/unit/debug-cli-shell.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'debug-cli-probe',
      caseId: 'debug-cli-probe',
    },
    ownerFiles: ['test/unit/debug-cli-shell.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'debug-cli-shell',
      caseId: 'cli-cold-start-benchmark',
    },
    ownerFiles: ['test/unit/cli-cold-start-benchmark.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'debug-cli-shell',
      caseId: 'debug-cli-shell',
    },
    ownerFiles: ['test/unit/debug-cli-shell.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'di',
      caseId: 'di-assembly',
    },
    ownerFiles: ['test/unit/di.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'direct-mapping-classifier',
      caseId: 'direct-mapping-classifier',
    },
    ownerFiles: ['test/unit/direct-mapping-classifier.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'evidence-id-order',
      caseId: 'evidence-id-order',
    },
    ownerFiles: ['test/unit/direct-mapping-classifier.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'evidence-merge',
      caseId: 'evidence-merge',
    },
    ownerFiles: ['test/unit/evidence-merge.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'hermetic-test-surface',
      caseId: 'config-coverage',
    },
    ownerFiles: ['test/unit/hermetic-test-surface.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'hermetic-test-surface',
      caseId: 'deny-network-enforcement',
    },
    ownerFiles: ['test/unit/hermetic-test-surface.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'hermetic-test-surface',
      caseId: 'integration-isolation',
    },
    ownerFiles: ['test/unit/hermetic-test-surface.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'abort-first-writer',
    },
    ownerFiles: ['test/unit/locate-abort-coordinator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/locate-abort-coordinator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'aggregator-owner-direct-integration',
    },
    ownerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'backend-attempt-aggregation',
    },
    ownerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'cli-input-contract',
    },
    ownerFiles: ['test/unit/cli-input-contract-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/cli-input-contract-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'contribution-trust',
    },
    ownerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'file-anchor-input',
    },
    ownerFiles: ['test/unit/locate-request-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/locate-request-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'finalization-latch',
    },
    ownerFiles: ['test/unit/canonical-locate-finalization-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/canonical-locate-finalization-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'index-observation-matrix',
    },
    ownerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'locate-execution-characterization',
    },
    ownerFiles: ['test/unit/locate-execution-characterization-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'next-action-policy',
    },
    ownerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'outcome-proof',
    },
    ownerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
    platformOwnerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'platform-abort-first-writer',
    },
    ownerFiles: ['test/unit/locate-abort-coordinator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/locate-abort-coordinator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'platform-finalization-latch',
    },
    ownerFiles: ['test/unit/canonical-locate-finalization-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/canonical-locate-finalization-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'platform-input-boundary',
    },
    ownerFiles: ['test/unit/locate-request-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/locate-request-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'public-materialization-order',
    },
    ownerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'question-non-interference',
    },
    ownerFiles: ['test/unit/locate-request-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/locate-request-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'raw-budget',
    },
    ownerFiles: ['test/unit/locate-request-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/locate-request-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'repository-path-input',
    },
    ownerFiles: ['test/unit/locate-request-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/locate-request-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'semantic-input',
    },
    ownerFiles: ['test/unit/locate-request-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/locate-request-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'status-priority',
    },
    ownerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'strategy-completeness',
    },
    ownerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/request-outcome-aggregator-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'input-abort-contract-v2',
      caseId: 'v1-compatibility',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
    platformOwnerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'adapter-product-table',
    },
    ownerFiles: ['test/unit/language-capability-integration-v2.spec.ts'],
    platformOwnerFiles: [
      'test/unit/language-capability-integration-v2.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'capability-contribution',
    },
    ownerFiles: ['test/unit/language-capability-integration-v2.spec.ts'],
    platformOwnerFiles: [
      'test/unit/language-capability-integration-v2.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'capability-proof',
    },
    ownerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
    platformOwnerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'embedded-sql-completeness',
    },
    ownerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'extension-registry',
    },
    ownerFiles: ['test/unit/language-adapter-registry-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/language-adapter-registry-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'fallback-literal',
    },
    ownerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'javascript-adapter',
    },
    ownerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'language-extension-and-fallback',
    },
    ownerFiles: ['test/unit/language-capability-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/language-capability-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'move-only-characterization',
    },
    ownerFiles: ['test/unit/direct-mapping-classifier.spec.ts'],
    platformOwnerFiles: [
      'test/unit/candidate-policy.spec.ts',
      'test/unit/direct-mapping-classifier.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'one-time-lexical-facts',
    },
    ownerFiles: ['test/unit/language-lexical-facts-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/language-lexical-facts-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'real-complete-shadow',
    },
    ownerFiles: ['test/unit/di.spec.ts'],
    platformOwnerFiles: [
      'test/unit/canonical-locate-execution.spec.ts',
      'test/unit/di.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'scope-candidate-ceiling',
    },
    ownerFiles: ['test/unit/language-capability-integration-v2.spec.ts'],
    platformOwnerFiles: [
      'test/unit/language-capability-integration-v2.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'sql-adapter',
    },
    ownerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'stable-eligible-count',
    },
    ownerFiles: ['test/unit/language-capability-integration-v2.spec.ts'],
    platformOwnerFiles: [
      'test/unit/language-capability-integration-v2.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'language-capability-boundary',
      caseId: 'typescript-adapter',
    },
    ownerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/language-evidence-adapters-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'locate-status',
      caseId: 'caller-abort-empty',
    },
    ownerFiles: ['test/unit/locate-status-evaluator.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'locate-status',
      caseId: 'caller-abort-with-evidence',
    },
    ownerFiles: ['test/unit/locate-status-evaluator.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'locate-status',
      caseId: 'hit-unverified-fallback-complete',
    },
    ownerFiles: ['test/unit/locate-status-evaluator.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'locate-status',
      caseId: 'hit-unverified-fallback-unavailable',
    },
    ownerFiles: ['test/unit/locate-status-evaluator.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'locate-status',
      caseId: 'internal-deadline-at-max',
    },
    ownerFiles: ['test/unit/locate-status-evaluator.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'locate-status',
      caseId: 'internal-deadline-below-max',
    },
    ownerFiles: ['test/unit/locate-status-evaluator.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'locate-status',
      caseId: 'transition-matrix-completeness',
    },
    ownerFiles: ['test/unit/locate-status-evaluator.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'output-guardrails',
      caseId: 'redaction-policy',
    },
    ownerFiles: ['test/unit/output-guardrails.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'process-cleanup',
      caseId: 'reader-abort-no-late-completion',
    },
    ownerFiles: ['test/unit/process-cleanup.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'process-contract',
      caseId: 'process-contract',
    },
    ownerFiles: ['test/unit/safe-process-runner.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'process-output-isolation',
      caseId: 'process-output-isolation',
    },
    ownerFiles: ['test/unit/safe-process-runner.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'cli-runtime-closure',
    },
    ownerFiles: ['test/unit/public-beta-release-cli-closure.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'failure-order',
    },
    ownerFiles: ['test/unit/public-beta-release-cutover.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'installed-audit',
    },
    ownerFiles: ['test/unit/public-beta-release-security.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'installed-closure',
    },
    ownerFiles: ['test/unit/public-beta-release-install.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'installed-sbom',
    },
    ownerFiles: ['test/unit/public-beta-release-security.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'migration-document',
    },
    ownerFiles: ['test/unit/public-beta-release-docs.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'no-v1-runtime',
    },
    ownerFiles: ['test/unit/public-beta-release-boundary.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'node-range-declared',
    },
    ownerFiles: ['test/unit/public-beta-release-metadata.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'package-api',
    },
    ownerFiles: ['test/unit/public-beta-release-package-api.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'package-install-and-bin-smoke',
    },
    ownerFiles: ['test/unit/public-beta-release-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/public-beta-release-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'package-metadata',
    },
    ownerFiles: [
      'test/unit/public-beta-release-metadata.spec.ts',
      'test/unit/public-beta-release-package.spec.ts',
      'test/unit/public-root-export-snapshot.spec.ts',
      'test/unit/real-repo-benchmark-gate.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'package-reproducibility',
    },
    ownerFiles: ['test/unit/public-beta-release-package.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'projector-cutover',
    },
    ownerFiles: ['test/unit/public-beta-release-cutover.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'quality-gates',
    },
    ownerFiles: [
      'test/unit/public-beta-release-quality.spec.ts',
      'test/unit/quality-config.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'real-consumer-read-only',
    },
    ownerFiles: [
      'test/unit/public-beta-real-consumer-gate.spec.ts',
      'test/unit/real-consumer-cleanup-v2.spec.ts',
      'test/unit/real-consumer-confirmation-v2.spec.ts',
      'test/unit/real-consumer-evaluator-v2.spec.ts',
      'test/unit/real-consumer-process-cleanup-v2.spec.ts',
      'test/unit/real-consumer-repository-state-v2.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'release-readiness',
    },
    ownerFiles: ['test/unit/public-beta-release-readiness.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'repository-hardening-inventory',
    },
    ownerFiles: ['test/unit/repository-hardening-inventory-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'security-document',
    },
    ownerFiles: ['test/unit/public-beta-release-docs.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'single-execution',
    },
    ownerFiles: ['test/unit/public-beta-release-cutover.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'transport-receipt-parity',
    },
    ownerFiles: ['test/unit/public-beta-release-transport.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'upstream-baseline-contract',
    },
    ownerFiles: ['test/unit/upstream-baseline-contract-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-beta-release',
      caseId: 'version-sources',
    },
    ownerFiles: ['test/unit/public-beta-release-metadata.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'assembler-allowlist',
    },
    ownerFiles: ['test/unit/public-result-assembler-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'corpus-boundaries',
    },
    ownerFiles: ['test/unit/public-output-v2-redaction.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'corpus-policy',
    },
    ownerFiles: ['test/unit/public-output-v2-redaction.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'corpus-resource-budgets',
    },
    ownerFiles: ['test/unit/public-result-resource-budgets-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'derived-status',
    },
    ownerFiles: ['test/unit/public-result-assembler-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'field-redaction',
    },
    ownerFiles: ['test/unit/public-output-v2-redaction.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'location-redaction',
    },
    ownerFiles: ['test/unit/public-output-v2-redaction.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'maximum-structure-budget',
    },
    ownerFiles: ['test/unit/public-result-resource-budgets-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'no-cutover-import-inventory',
    },
    ownerFiles: ['test/unit/public-output-v2-no-cutover.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'ordinal-ids',
    },
    ownerFiles: ['test/unit/public-result-assembler-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'phone-corpus-policy',
    },
    ownerFiles: ['test/unit/public-output-v2-redaction.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'public-field-resource-budgets',
    },
    ownerFiles: ['test/unit/public-result-resource-budgets-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'public-safe-ranking-key',
    },
    ownerFiles: ['test/unit/public-output-v2-redaction.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'raw-resource-budgets',
    },
    ownerFiles: ['test/unit/public-result-resource-budgets-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'redaction-amplification',
    },
    ownerFiles: ['test/unit/public-output-v2-redaction.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'resource-budget-legacy-isolation',
    },
    ownerFiles: ['test/unit/public-result-resource-budgets-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'resource-budget-ordering',
    },
    ownerFiles: ['test/unit/public-result-resource-budgets-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'resource-budget-primitives',
    },
    ownerFiles: ['test/unit/public-result-resource-budgets-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'resource-budget-projection',
    },
    ownerFiles: ['test/unit/public-result-resource-budgets-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'safe-errors',
    },
    ownerFiles: ['test/unit/public-output-v2-errors-projection.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'schema-contract-families',
    },
    ownerFiles: ['test/unit/public-output-v2-contract.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'serialized-resource-budget',
    },
    ownerFiles: ['test/unit/public-result-resource-budgets-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'span-redaction',
    },
    ownerFiles: ['test/unit/public-output-v2-redaction.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'public-output-v2',
      caseId: 'synthetic-parity',
    },
    ownerFiles: ['test/unit/public-output-v2-errors-projection.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'reader-failures',
      caseId: 'reader-failures',
    },
    ownerFiles: ['test/unit/repository-reader.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'reader-limits',
      caseId: 'reader-limits',
    },
    ownerFiles: ['test/unit/repository-reader.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'anchor-intent-normalization',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'anchor-record-reservation',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'anchor-satisfaction-truth-table',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'cross-file-round-robin',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'discovery-anchor-file-reservation',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'match-priority-truth-table',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'public-materialization-real-adapter',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'public-materialization-source-stage',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'public-safe-ranking-order',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'ranking-permutation',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'ranking-real-envelope',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'ranking-trust-finalizer',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'real-classifier-ranking',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'unsatisfied-anchor-ledger',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'relevance-ranking-budget',
      caseId: 'v1-no-cutover',
    },
    ownerFiles: ['test/unit/relevance-ranking-budget.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-safety',
      caseId: 'windows-reparse-policy',
    },
    ownerFiles: ['test/unit/repository-safety.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'candidate-pool',
    },
    ownerFiles: ['test/unit/candidate-policy.spec.ts'],
    platformOwnerFiles: ['test/unit/candidate-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'docs-priority',
    },
    ownerFiles: ['test/unit/repository-scope-policy.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'explicit-prefix-priority',
    },
    ownerFiles: ['test/unit/repository-scope-policy.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'explicit-test-docs',
    },
    ownerFiles: ['test/unit/direct-mapping-classifier.spec.ts'],
    platformOwnerFiles: ['test/unit/direct-mapping-classifier.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'filter-counts',
    },
    ownerFiles: ['test/unit/repository-scope-integration.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-integration.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'large-scope-permutation',
    },
    ownerFiles: ['test/unit/repository-scope-trust.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-trust.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'move-only-characterization',
    },
    ownerFiles: ['test/unit/direct-mapping-classifier.spec.ts'],
    platformOwnerFiles: ['test/unit/direct-mapping-classifier.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'ordinary-segment-priority',
    },
    ownerFiles: ['test/unit/repository-scope-policy.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'path-comparison',
    },
    ownerFiles: ['test/unit/repository-scope-policy.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'platform-path-flavor-and-priority',
    },
    ownerFiles: ['test/unit/scope-policy-platform.spec.ts'],
    platformOwnerFiles: ['test/unit/scope-policy-platform.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'pre-budget-selection',
    },
    ownerFiles: ['test/unit/repository-scope-selection.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-selection.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'priority',
    },
    ownerFiles: ['test/unit/repository-scope-policy.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'real-owner-envelope',
    },
    ownerFiles: ['test/unit/repository-scope-trust.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-trust.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'request-scope',
    },
    ownerFiles: ['test/unit/repository-scope-policy.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'safe-key-collision',
    },
    ownerFiles: ['test/unit/repository-scope-selection.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-selection.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'scope-bound-evidence-materializer-v2',
    },
    ownerFiles: ['test/unit/scope-bound-evidence-materializer-v2.spec.ts'],
    platformOwnerFiles: [
      'test/unit/scope-bound-evidence-materializer-v2.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'test-priority',
    },
    ownerFiles: ['test/unit/repository-scope-policy.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-policy.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'trust-proof',
    },
    ownerFiles: ['test/unit/repository-scope-trust.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-trust.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'unmatched-stable-pool',
    },
    ownerFiles: ['test/unit/repository-scope-integration.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-integration.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'repository-scope-policy',
      caseId: 'v1-compatibility',
    },
    ownerFiles: ['test/unit/repository-scope-trust.spec.ts'],
    platformOwnerFiles: ['test/unit/repository-scope-trust.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'discovery-reservation-budget-independence',
    },
    ownerFiles: ['test/unit/discovery-reservation-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'executor-dual-lane-wiring',
    },
    ownerFiles: ['test/unit/executor-dual-lane-wiring-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'pre-ranking-stable-pool',
    },
    ownerFiles: ['test/unit/pre-ranking-evidence-pool.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'producer-basis-receipts',
    },
    ownerFiles: ['test/unit/request-snapshot-capability-seams-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'request-file-cache-canonical-alias',
    },
    ownerFiles: ['test/unit/request-snapshot-cache.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'request-file-cache-single-decode',
    },
    ownerFiles: ['test/unit/request-snapshot-cache.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'scope-coverage-basis',
    },
    ownerFiles: ['test/unit/request-snapshot-capability-seams-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'scope-pre-cap-fold',
    },
    ownerFiles: ['test/unit/discovery-scope-fold-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-content-identity',
    },
    ownerFiles: ['test/unit/snapshot-content-identity-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-coverage-truth-table',
    },
    ownerFiles: ['test/unit/final-snapshot-check.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-failure-and-abort-purge',
    },
    ownerFiles: ['test/unit/final-snapshot-check.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-git-state',
    },
    ownerFiles: ['test/unit/repository-git-state-probe.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-mutation-purge',
    },
    ownerFiles: ['test/unit/final-snapshot-check.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-outcome-contribution',
    },
    ownerFiles: ['test/unit/snapshot-outcome-contribution-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-revalidation-policy',
    },
    ownerFiles: ['test/unit/snapshot-revalidation-policy-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-real-envelope',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-trust-finalizer',
    },
    ownerFiles: ['test/unit/canonical-locate-facts-bridge.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-v1-mutation-precedence',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'snapshot-v1-parity',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'verified-file-snapshot',
    },
    ownerFiles: ['test/unit/verified-file-snapshot-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'verified-language-consumer-carrier',
    },
    ownerFiles: ['test/unit/request-snapshot-capability-seams-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'request-snapshot-cache',
      caseId: 'verified-record-cache-preverification-reuse',
    },
    ownerFiles: ['test/unit/verified-record-cache.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'ripgrep-backend',
      caseId: 'ripgrep-backend',
    },
    ownerFiles: ['test/unit/ripgrep-backend.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'runner-smoke',
      caseId: 'runner-exact-selection',
    },
    ownerFiles: ['test/unit/runner-exact-selection.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'runner-smoke',
      caseId: 'runner-registry-contract',
    },
    ownerFiles: ['test/unit/runner-registry-contract.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'runner-smoke',
      caseId: 'runner-smoke',
    },
    ownerFiles: ['test/unit/runner-smoke.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'backend-trace-closure',
    },
    ownerFiles: ['test/unit/backend-execution-trace-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/backend-execution-trace-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'buffered-compatibility-projection',
    },
    ownerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'canonical-backend-trace-wiring',
    },
    ownerFiles: ['test/unit/canonical-backend-trace-wiring-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/canonical-backend-trace-wiring-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'codegraph-outcome-trace',
    },
    ownerFiles: [
      'test/unit/backend-execution-trace-v2.spec.ts',
      'test/unit/codegraph-backend.spec.ts',
    ],
    platformOwnerFiles: [
      'test/unit/backend-execution-trace-v2.spec.ts',
      'test/unit/codegraph-backend.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'consumer-progress-contract',
    },
    ownerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'eligibility-gate',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
    platformOwnerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'exit-outcome-table',
    },
    ownerFiles: [
      'test/unit/multi-view-accumulator-completeness-v2.spec.ts',
      'test/unit/ripgrep-streaming-backend-v2.spec.ts',
    ],
    platformOwnerFiles: ['test/unit/ripgrep-streaming-backend-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'json-line-invalid',
    },
    ownerFiles: ['test/unit/ripgrep-json-line-consumer-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/ripgrep-json-line-consumer-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'json-line-partitions',
    },
    ownerFiles: ['test/unit/ripgrep-json-line-consumer-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/ripgrep-json-line-consumer-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'max-hits-groups',
    },
    ownerFiles: ['test/unit/ripgrep-streaming-backend-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/ripgrep-streaming-backend-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'multi-view-cap-and-order',
    },
    ownerFiles: ['test/unit/ripgrep-streaming-backend-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/ripgrep-streaming-backend-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'outcome-schema',
    },
    ownerFiles: ['test/unit/backend-execution-outcome-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/backend-execution-outcome-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'physical-start-authority',
    },
    ownerFiles: ['test/unit/backend-physical-attempt-executor-v2.spec.ts'],
    platformOwnerFiles: [
      'test/unit/backend-physical-attempt-executor-v2.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'process-n-plus-one-boundary',
    },
    ownerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'process-terminal-races',
    },
    ownerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'production-spawn-failure-wiring',
    },
    ownerFiles: ['test/unit/production-spawn-failure-wiring-v2.spec.ts'],
    platformOwnerFiles: [
      'test/unit/production-spawn-failure-wiring-v2.spec.ts',
    ],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'protocol-fsm-and-offsets',
    },
    ownerFiles: ['test/unit/ripgrep-json-line-consumer-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/ripgrep-json-line-consumer-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'real-cleanup',
    },
    ownerFiles: ['test/unit/process-cleanup.spec.ts'],
    platformOwnerFiles: ['test/unit/process-cleanup.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'ripgrep-early-stop-tree-cleanup',
    },
    ownerFiles: ['test/unit/process-cleanup.spec.ts'],
    platformOwnerFiles: ['test/unit/process-cleanup.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'ripgrep-json-stream-protocol',
    },
    ownerFiles: ['test/unit/ripgrep-json-line-consumer-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/ripgrep-json-line-consumer-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'spawn-failure-classification',
    },
    ownerFiles: ['test/unit/spawn-failure-classification-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/spawn-failure-classification-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'stream-consumer-finalizer-and-process-exit',
    },
    ownerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'stream-consumer-progress-and-boundary',
    },
    ownerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/safe-process-streaming-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'trusted-fallback-derivation',
    },
    ownerFiles: ['test/unit/trusted-fallback-decision-v2.spec.ts'],
    platformOwnerFiles: ['test/unit/trusted-fallback-decision-v2.spec.ts'],
  },
  {
    surface: 'unit',
    identity: {
      group: 'streaming-ripgrep',
      caseId: 'v1-parity-and-trace',
    },
    ownerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
    platformOwnerFiles: ['test/unit/canonical-locate-execution.spec.ts'],
  },
]);

const RUNNER_IDENTITY_KEYS: ReadonlySet<string> = new Set(
  RUNNER_IDENTITY_REGISTRY.map((registration) =>
    runnerIdentityKey(registration.surface, registration.identity),
  ),
);

export function hasRunnerIdentity(
  surface: RunnerSurface,
  identity: TestIdentity,
): boolean {
  return RUNNER_IDENTITY_KEYS.has(runnerIdentityKey(surface, identity));
}

/**
 * Exact platform owner-file projection derived from canonical runner registrations.
 */
export const PLATFORM_CASE_OWNER_REGISTRATION: Readonly<
  Record<string, readonly string[]>
> = Object.freeze(
  Object.fromEntries(
    RUNNER_IDENTITY_REGISTRY.filter(
      (registration) => registration.platformOwnerFiles !== undefined,
    ).map((registration) => [
      runnerIdentityKey(registration.surface, registration.identity),
      registration.platformOwnerFiles ?? [],
    ]),
  ),
);

export const RUNNER_GROUP_ALIASES: RunnerGroupAliasRegistry = Object.freeze({
  unit: Object.freeze({}),
  golden: Object.freeze({
    classification: Object.freeze([
      'classification',
      'text-engine-classifier',
      'text-evidence-engine',
    ]),
    candidate: Object.freeze(['candidate', 'candidate-policy']),
    'backend-transitions': Object.freeze([
      'backend-transitions',
      'codegraph-fallback',
      'text-evidence-engine',
    ]),
    security: Object.freeze(['security', 'output-redaction']),
    'final-status': Object.freeze(['final-status', 'result-limits']),
  }),
  mcp: Object.freeze({
    protocol: Object.freeze(['mcp-surface']),
    lifecycle: Object.freeze(['lifecycle']),
  }),
});

function deriveRunnerSelectionRegistry(
  surface: RunnerSurface,
): RunnerSelectionRegistry {
  const groups = new Set<string>();
  const cases = new Set<string>();
  for (const registration of RUNNER_IDENTITY_REGISTRY) {
    if (registration.surface !== surface) continue;
    groups.add(registration.identity.group);
    cases.add(registration.identity.caseId);
  }
  for (const alias of Object.keys(RUNNER_GROUP_ALIASES[surface]))
    groups.add(alias);
  return Object.freeze({ groups, cases });
}

export const RUNNER_SELECTIONS: Readonly<
  Record<RunnerSurface, RunnerSelectionRegistry>
> = Object.freeze({
  unit: deriveRunnerSelectionRegistry('unit'),
  golden: deriveRunnerSelectionRegistry('golden'),
  mcp: deriveRunnerSelectionRegistry('mcp'),
});
