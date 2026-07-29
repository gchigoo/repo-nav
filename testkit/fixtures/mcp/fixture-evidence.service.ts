import {
  normalizeSearchTerms,
  requireCallerSignal,
  type LocateExecutionContext,
  type LocateRequest,
  type LocateStatus,
  type RepositoryEvidenceService,
} from '../../../src/contracts/index.js';
import {
  deriveLocateStatusV2,
  LocateResultV2Schema,
  type LocateResultV2,
} from '../../../src/contracts/v2/locate-result-v2.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeRepositoryReader } from '../../../src/repository/node-repository-reader.js';
import { writeScrubbedDiagnostic } from '../../../src/mcp/diagnostic-scrubber.js';
import {
  CandidateFixtureBackend,
  candidateFixtureRoot,
} from '../candidate-policy/candidate-fixture-backend.js';

const DEFAULT_SCOPE = Object.freeze({
  requested: [] as const,
  effective: ['client', 'server', 'db', 'config', 'unknown'] as const,
  policyVersion: 'repo-scope-v1' as const,
  unmatchedLayers: [] as const,
});

const DEFAULT_CAPABILITIES = Object.freeze({
  textSearch: 'supported-text-files' as const,
  semanticClassification: ['typescript', 'javascript', 'sql'] as const,
  unsupportedLanguageHits: 0,
});

const REDACTED_CONFIRMED_EXCERPT =
  'api_key=[REDACTED]; password="[REDACTED]"; secret=\'[REDACTED]\'; token=`[REDACTED]`; passwd=`[REDACTED]`; client_secret="[REDACTED]"; dsn=postgres://[REDACTED]@localhost/app?token=[REDACTED] owner=[REDACTED]; phone=[REDACTED]';

function requestedStatus(question: string): LocateStatus {
  const marker = 'status:';
  if (!question.startsWith(marker)) {
    return 'ok';
  }
  const value = question.slice(marker.length);
  if (
    value === 'ok' ||
    value === 'partial' ||
    value === 'no_result' ||
    value === 'backend_unavailable' ||
    value === 'timeout'
  ) {
    return value;
  }
  return 'ok';
}

function baseProvenance() {
  return {
    discoveredBy: ['ripgrep'] as const,
    verifiedBy: 'filesystem' as const,
    operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'] as const,
  };
}

