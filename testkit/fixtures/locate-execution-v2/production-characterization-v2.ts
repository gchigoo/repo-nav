import type {
  BackendHealth,
  BackendHit,
  BackendSearchRequest,
  BackendSearchResult,
  EvidenceLocation,
  LocateExecutionContext,
  NormalizedSearchTerm,
  RepositoryReadLimits,
  RepositoryReader,
  RepositorySearchBackend,
} from '../../../src/contracts/index.js';
import type {
  SafeProcessRequest,
  SafeProcessResult,
  SafeProcessStreamingResultV2,
  SafeStdoutConsumerV2,
  StreamingSafeProcessRunnerV2,
} from '../../../src/contracts/safe-process.js';
import type {
  BackendExecutionContextV2,
  TrustedBackendDiscoveryHandoffV2,
} from '../../../src/contracts/v2/backend-execution-outcome-v2.js';
import type { LocateExecutionTokenV2 } from '../../../src/contracts/v2/locate-fact-envelope-v2.js';
import type { LocateResultV2 } from '../../../src/contracts/v2/locate-result-v2.js';
import type { TraceableRepositorySearchBackendV2 } from '../../../src/contracts/v2/traceable-repository-search-backend-v2.js';
import type { MultiViewBackendSearchRequestV2 } from '../../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import {
  createBackendExecutionContextV2,
  createTrustedBackendDiscoveryHandoffV2,
  issueExpandedBackendLogicalAttemptForHarnessV2,
  requireBackendDiscoveryHandoffForF3V2,
  requireBackendExecutionOutcomeV2,
} from '../../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../../src/process/opaque-token-v2.js';
import { NodeRepositoryReader } from '../../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../../src/repository/ripgrep-backend.js';
import { candidateFixtureRoot } from '../candidate-policy/candidate-fixture-backend.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testing/create-canonical-locate-engine-harness-v2.js';

const repositoryRoot = new URL('../../../', import.meta.url).pathname;
const emptyBytes = new Uint8Array();

function executionContext(): LocateExecutionContext {
  return { signal: new AbortController().signal };
}

class TraceableOutputLimitBackendV2
  implements RepositorySearchBackend, TraceableRepositorySearchBackendV2
{
  public readonly id = 'ripgrep' as const;

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(): Promise<BackendSearchResult> {
    return { health: { state: 'available' }, hits: [], complete: false };
  }

  public async searchViews(
    request: MultiViewBackendSearchRequestV2,
    _signal: AbortSignal,
    context: BackendExecutionContextV2,
    execution: LocateExecutionTokenV2,
  ): Promise<TrustedBackendDiscoveryHandoffV2> {
    const legacy = Object.freeze({
      health: Object.freeze({ state: 'available' as const }),
      hits: Object.freeze([]),
      complete: false,
      canSkipFallbackIfVerified: false,
    });
    const outcome = Object.freeze({
      backend: 'ripgrep' as const,
      status: 'used' as const,
      completion: 'incomplete' as const,
      selectionEligibility: 'telemetry-only' as const,
      termination: 'output-limit' as const,
      hitCount: 0,
      retainedHits: Object.freeze([]),
    });
    const attempt = issueExpandedBackendLogicalAttemptForHarnessV2({
      execution,
      context,
      outcome,
    });
    return createTrustedBackendDiscoveryHandoffV2(
      {
        kind: 'started',
        request,
        attempt,
        legacy,
        fallback: Object.freeze({
          primaryNeededFallback: false,
          fallbackInvoked: false,
          fallbackAcceptedForExpanded: false,
          fallbackAcceptedForLegacy: false,
        }),
        expandedHealth: legacy.health,
        completeSafeHits: Object.freeze([]),
        canSkipFallbackIfVerified: false,
      },
      context,
      execution,
    );
  }
}

class RipgrepOutputLimitRunnerV2 implements StreamingSafeProcessRunnerV2 {
  public run(
    _request: SafeProcessRequest,
    _signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    throw new Error('buffered process path is not expected');
  }

