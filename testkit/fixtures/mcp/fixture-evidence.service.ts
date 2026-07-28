import {
  normalizeSearchTerms,
  type LocateExecutionContext,
  type LocateRequest,
  type LocateResult,
  type LocateStatus,
  type RepositoryEvidenceService,
} from '../../../src/contracts/index.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeRepositoryReader } from '../../../src/repository/node-repository-reader.js';
import { writeScrubbedDiagnostic } from '../../../src/mcp/diagnostic-scrubber.js';
import {
  CandidateFixtureBackend,
  candidateFixtureRoot,
} from '../candidate-policy/candidate-fixture-backend.js';

const FIXTURE_EVIDENCE_ID = `evidence:v1:${'0'.repeat(64)}`;
const MALFORMED_EVIDENCE_ID = `evidence:v1:${'1'.repeat(64)}`;
const DERIVED_EVIDENCE_ID = `evidence:v1:${'2'.repeat(64)}`;

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

function successResult(request: LocateRequest): LocateResult {
  const status = requestedStatus(request.question);
  const sourceMapping = request.question === 'source-field-mapping';
  const redactionOutput = request.question === 'redaction-output-parity';
  return {
    ok: true,
    evidence: {
      schemaVersion: '1.0',
      status,
      repositoryRoot: request.repoPath,
      normalizedTerms: normalizeSearchTerms(
        request.terms,
        request.termCase ?? 'smart',
      ),
      confirmed: sourceMapping || redactionOutput
        ? [
            {
              evidenceClass: 'confirmed',
              id: FIXTURE_EVIDENCE_ID,
              role: 'value-mapping',
              location: {
                file: 'server/mapping.ts',
                symbol: 'hcpId',
                lines: [1, 1],
                excerpt: redactionOutput
                  ? 'api_key=rawSecretValue; password="my secret value"; secret=\'abc,def\'; token=`my backtick secret`; passwd=`backtick,comma`; client_secret="my \\"escaped\\" secret"; dsn=postgres://admin:dbPassword@localhost/app?token=querySecret; owner=stan.guo@mail.ru; phone=+86 138-0013-8000'
                  : 'hcpId = hcp_id;',
              },
              provenance: {
                discoveredBy: ['ripgrep'],
                verifiedBy: 'filesystem',
                operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
              },
              reasonCodes: ['DIRECT_ALIAS_MAPPING', 'EXACT_TERM_MATCH'],
            },
            ...(redactionOutput
              ? [
                  {
                    evidenceClass: 'confirmed' as const,
                    id: MALFORMED_EVIDENCE_ID,
                    role: 'value-mapping' as const,
                    location: {
                      file: 'server/malformed.ts',
                      lines: [1, 1] as const,
                      excerpt: 'password="malformed shared value',
                    },
                    provenance: {
                      discoveredBy: ['ripgrep' as const],
                      verifiedBy: 'filesystem' as const,
                      operations: [
                        'RIPGREP_SEARCH' as const,
                        'FILESYSTEM_READ_RANGE' as const,
                      ],
                    },
                    reasonCodes: [
                      'DIRECT_ALIAS_MAPPING' as const,
                      'EXACT_TERM_MATCH' as const,
                    ],
                  },
                ]
              : []),
          ]
        : [],
      candidates: redactionOutput
        ? [
            {
              evidenceClass: 'candidate',
              id: DERIVED_EVIDENCE_ID,
              role: 'related',
              location: {
                file: 'server/derived.ts',
                lines: [1, 1],
                excerpt: 'const alias = "malformed shared value";',
              },
              provenance: {
                discoveredBy: ['ripgrep'],
                verifiedBy: 'filesystem',
                operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
              },
              reasonCodes: ['SAME_ENTITY_SIBLING'],
              promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
            },
          ]
        : [],
      coverage: {
        backends:
          status === 'backend_unavailable'
            ? [
                {
                  backend: 'ripgrep',
                  status: 'unavailable',
                  reasonCode: 'RIPGREP_UNAVAILABLE',
                  hitCount: 0,
                },
              ]
            : [],
        fallbackChecked: false,
        indexState: 'unknown',
        indexFreshness: 'not-applicable',
        limitsReached:
          status === 'partial'
            ? ['MAX_FILES_REACHED']
            : status === 'timeout'
              ? ['TIMEOUT_REACHED']
              : [],
        exclusionSummary: {},
      },
      nextActions:
        status === 'partial' || status === 'timeout'
          ? ['RETRY_WITH_HIGHER_LIMIT']
          : [],
    },
  };
}

function errorResult(code: string): LocateResult | undefined {
  if (
    code !== 'INVALID_REPOSITORY' &&
    code !== 'PATH_OUTSIDE_ROOT' &&
    code !== 'INTERNAL_ERROR'
  ) {
    return undefined;
  }
  return {
    ok: false,
    error: {
      code,
      message:
        'Unsafe fixture detail C:\\private\\repo\\secret.ts\n    at fixture (raw stderr)',
      recoverable: false,
      suggestedAction: 'ADD_TERM',
    },
  };
}

export class FixtureEvidenceService implements RepositoryEvidenceService {
  public async locate(
    request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<LocateResult> {
    if (request.question === 'redaction-output-parity') {
      writeScrubbedDiagnostic(
        'token=rawDiagnosticSecret C:\\private\\repo\\secret.ts stan.guo@mail.ru',
      );
    }
    if (request.question === 'candidate-minimal-loop') {
      const engine = createCanonicalLocateEngineHarnessV2([new CandidateFixtureBackend()],
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
    if (request.question === 'throw:INTERNAL_ERROR') {
      throw new Error(
        'Unsafe internal failure C:\\private\\repo\\secret.ts\n    at fixture (raw stderr)',
      );
    }
    if (request.question === 'wait-for-cancellation') {
      process.stderr.write('MCP_FIXTURE_STARTED\n');
      await new Promise<void>((resolve) => {
        if (context.signal.aborted) {
          resolve();
          return;
        }
        context.signal.addEventListener('abort', () => resolve(), {
          once: true,
        });
      });
      process.stderr.write('MCP_FIXTURE_ABORTED\n');
      return {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Cancelled fixture request.',
          recoverable: false,
        },
      };
    }
    const errorCode = request.question.startsWith('error:')
      ? request.question.slice('error:'.length)
      : '';
    const failure = errorResult(errorCode);
    return failure ?? successResult(request);
  }
}