function coverageFor(
  status: LocateStatus,
  retainedEvidenceCount: number,
): Extract<LocateResultV2, { readonly ok: true }>['evidence']['coverage'] {
  const filesChecked = Math.max(1, retainedEvidenceCount);
  if (status === 'timeout') {
    return {
      backends: [],
      strategyComplete: false,
      fallbackChecked: false,
      indexState: 'unknown',
      indexFreshness: 'unknown',
      limitsReached: ['TIMEOUT_REACHED'],
      degradations: [],
      exclusionSummary: {},
      abortSource: 'deadline',
      unsatisfiedAnchors: [],
      snapshot: {
        gitState: 'unknown',
        consistency: 'unknown',
        filesChecked: 0,
        discardedEvidenceCount: 0,
      },
      scope: DEFAULT_SCOPE,
      capabilities: DEFAULT_CAPABILITIES,
    };
  }
  if (status === 'backend_unavailable') {
    return {
      backends: [
        {
          backend: 'ripgrep',
          status: 'unavailable',
          completion: 'incomplete',
          termination: 'none',
          hitCount: 0,
          reasonCode: 'RIPGREP_UNAVAILABLE',
        },
      ],
      strategyComplete: false,
      fallbackChecked: false,
      indexState: 'unavailable',
      indexFreshness: 'not-applicable',
      limitsReached: [],
      degradations: [],
      exclusionSummary: {},
      abortSource: 'none',
      unsatisfiedAnchors: [],
      snapshot: {
        gitState: 'unknown',
        consistency: 'unknown',
        filesChecked: 0,
        discardedEvidenceCount: 0,
      },
      scope: DEFAULT_SCOPE,
      capabilities: DEFAULT_CAPABILITIES,
    };
  }
  if (status === 'partial') {
    return {
      backends: [
        {
          backend: 'ripgrep',
          status: 'used',
          completion: 'complete',
          termination: 'none',
          hitCount: retainedEvidenceCount,
          ...(retainedEvidenceCount === 0
            ? { reasonCode: 'RIPGREP_NO_RESULT' as const }
            : {}),
        },
      ],
      strategyComplete: false,
      fallbackChecked: false,
      indexState: 'unknown',
      indexFreshness: 'unknown',
      limitsReached: ['MAX_FILES_REACHED'],
      degradations: [],
      exclusionSummary: {},
      abortSource: 'none',
      unsatisfiedAnchors: [],
      snapshot: {
        gitState: 'unknown',
        consistency: retainedEvidenceCount > 0 ? 'stable' : 'unknown',
        filesChecked: retainedEvidenceCount > 0 ? filesChecked : 0,
        discardedEvidenceCount: 0,
      },
      scope: DEFAULT_SCOPE,
      capabilities: DEFAULT_CAPABILITIES,
    };
  }
  return {
    backends: [
      {
        backend: 'ripgrep',
        status: 'used',
        completion: 'complete',
        termination: 'none',
        hitCount: retainedEvidenceCount,
        ...(retainedEvidenceCount === 0
          ? { reasonCode: 'RIPGREP_NO_RESULT' as const }
          : {}),
      },
    ],
    strategyComplete: true,
    fallbackChecked: false,
    indexState: 'unknown',
    indexFreshness: 'unknown',
    limitsReached: [],
    degradations: [],
    exclusionSummary: {},
    abortSource: 'none',
    unsatisfiedAnchors: [],
    snapshot: {
      gitState: 'unknown',
      consistency: retainedEvidenceCount > 0 ? 'stable' : 'unknown',
      filesChecked: retainedEvidenceCount > 0 ? filesChecked : 0,
      discardedEvidenceCount: 0,
    },
    scope: DEFAULT_SCOPE,
    capabilities: DEFAULT_CAPABILITIES,
  };
}

function successResult(request: LocateRequest): LocateResultV2 {
  const question = request.question ?? '';
  const status = requestedStatus(question);
  const sourceMapping = question === 'source-field-mapping';
  const redactionOutput = question === 'redaction-output-parity';
  const needsConfirmed =
    sourceMapping || redactionOutput || status === 'ok';

  const confirmed = needsConfirmed
    ? [
        {
          evidenceClass: 'confirmed' as const,
          id: 'evidence:v2:0001',
          role: 'value-mapping' as const,
          location: {
            file: 'server/mapping.ts',
            resolvable: true,
            symbol: 'hcpId',
            lines: [1, 1] as const,
            excerpt: redactionOutput
              ? REDACTED_CONFIRMED_EXCERPT
              : 'hcpId = hcp_id;',
            ...(redactionOutput
              ? {
                  redaction: {
                    applied: true as const,
                    fields: [
                      {
                        field: 'excerpt' as const,
                        reasonCodes: [
                          'SECRET_LIKE_VALUE',
                          'CONNECTION_STRING',
                          'PERSONAL_DATA',
                        ] as const,
                      },
                    ],
                  },
                }
              : {}),
          },
          provenance: baseProvenance(),
          reasonCodes: [
            'EXACT_TERM_MATCH',
            'DIRECT_ALIAS_MAPPING',
          ] as const,
        },
        ...(redactionOutput
          ? [
              {
                evidenceClass: 'confirmed' as const,
                id: 'evidence:v2:0002',
                role: 'value-mapping' as const,
                location: {
                  file: 'server/malformed.ts',
                  resolvable: true,
                  lines: [1, 1] as const,
                  excerpt: '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]',
                  redaction: {
                    applied: true as const,
                    fields: [
                      {
                        field: 'excerpt' as const,
                        reasonCodes: [
                          'SECRET_LIKE_VALUE',
                          'BINARY_OR_OVERSIZED_CONTENT',
                        ] as const,
                      },
                    ],
                  },
                },
                provenance: baseProvenance(),
                reasonCodes: [
                  'EXACT_TERM_MATCH',
                  'DIRECT_ALIAS_MAPPING',
                ] as const,
              },
            ]
          : []),
      ]
    : [];

  const candidates = redactionOutput
    ? [
        {
          evidenceClass: 'candidate' as const,
          id: `evidence:v2:${String(confirmed.length + 1).padStart(4, '0')}`,
          role: 'related' as const,
          location: {
            file: 'server/derived.ts',
            resolvable: true,
            lines: [1, 1] as const,
            excerpt: 'const alias = "[REDACTED]";',
            redaction: {
              applied: true as const,
              fields: [
                {
                  field: 'excerpt' as const,
                  reasonCodes: ['SECRET_LIKE_VALUE'] as const,
                },
              ],
            },
          },
          provenance: baseProvenance(),
          reasonCodes: ['SAME_ENTITY_SIBLING'] as const,
          promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'] as const,
        },
      ]
    : [];

  const retained = confirmed.length + candidates.length;
  const coverage = coverageFor(
    sourceMapping || redactionOutput ? 'ok' : status,
    retained,
  );
  const derivedStatus = deriveLocateStatusV2(coverage, retained);

  return LocateResultV2Schema.parse({
    ok: true,
    evidence: {
      schemaVersion: '2.0',
      status: derivedStatus,
      repositoryRef: 'local-repository',
      normalizedTerms: normalizeSearchTerms(
        request.terms,
        request.termCase ?? 'smart',
      ),
      confirmed,
      candidates,
      coverage,
      nextActions:
        derivedStatus === 'partial' || derivedStatus === 'timeout'
          ? ['RETRY_WITH_HIGHER_LIMIT']
          : [],
    },
  });
}