  public async runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    _signal: AbortSignal,
    _consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    if (
      request.argv.length === 1 &&
      request.argv[0] === '--version' &&
      request.executable === 'rg'
    ) {
      return {
        ok: true,
        kind: 'completed',
        startState: 'started',
        exitCode: 0,
        terminationSignal: null,
        stdout: {
          kind: 'complete',
          value: new TextEncoder().encode(
            'ripgrep 14.1.0\n',
          ) as unknown as TComplete,
        },
        stderr: emptyBytes,
      };
    }
    return {
      ok: false,
      kind: 'stdout-limit',
      startState: 'started',
      exitCode: null,
      terminationSignal: 'SIGTERM',
      stdout: { kind: 'unavailable' },
      stderr: emptyBytes,
    };
  }
}

class DeadlineBackendV2 implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    _request: BackendSearchRequest,
    signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    await new Promise<void>((resolveAbort) => {
      if (signal.aborted) {
        resolveAbort();
        return;
      }
      signal.addEventListener('abort', () => resolveAbort(), { once: true });
    });
    return {
      health: { state: 'error', reasonCode: 'BACKEND_ABORTED' },
      hits: [],
      complete: false,
    };
  }
}

class RedactionBackendV2 implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(): Promise<BackendSearchResult> {
    return {
      health: { state: 'available' },
      hits: [
        {
          file: 'src/customer-do-not-publish/config.ts',
          lines: [1, 1],
          matchedText: 'password=customer-do-not-publish',
          source: 'ripgrep',
          reasonCodes: ['LITERAL_TERM_HIT'],
        },
      ],
      complete: true,
    };
  }
}

class RedactionReaderV2 implements RepositoryReader {
  public async resolveRoot(repoPath: string): Promise<string> {
    return repoPath;
  }

  public async readRange(
    _repositoryRoot: string,
    relativeFile: string,
    lines: readonly [number, number],
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    return {
      file: relativeFile,
      lines,
      excerpt: 'password=customer-do-not-publish',
    };
  }

  public async readWindow(
    _repositoryRoot: string,
    relativeFile: string,
    lines: readonly [number, number],
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    return {
      file: relativeFile,
      lines,
      excerpt: 'password=customer-do-not-publish',
    };
  }

  public async findMatches(
    _repositoryRoot: string,
    _relativeFile: string,
    _terms: readonly NormalizedSearchTerm[],
    _symbol: string | undefined,
    _maxMatches: number,
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<readonly EvidenceLocation[]> {
    return [];
  }
}

class OrderedExpandedHitBackendV2 implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public constructor(private readonly hits: readonly BackendHit[]) {}

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(): Promise<BackendSearchResult> {
    return {
      health: { state: 'available' },
      hits: this.hits,
      complete: false,
    };
  }
}

class ThrowingReaderV2 extends NodeRepositoryReader {
  public constructor(private readonly error: Error) {
    super();
  }

  public override async resolveRoot(): Promise<string> {
    throw this.error;
  }
}

export const OUTPUT_LIMIT_CHARACTERIZATION_RESULT_V2 = Object.freeze({
  ok: true as const,
  evidence: Object.freeze({
    schemaVersion: '2.0' as const,
    status: 'partial' as const,
    repositoryRef: 'local-repository' as const,
    normalizedTerms: Object.freeze([
      Object.freeze({ value: 'mapping', caseSensitive: false }),
    ]),
    confirmed: Object.freeze([] as const),
    candidates: Object.freeze([] as const),
    coverage: Object.freeze({
      backends: Object.freeze([
        Object.freeze({
          backend: 'ripgrep' as const,
          status: 'used' as const,
          completion: 'incomplete' as const,
          termination: 'output-limit' as const,
          hitCount: 0,
        }),
      ]),
      strategyComplete: false,
      fallbackChecked: false,
      indexState: 'unknown' as const,
      indexFreshness: 'unknown' as const,
      limitsReached: Object.freeze([] as const),
      degradations: Object.freeze(['PROCESS_OUTPUT_LIMIT_REACHED'] as const),
      exclusionSummary: Object.freeze({}),
      abortSource: 'none' as const,
      unsatisfiedAnchors: Object.freeze([] as const),
      snapshot: Object.freeze({
        gitState: 'unknown' as const,
        consistency: 'unknown' as const,
        filesChecked: 0,
        discardedEvidenceCount: 0,
      }),
      scope: Object.freeze({
        requested: Object.freeze([] as const),
        effective: Object.freeze([
          'client',
          'server',
          'db',
          'config',
          'unknown',
        ] as const),
        policyVersion: 'repo-scope-v1' as const,
        unmatchedLayers: Object.freeze([
          'client',
          'server',
          'db',
          'config',
          'unknown',
        ] as const),
      }),
      capabilities: Object.freeze({
        textSearch: 'supported-text-files' as const,
        semanticClassification: Object.freeze([
          'typescript',
          'javascript',
          'sql',
        ] as const),
        unsupportedLanguageHits: 0,
      }),
    }),
    nextActions: Object.freeze([] as const),
  }),
}) satisfies LocateResultV2;

