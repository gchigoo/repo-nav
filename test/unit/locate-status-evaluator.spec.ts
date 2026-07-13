import { describe, expect, it } from 'vitest';

import {
  RepositoryAccessError,
  resolveLocateLimits,
  TOOL_ERROR_CODES,
  type BackendHealth,
  type BackendSearchRequest,
  type BackendSearchResult,
  type EvidenceLocation,
  type NormalizedSearchTerm,
  type RepositoryReader,
  type RepositoryReadLimits,
  type RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { LocateAbortCoordinator } from '../../src/evidence/abort-source.js';
import { RepositoryEvidenceEngine } from '../../src/evidence/repository-evidence-engine.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import {
  evaluateLocateStatus,
  LOCATE_TRANSITION_ROW_IDS,
  type LocateStatusEvaluationInput,
  type LocateTransitionRowId,
} from '../../src/evidence/locate-status-evaluator.js';
import { createNextActions } from '../../src/evidence/next-action-policy.js';
import { isSelected } from '../../testkit/testing/selection.js';

const available = { state: 'available' as const };
const unavailable = {
  state: 'unavailable' as const,
  reasonCode: 'RIPGREP_UNAVAILABLE' as const,
};

function input(
  overrides: Partial<LocateStatusEvaluationInput> = {},
): LocateStatusEvaluationInput {
  return {
    abortSource: 'none',
    finalBackendHealth: available,
    strategyComplete: true,
    evidenceCount: 0,
    limitsReached: [],
    ...overrides,
  };
}

const TRANSITION_FIXTURE_ROWS: readonly LocateTransitionRowId[] = [
  'invalid-input',
  'invalid-repository',
  'path-outside-root',
  'internal-error',
  'caller-abort',
  'internal-deadline',
  'backend-unavailable',
  'coverage-gap',
  'verified-evidence',
  'verified-no-result',
];

describe.runIf(
  isSelected({
    group: 'locate-status',
    caseId: 'transition-matrix-completeness',
  }),
)('Locate transition matrix completeness', () => {
  it('keeps one fixture row for every approved transition predicate', () => {
    expect(TRANSITION_FIXTURE_ROWS).toEqual(LOCATE_TRANSITION_ROW_IDS);
    expect(new Set(TRANSITION_FIXTURE_ROWS).size).toBe(
      LOCATE_TRANSITION_ROW_IDS.length,
    );
    expect(TRANSITION_FIXTURE_ROWS.slice(0, 4)).toEqual(
      TOOL_ERROR_CODES.map((code) => code.toLocaleLowerCase().replaceAll('_', '-')),
    );
  });

  it('applies timeout, unavailable, coverage-gap, and result priority', () => {
    expect(
      evaluateLocateStatus(
        input({
          abortSource: 'caller',
          finalBackendHealth: unavailable,
          strategyComplete: false,
          evidenceCount: 1,
          limitsReached: ['MAX_FILES_REACHED'],
        }),
      ),
    ).toEqual({ status: 'timeout', rowId: 'caller-abort' });
    expect(
      evaluateLocateStatus(
        input({ finalBackendHealth: unavailable, strategyComplete: false }),
      ),
    ).toEqual({
      status: 'backend_unavailable',
      rowId: 'backend-unavailable',
    });
    expect(
      evaluateLocateStatus(
        input({ strategyComplete: false, evidenceCount: 1 }),
      ),
    ).toEqual({ status: 'partial', rowId: 'coverage-gap' });
    expect(evaluateLocateStatus(input({ evidenceCount: 1 }))).toEqual({
      status: 'ok',
      rowId: 'verified-evidence',
    });
    expect(evaluateLocateStatus(input())).toEqual({
      status: 'no_result',
      rowId: 'verified-no-result',
    });
  });

  it('locks the first abort source and keeps backend fixed timeouts separate', () => {
    const deadlineFirst = new LocateAbortCoordinator();
    expect(deadlineFirst.abort('deadline')).toBe(true);
    expect(deadlineFirst.abort('caller')).toBe(false);
    expect(deadlineFirst.source).toBe('deadline');
    const callerFirst = new LocateAbortCoordinator();
    expect(callerFirst.abort('caller')).toBe(true);
    expect(callerFirst.abort('deadline')).toBe(false);
    expect(callerFirst.source).toBe('caller');

    for (const [abortSource, expectedActions] of [
      [deadlineFirst.source, ['RETRY_WITH_HIGHER_LIMIT']],
      [callerFirst.source, []],
    ] as const) {
      const status = evaluateLocateStatus(input({ abortSource })).status;
      expect(status).toBe('timeout');
      expect(
        createNextActions({
          status,
          hasCandidates: false,
          limitsReached: ['TIMEOUT_REACHED'],
          abortSource,
          limits: resolveLocateLimits({ timeoutMs: 1_000 }),
        }),
      ).toEqual(expectedActions);
    }

    expect(
      evaluateLocateStatus(
        input({
          finalBackendHealth: {
            state: 'unavailable',
            reasonCode: 'BACKEND_ABORTED',
          },
          strategyComplete: false,
        }),
      ),
    ).toEqual({ status: 'backend_unavailable', rowId: 'backend-unavailable' });
  });
});

