import {
  normalizeSearchTerms,
  type LocateExecutionContext,
  type LocateRequest,
  type LocateResult,
  type LocateStatus,
  type RepositoryEvidenceService,
} from '../../../src/contracts/index.js';

const FIXTURE_EVIDENCE_ID = `evidence:v1:${'0'.repeat(64)}`;

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
      confirmed: sourceMapping
        ? [
            {
              evidenceClass: 'confirmed',
              id: FIXTURE_EVIDENCE_ID,
              role: 'value-mapping',
              location: {
                file: 'server/mapping.ts',
                symbol: 'hcpId',
                lines: [1, 1],
                excerpt: 'hcpId = hcp_id;',
              },
              provenance: {
                discoveredBy: ['ripgrep'],
                verifiedBy: 'filesystem',
                operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
              },
              reasonCodes: ['DIRECT_ALIAS_MAPPING', 'EXACT_TERM_MATCH'],
            },
          ]
        : [],
      candidates: [],
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
    },
  };
}

export class FixtureEvidenceService implements RepositoryEvidenceService {
  public async locate(
    request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<LocateResult> {
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