export const DEADLINE_CHARACTERIZATION_RESULT_V2 = Object.freeze({
  ok: true as const,
  evidence: Object.freeze({
    schemaVersion: '2.0' as const,
    status: 'timeout' as const,
    repositoryRef: 'local-repository' as const,
    normalizedTerms: Object.freeze([
      Object.freeze({ value: 'deadlineProbe', caseSensitive: true }),
    ]),
    confirmed: Object.freeze([] as const),
    candidates: Object.freeze([] as const),
    coverage: Object.freeze({
      backends: Object.freeze([
        Object.freeze({
          backend: 'ripgrep' as const,
          status: 'used' as const,
          completion: 'incomplete' as const,
          termination: 'aborted' as const,
          reasonCode: 'BACKEND_ABORTED' as const,
          hitCount: 0,
        }),
      ]),
      strategyComplete: false,
      fallbackChecked: false,
      indexState: 'unknown' as const,
      indexFreshness: 'unknown' as const,
      limitsReached: Object.freeze(['TIMEOUT_REACHED'] as const),
      degradations: Object.freeze([] as const),
      exclusionSummary: Object.freeze({}),
      abortSource: 'deadline' as const,
      unsatisfiedAnchors: Object.freeze([] as const),
      snapshot: Object.freeze({
        gitState: 'unknown' as const,
        consistency: 'unknown' as const,
        filesChecked: 0,
        discardedEvidenceCount: 0,
      }),
      scope: Object.freeze({
        requested: Object.freeze([] as const),
        effective: Object.freeze([
          'client',
          'server',
          'db',
          'config',
          'unknown',
        ] as const),
        policyVersion: 'repo-scope-v1' as const,
        unmatchedLayers: Object.freeze([
          'client',
          'server',
          'db',
          'config',
          'unknown',
        ] as const),
      }),
      capabilities: Object.freeze({
        textSearch: 'supported-text-files' as const,
        semanticClassification: Object.freeze([
          'typescript',
          'javascript',
          'sql',
        ] as const),
        unsupportedLanguageHits: 0,
      }),
    }),
    nextActions: Object.freeze(['RETRY_WITH_HIGHER_LIMIT'] as const),
  }),
}) satisfies LocateResultV2;