describe.runIf(
  isSelected({
    group: 'locate-status',
    caseId: 'hit-unverified-fallback-complete',
  }),
)('hit-unverified with complete fallback', () => {
  it('returns no_result only after the required fallback completes', () => {
    expect(evaluateLocateStatus(input())).toEqual({
      status: 'no_result',
      rowId: 'verified-no-result',
    });
  });
});

describe.runIf(
  isSelected({
    group: 'locate-status',
    caseId: 'hit-unverified-fallback-unavailable',
  }),
)('hit-unverified with unavailable fallback', () => {
  it('uses backend_unavailable instead of incomplete no_result', () => {
    expect(
      evaluateLocateStatus(
        input({ finalBackendHealth: unavailable, strategyComplete: false }),
      ),
    ).toMatchObject({ status: 'backend_unavailable' });
  });
});

for (const [caseId, evidenceCount] of [
  ['caller-abort-empty', 0],
  ['caller-abort-with-evidence', 1],
] as const) {
  describe.runIf(isSelected({ group: 'locate-status', caseId }))(caseId, () => {
    it('gives caller abort priority and never suggests retry', () => {
      const evaluation = evaluateLocateStatus(
        input({ abortSource: 'caller', evidenceCount }),
      );
      expect(evaluation).toEqual({ status: 'timeout', rowId: 'caller-abort' });
      expect(
        createNextActions({
          status: evaluation.status,
          hasCandidates: false,
          limitsReached: ['TIMEOUT_REACHED'],
          abortSource: 'caller',
          limits: resolveLocateLimits({ timeoutMs: 1_000 }),
        }),
      ).toEqual([]);
    });
  });
}

for (const [caseId, timeoutMs, expectedActions] of [
  ['internal-deadline-below-max', 1_000, ['RETRY_WITH_HIGHER_LIMIT']],
  ['internal-deadline-at-max', 30_000, []],
] as const) {
  describe.runIf(isSelected({ group: 'locate-status', caseId }))(caseId, () => {
    it('maps an internal deadline and only retries below the schema maximum', () => {
      const evaluation = evaluateLocateStatus(
        input({ abortSource: 'deadline' }),
      );
      expect(evaluation).toEqual({
        status: 'timeout',
        rowId: 'internal-deadline',
      });
      expect(
        createNextActions({
          status: evaluation.status,
          hasCandidates: false,
          limitsReached: ['TIMEOUT_REACHED'],
          abortSource: 'deadline',
          limits: resolveLocateLimits({ timeoutMs }),
        }),
      ).toEqual(expectedActions);
    });
  });
}

describe.runIf(
  isSelected({
    group: 'locate-status',
    caseId: 'internal-deadline-below-max',
  }),
)('engine-owned internal deadline', () => {
  it('distinguishes its own deadline from a caller abort', async () => {
    class DeadlineBackend implements RepositorySearchBackend {
      public readonly id = 'ripgrep' as const;

      public async probe(): Promise<BackendHealth> {
        return { state: 'available' };
      }

      public async search(
        _request: BackendSearchRequest,
        signal: AbortSignal,
      ): Promise<BackendSearchResult> {
        await new Promise<void>((resolve) => {
          if (signal.aborted) {
            resolve();
            return;
          }
          signal.addEventListener('abort', () => resolve(), { once: true });
        });
        return {
          health: { state: 'error', reasonCode: 'BACKEND_ABORTED' },
          hits: [],
          complete: false,
        };
      }
    }

    const result = await new RepositoryEvidenceEngine(
      [new DeadlineBackend()],
      new NodeRepositoryReader(),
    ).locate(
      {
        repoPath: '.',
        question: 'Wait for the engine deadline.',
        terms: ['deadlineProbe'],
        limits: { timeoutMs: 1_000 },
      },
      { signal: new AbortController().signal },
    );
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        status: 'timeout',
        coverage: { limitsReached: ['TIMEOUT_REACHED'] },
        nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
      },
    });
  });
});