function errorResult(code: string): LocateResultV2 | undefined {
  if (code === 'INVALID_REPOSITORY') {
    return {
      ok: false,
      error: {
        code: 'INVALID_REPOSITORY',
        message: 'Repository root is invalid or unavailable.',
        recoverable: true,
      },
    };
  }
  if (code === 'PATH_OUTSIDE_ROOT') {
    return {
      ok: false,
      error: {
        code: 'PATH_OUTSIDE_ROOT',
        message: 'Repository path is outside the configured root.',
        recoverable: false,
      },
    };
  }
  if (code === 'INTERNAL_ERROR') {
    // Unsafe detail is intentionally present; the fixture application sanitizes.
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Repository evidence request failed.',
        recoverable: false,
      },
    };
  }
  return undefined;
}

export class FixtureEvidenceService implements RepositoryEvidenceService {
  public async locate(
    request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<LocateResultV2> {
    if ((request.question ?? '') === 'redaction-output-parity') {
      writeScrubbedDiagnostic(
        'token=rawDiagnosticSecret C:\\private\\repo\\secret.ts stan.guo@mail.ru',
      );
    }
    if ((request.question ?? '') === 'candidate-minimal-loop') {
      const engine = createCanonicalLocateEngineHarnessV2(
        [new CandidateFixtureBackend()],
        new NodeRepositoryReader(),
      ).service;
      return await engine.locate(
        {
          ...request,
          repoPath: candidateFixtureRoot,
          terms: ['hcpId', 'row.hcp_id'],
          termCase: 'sensitive',
          layers: ['server'],
        },
        context,
      );
    }
    if ((request.question ?? '') === 'throw:INTERNAL_ERROR') {
      throw new Error(
        'Unsafe internal failure C:\\private\\repo\\secret.ts\n    at fixture (raw stderr)',
      );
    }
    const callerSignal = requireCallerSignal(context);
    const question = request.question ?? '';
    if (question === 'wait-for-cancellation') {
      process.stderr.write('MCP_FIXTURE_STARTED\n');
      await new Promise<void>((resolve) => {
        if (callerSignal.aborted) {
          resolve();
          return;
        }
        callerSignal.addEventListener('abort', () => resolve(), {
          once: true,
        });
      });
      process.stderr.write('MCP_FIXTURE_ABORTED\n');
      return {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Repository evidence request failed.',
          recoverable: false,
        },
      };
    }
    const errorCode = question.startsWith('error:')
      ? question.slice('error:'.length)
      : '';
    const failure = errorResult(errorCode);
    return failure ?? successResult(request);
  }
}