export const LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2 = Object.freeze({
  ok: true as const,
  evidence: Object.freeze({
    schemaVersion: '2.0' as const,
    status: 'partial' as const,
    repositoryRef: 'local-repository' as const,
    normalizedTerms: Object.freeze([
      Object.freeze({
        value: '[REDACTED]=[REDACTED]',
        caseSensitive: true,
      }),
    ]),
    confirmed: Object.freeze([] as const),
    candidates: Object.freeze([
      Object.freeze({
        evidenceClass: 'candidate' as const,
        id: 'evidence:v2:0001',
        role: 'reference' as const,
        location: Object.freeze({
          file: '[REDACTED_PATH]',
          resolvable: false,
          lines: Object.freeze([1, 1] as const),
          excerpt: 'password=[REDACTED]',
          redaction: Object.freeze({
            applied: true as const,
            fields: Object.freeze([
              Object.freeze({
                field: 'file' as const,
                reasonCodes: Object.freeze(['SECRET_LIKE_VALUE'] as const),
              }),
              Object.freeze({
                field: 'excerpt' as const,
                reasonCodes: Object.freeze(['SECRET_LIKE_VALUE'] as const),
              }),
            ]),
          }),
        }),
        provenance: Object.freeze({
          discoveredBy: Object.freeze(['ripgrep'] as const),
          verifiedBy: 'filesystem' as const,
          operations: Object.freeze([
            'RIPGREP_SEARCH',
            'FILESYSTEM_READ_RANGE',
          ] as const),
        }),
        reasonCodes: Object.freeze([
          'EXACT_TERM_WITHOUT_DIRECT_MAPPING',
        ] as const),
        promotionRequirements: Object.freeze([
          'USER_SEMANTIC_CONFIRMATION',
          'DIRECT_REFERENCE_REQUIRED',
        ] as const),
      }),
    ]),
    coverage: Object.freeze({
      backends: Object.freeze([
        Object.freeze({
          backend: 'ripgrep' as const,
          status: 'used' as const,
          completion: 'complete' as const,
          termination: 'none' as const,
          hitCount: 1,
        }),
      ]),
      strategyComplete: true,
      fallbackChecked: false,
      indexState: 'unknown' as const,
      indexFreshness: 'unknown' as const,
      limitsReached: Object.freeze([] as const),
      degradations: Object.freeze(['LOCATION_REDACTED'] as const),
      exclusionSummary: Object.freeze({}),
      abortSource: 'none' as const,
      unsatisfiedAnchors: Object.freeze([] as const),
      snapshot: Object.freeze({
        gitState: 'unknown' as const,
        consistency: 'stable' as const,
        filesChecked: 1,
        discardedEvidenceCount: 0,
      }),
      scope: Object.freeze({
        requested: Object.freeze([] as const),
        effective: Object.freeze([
          'client',
          'server',
          'db',
          'config',
          'unknown',
        ] as const),
        policyVersion: 'repo-scope-v1' as const,
        unmatchedLayers: Object.freeze([
          'client',
          'server',
          'db',
          'config',
          'unknown',
        ] as const),
      }),
      capabilities: Object.freeze({
        textSearch: 'supported-text-files' as const,
        semanticClassification: Object.freeze([
          'typescript',
          'javascript',
          'sql',
        ] as const),
        unsupportedLanguageHits: 0,
      }),
    }),
    nextActions: Object.freeze(['CONFIRM_CANDIDATE'] as const),
  }),
}) satisfies LocateResultV2;

export const UPSTREAM_EXPANDED_HIT_CHARACTERIZATION_RESULT_V2 = Object.freeze({
  ok: true as const,
  evidence: Object.freeze({
    schemaVersion: '2.0' as const,
    status: 'partial' as const,
    repositoryRef: 'local-repository' as const,
    normalizedTerms: Object.freeze([
      Object.freeze({ value: 'zetaAnchor', caseSensitive: true }),
      Object.freeze({ value: 'hcp_id', caseSensitive: true }),
    ]),
    confirmed: Object.freeze([
      Object.freeze({
        evidenceClass: 'confirmed' as const,
        id: 'evidence:v2:0001',
        role: 'execution-site' as const,
        location: Object.freeze({
          file: 'server/target-anchor.fixture',
          resolvable: true,
          symbol: 'zetaAnchor',
          lines: Object.freeze([1, 1] as const),
          excerpt: 'export function zetaAnchor() { return row.hcp_id; }',
        }),
        provenance: Object.freeze({
          discoveredBy: Object.freeze(['ripgrep'] as const),
          verifiedBy: 'filesystem' as const,
          operations: Object.freeze([
            'RIPGREP_SEARCH',
            'FILESYSTEM_READ_RANGE',
          ] as const),
        }),
        reasonCodes: Object.freeze(['EXACT_SYMBOL_ANCHOR'] as const),
      }),
    ]),
    candidates: Object.freeze([] as const),
    coverage: Object.freeze({
      backends: Object.freeze([
        Object.freeze({
          backend: 'ripgrep' as const,
          status: 'used' as const,
          completion: 'incomplete' as const,
          termination: 'early-stop' as const,
          hitCount: 2,
        }),
      ]),
      strategyComplete: false,
      fallbackChecked: false,
      indexState: 'unknown' as const,
      indexFreshness: 'unknown' as const,
      limitsReached: Object.freeze([
        'MAX_FILES_REACHED',
        'MAX_BACKEND_HITS_REACHED',
      ] as const),
      degradations: Object.freeze([
        'SEMANTIC_LANGUAGE_UNSUPPORTED',
        'BACKEND_EARLY_STOPPED',
      ] as const),
      exclusionSummary: Object.freeze({}),
      abortSource: 'none' as const,
      unsatisfiedAnchors: Object.freeze([] as const),
      snapshot: Object.freeze({
        gitState: 'unknown' as const,
        consistency: 'stable' as const,
        filesChecked: 1,
        discardedEvidenceCount: 0,
      }),
      scope: Object.freeze({
        requested: Object.freeze(['server'] as const),
        effective: Object.freeze(['server'] as const),
        policyVersion: 'repo-scope-v1' as const,
        unmatchedLayers: Object.freeze([] as const),
      }),
      capabilities: Object.freeze({
        textSearch: 'supported-text-files' as const,
        semanticClassification: Object.freeze([
          'typescript',
          'javascript',
          'sql',
        ] as const),
        unsupportedLanguageHits: 2,
      }),
    }),
    nextActions: Object.freeze(['RETRY_WITH_HIGHER_LIMIT'] as const),
  }),
}) satisfies LocateResultV2;