describe.runIf(
  isSelected({ group: 'locate-status', caseId: 'internal-deadline-below-max' }),
)('backend-owned fixed process timeout', () => {
  it('does not present a fixed backend timeout as a caller-adjustable deadline', async () => {
    class FixedTimeoutBackend implements RepositorySearchBackend {
      public readonly id = 'ripgrep' as const;

      public async probe(): Promise<BackendHealth> {
        return { state: 'available' };
      }

      public async search(): Promise<BackendSearchResult> {
        return {
          health: { state: 'unavailable', reasonCode: 'BACKEND_ABORTED' },
          hits: [],
          complete: false,
        };
      }
    }

    const result = await new RepositoryEvidenceEngine(
      [new FixedTimeoutBackend()],
      new NodeRepositoryReader(),
    ).locate(
      {
        repoPath: '.',
        question: 'Backend process timed out independently.',
        terms: ['fixedTimeoutProbe'],
        limits: { timeoutMs: 20_000 },
      },
      { signal: new AbortController().signal },
    );
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        status: 'backend_unavailable',
        coverage: { limitsReached: [] },
        nextActions: [],
      },
    });
  });
});

class MultiHitCodeGraphBackend implements RepositorySearchBackend {
  public readonly id = 'codegraph' as const;

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(): Promise<BackendSearchResult> {
    const matchedText = 'const hcpId = row.hcp_id;';
    return {
      health: { state: 'available' },
      hits: [
        {
          file: 'server/a.ts',
          lines: [1, 1],
          matchedText,
          source: 'codegraph',
          reasonCodes: ['SYMBOL_SEARCH_HIT'],
        },
        {
          file: 'server/b.ts',
          lines: [1, 1],
          matchedText,
          source: 'codegraph',
          reasonCodes: ['SYMBOL_SEARCH_HIT'],
        },
      ],
      complete: true,
      canSkipFallbackIfVerified: true,
    };
  }
}

class InterruptingReader implements RepositoryReader {
  private readCount = 0;

  public constructor(
    private readonly interruption: 'caller' | 'deadline',
    private readonly callerController: AbortController,
  ) {}

  public async resolveRoot(): Promise<string> {
    return 'D:/fixture/repository';
  }

  public async readRange(
    _repositoryRoot: string,
    relativeFile: string,
    _lines: readonly [number, number],
    _limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    this.readCount += 1;
    if (this.readCount === 1) {
      return {
        file: relativeFile,
        lines: [1, 1],
        excerpt: 'const hcpId = row.hcp_id;',
      };
    }
    if (this.interruption === 'caller') {
      this.callerController.abort(new Error('caller stopped the request'));
    } else {
      await new Promise<void>((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }
        signal.addEventListener('abort', () => resolve(), { once: true });
      });
    }
    throw new RepositoryAccessError('ABORTED', relativeFile);
  }

  public async readWindow(): Promise<EvidenceLocation> {
    throw new Error('readWindow must not run after verification abort.');
  }

  public async findMatches(
    _repositoryRoot: string,
    _relativeFile: string,
    _terms: readonly NormalizedSearchTerm[],
  ): Promise<readonly EvidenceLocation[]> {
    throw new Error('findMatches is not used by line-addressed hits.');
  }
}

for (const [caseId, interruption, timeoutMs] of [
  ['caller-abort-with-evidence', 'caller', 30_000],
  ['internal-deadline-below-max', 'deadline', 1_000],
] as const) {
  describe.runIf(isSelected({ group: 'locate-status', caseId }))(
    `CodeGraph ${interruption} evidence preservation`,
    () => {
      it('retains verification completed before the abort', async () => {
        const callerController = new AbortController();
        const result = await new RepositoryEvidenceEngine(
          [new MultiHitCodeGraphBackend()],
          new InterruptingReader(interruption, callerController),
        ).locate(
          {
            repoPath: 'D:/fixture/repository',
            question: 'Preserve completed verification.',
            terms: ['hcpId', 'row.hcp_id'],
            limits: { timeoutMs },
          },
          { signal: callerController.signal },
        );
        expect(result.ok).toBe(true);
        if (!result.ok) {
          throw new Error('Expected a timeout EvidencePack.');
        }
        expect(result.evidence.status).toBe('timeout');
        expect(
          result.evidence.confirmed.length + result.evidence.candidates.length,
        ).toBeGreaterThan(0);
        expect(result.evidence.coverage.limitsReached).toContain(
          'TIMEOUT_REACHED',
        );
        expect(result.evidence.nextActions).toEqual(
          interruption === 'deadline' ? ['RETRY_WITH_HIGHER_LIMIT'] : [],
        );
      });
    },
  );
}