export const SAFE_ERROR_CHARACTERIZATION_ROWS_V2 = Object.freeze([
  Object.freeze({
    caseId: 'invalid-input',
    expected: Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: 'INVALID_INPUT' as const,
        message: 'Locate request does not match the required schema.' as const,
        recoverable: true as const,
        suggestedAction: 'ADD_TERM' as const,
      }),
    }) satisfies LocateResultV2,
  }),
  Object.freeze({
    caseId: 'invalid-repository',
    expected: Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: 'INVALID_REPOSITORY' as const,
        message: 'Repository root is invalid or unavailable.' as const,
        recoverable: true as const,
      }),
    }) satisfies LocateResultV2,
  }),
  Object.freeze({
    caseId: 'path-outside-root',
    expected: Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: 'PATH_OUTSIDE_ROOT' as const,
        message: 'Repository path is outside the configured root.' as const,
        recoverable: false as const,
      }),
    }) satisfies LocateResultV2,
  }),
  Object.freeze({
    caseId: 'internal-error',
    expected: Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: 'INTERNAL_ERROR' as const,
        message: 'Repository evidence request failed.' as const,
        recoverable: false as const,
      }),
    }) satisfies LocateResultV2,
  }),
] as const);

export async function observeProductionOutputLimitV2(): Promise<LocateResultV2> {
  return await createCanonicalLocateEngineHarnessV2(
    [new TraceableOutputLimitBackendV2()],
    new NodeRepositoryReader(),
  ).service.locate(
    {
      repoPath: repositoryRoot,
      question: 'output limit characterization',
      terms: ['mapping'],
      termCase: 'insensitive',
    },
    executionContext(),
  );
}

export async function observeRipgrepOutputLimitMappingV2() {
  const runner = new RipgrepOutputLimitRunnerV2();
  const signal = new AbortController().signal;
  const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
  const context = createBackendExecutionContextV2(
    runner,
    undefined,
    signal,
    execution,
  );
  const request = Object.freeze({
    base: Object.freeze({
      repositoryRoot,
      terms: Object.freeze([
        Object.freeze({ value: 'mapping', caseSensitive: false }),
      ]),
      anchors: Object.freeze([]),
      negativeTerms: Object.freeze([]),
      layers: Object.freeze([]),
    }),
    expandedMaxHits: 800,
    legacyMaxHits: 40,
  });
  const handoff = await new RipgrepBackend(
    runner as unknown as NodeSafeProcessRunner,
  ).searchViews(request, signal, context, execution);
  const view = requireBackendDiscoveryHandoffForF3V2(
    handoff,
    'ripgrep',
    request,
    context,
    execution,
  );
  if (view.kind !== 'started') {
    throw new Error('ripgrep output-limit characterization did not start');
  }
  return requireBackendExecutionOutcomeV2(view.expandedOutcome, execution);
}

export async function observeProductionDeadlineV2(): Promise<LocateResultV2> {
  return await createCanonicalLocateEngineHarnessV2(
    [new DeadlineBackendV2()],
    new NodeRepositoryReader(),
  ).service.locate(
    {
      repoPath: repositoryRoot,
      question: 'deadline characterization',
      terms: ['deadlineProbe'],
      termCase: 'sensitive',
      limits: { timeoutMs: 1_000 },
    },
    executionContext(),
  );
}

export async function observeProductionLocationRedactionV2(): Promise<LocateResultV2> {
  return await createCanonicalLocateEngineHarnessV2(
    [new RedactionBackendV2()],
    new RedactionReaderV2(),
  ).service.locate(
    {
      repoPath: repositoryRoot,
      question: 'redaction characterization',
      terms: ['password=customer-do-not-publish'],
      termCase: 'sensitive',
    },
    executionContext(),
  );
}

export async function observeProductionUpstreamExpandedHitV2(): Promise<LocateResultV2> {
  const hits = Object.freeze([
    Object.freeze({
      file: 'server/alpha.fixture',
      lines: Object.freeze([1, 1] as const),
      symbol: 'alphaNoise',
      matchedText: 'export const alpha = { hcpId: row.hcp_id };',
      source: 'ripgrep' as const,
      reasonCodes: Object.freeze(['LITERAL_TERM_HIT'] as const),
    }),
    Object.freeze({
      file: 'server/target-anchor.fixture',
      lines: Object.freeze([1, 1] as const),
      symbol: 'zetaAnchor',
      matchedText: 'export function zetaAnchor() { return row.hcp_id; }',
      source: 'ripgrep' as const,
      reasonCodes: Object.freeze([
        'LITERAL_TERM_HIT',
        'SYMBOL_SEARCH_HIT',
      ] as const),
    }),
  ] satisfies readonly BackendHit[]);
  return await createCanonicalLocateEngineHarnessV2(
    [new OrderedExpandedHitBackendV2(hits)],
    new NodeRepositoryReader(),
  ).service.locate(
    {
      repoPath: candidateFixtureRoot,
      question: 'truncated-but-valid authoritative selection',
      terms: ['zetaAnchor', 'hcp_id'],
      termCase: 'sensitive',
      layers: ['server'],
      anchors: [{ kind: 'symbol', value: 'zetaAnchor' }],
      limits: { maxFiles: 1 },
    },
    executionContext(),
  );
}

export async function observeProductionSafeErrorsV2() {
  const baseline = createCanonicalLocateEngineHarnessV2(
    [new TraceableOutputLimitBackendV2()],
    new NodeRepositoryReader(),
  );
  const invalidInput = await baseline.application.execute(
    {
      repoPath: repositoryRoot,
      question: 'invalid input characterization',
      terms: [],
    },
    executionContext(),
  );

  const createFailure = async (error: Error) =>
    await createCanonicalLocateEngineHarnessV2(
      [new TraceableOutputLimitBackendV2()],
      new ThrowingReaderV2(error),
    ).application.execute(
      {
        repoPath: repositoryRoot,
        question: 'safe error characterization',
        terms: ['mapping'],
      },
      executionContext(),
    );

  const { RepositoryAccessError: AccessError } =
    await import('../../../src/contracts/index.js');
  return Object.freeze([
    Object.freeze({ caseId: 'invalid-input' as const, view: invalidInput }),
    Object.freeze({
      caseId: 'invalid-repository' as const,
      view: await createFailure(new AccessError('INVALID_REPOSITORY')),
    }),
    Object.freeze({
      caseId: 'path-outside-root' as const,
      view: await createFailure(new AccessError('PATH_OUTSIDE_ROOT')),
    }),
    Object.freeze({
      caseId: 'internal-error' as const,
      view: await createFailure(new Error('unsafe internal detail')),
    }),
  ]);
}
