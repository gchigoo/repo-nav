import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import type {
  BackendHealth,
  BackendSearchRequest,
  BackendSearchResult,
  EvidenceLocation,
  LocateRequest,
  RepositoryReadLimits,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { RepositoryAccessError } from '../../src/contracts/index.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import {
  assertGoldenCase,
  GoldenCaseSchema,
  type GoldenSuccessCase,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const manifestRoot = resolve(repositoryRoot, 'testkit', 'manifests', 'golden');
const ENGINE_CASE_IDS = [
  'text-engine-baseline',
  'ripgrep-unavailable',
  'ripgrep-failed',
  'ripgrep-incomplete',
  'ripgrep-timeout',
] as const;
type EngineCaseId = (typeof ENGINE_CASE_IDS)[number];

const EXPECTED_STATE = Object.freeze({
  'text-engine-baseline': {
    backend: {
      backend: 'ripgrep',
      status: 'used',
      completion: 'complete',
      termination: 'none',
      hitCount: 1,
    },
    limitsReached: [],
    nextActions: [],
  },
  'ripgrep-unavailable': {
    backend: {
      backend: 'ripgrep',
      status: 'unavailable',
      completion: 'incomplete',
      termination: 'none',
      reasonCode: 'RIPGREP_UNAVAILABLE',
      hitCount: 0,
    },
    limitsReached: [],
    nextActions: [],
  },
  'ripgrep-failed': {
    backend: {
      backend: 'ripgrep',
      status: 'failed',
      completion: 'incomplete',
      termination: 'process-error',
      reasonCode: 'BACKEND_PROCESS_FAILED',
      hitCount: 0,
    },
    limitsReached: [],
    nextActions: [],
  },
  'ripgrep-incomplete': {
    backend: {
      backend: 'ripgrep',
      status: 'used',
      completion: 'incomplete',
      termination: 'early-stop',
      hitCount: 1,
    },
    limitsReached: ['MAX_BACKEND_HITS_REACHED'],
    nextActions: ['CONFIRM_CANDIDATE'],
  },
  'ripgrep-timeout': {
    backend: {
      backend: 'ripgrep',
      status: 'failed',
      completion: 'incomplete',
      termination: 'timeout',
      reasonCode: 'BACKEND_PROCESS_FAILED',
      hitCount: 0,
    },
    limitsReached: [],
    nextActions: [],
  },
} as const);

class FixtureBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public constructor(private readonly result: BackendSearchResult) {}

  public async probe(): Promise<BackendHealth> {
    return this.result.health;
  }

  public async search(
    _request: BackendSearchRequest,
    _signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    return this.result;
  }
}

function backendResult(caseId: EngineCaseId | 'no-result'): BackendSearchResult {
  if (caseId === 'ripgrep-unavailable') {
    return {
      health: { state: 'missing', reasonCode: 'RIPGREP_UNAVAILABLE' },
      hits: [],
      complete: false,
    };
  }
  if (caseId === 'ripgrep-failed') {
    return {
      health: { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
      hits: [],
      complete: false,
    };
  }
  if (caseId === 'ripgrep-timeout') {
    return {
      health: { state: 'unavailable', reasonCode: 'BACKEND_ABORTED' },
      hits: [],
      complete: false,
    };
  }
  if (caseId === 'no-result') {
    return {
      health: { state: 'available', reasonCode: 'RIPGREP_NO_RESULT' },
      hits: [],
      complete: true,
    };
  }
  const incomplete = caseId === 'ripgrep-incomplete';
  const excerpt = incomplete
    ? 'consume(row.source_field);'
    : 'targetField = row.source_field;';
  const line = incomplete ? 2 : 1;
  return {
    health: { state: 'available' },
    hits: [
      {
        file: 'server/mapping.fixture',
        lines: [line, line],
        matchedText: excerpt,
        source: 'ripgrep',
        reasonCodes: ['LITERAL_TERM_HIT'],
      },
    ],
    complete: !incomplete,
  };
}

function loadCase(caseId: EngineCaseId): GoldenSuccessCase {
  const input: unknown = parse(
    readFileSync(resolve(manifestRoot, `${caseId}.yaml`), 'utf8'),
  );
  const parsed = GoldenCaseSchema.parse(input);
  if (parsed.kind !== 'success') {
    throw new Error(`${caseId} must be a success case.`);
  }
  return parsed;
}

async function observe(
  goldenCase: GoldenSuccessCase,
  result: BackendSearchResult,
): Promise<any> {
  const service = createCanonicalLocateEngineHarnessV2([new FixtureBackend(result)],
    new NodeRepositoryReader(),
  ).service;
  const locateResult = await service.locate(goldenCase.request, {
    signal: new AbortController().signal,
  });
  return {
    result: locateResult,
    mcpIsError: !locateResult.ok,
    structuredContent: locateResult,
    textContent: JSON.stringify(locateResult),
  };
}

function defineEngineCase(caseId: EngineCaseId): void {
  const identity = { group: 'text-evidence-engine', caseId } as const;
  describe.runIf(isSelected(identity))(caseId, () => {
    it('matches its versioned status and coverage manifest', async () => {
      const goldenCase = loadCase(caseId);
      const observation = await observe(goldenCase, backendResult(caseId));
      expect(() => assertGoldenCase(goldenCase, observation as any)).not.toThrow();
      if (!observation.result.ok) {
        throw new Error('Engine Golden observation must be successful.');
      }
      expect(observation.result.evidence.coverage).toMatchObject({
        fallbackChecked: false,
        indexState: 'unknown',
        indexFreshness: 'unknown',
      });
      expect(observation.result.evidence.coverage.backends).toHaveLength(1);
      expect(observation.result.evidence.coverage.backends[0]).toEqual(
        EXPECTED_STATE[caseId].backend,
      );
      expect(observation.result.evidence.coverage.limitsReached).toEqual(
        EXPECTED_STATE[caseId].limitsReached,
      );
      expect(observation.result.evidence.nextActions).toEqual(
        EXPECTED_STATE[caseId].nextActions,
      );
    });
  });
}

for (const caseId of ENGINE_CASE_IDS) {
  defineEngineCase(caseId);
}

const baselineIdentity = {
  group: 'text-evidence-engine',
  caseId: 'text-engine-baseline',
} as const;
describe.runIf(isSelected(baselineIdentity))('text engine no-result baseline', () => {
  it('distinguishes complete no-result from backend failure', async () => {
    const goldenCase = loadCase('text-engine-baseline');
    const observation = await observe(goldenCase, backendResult('no-result'));
    expect(observation.result).toMatchObject({
      ok: true,
      evidence: {
        status: 'no_result',
        confirmed: [],
        candidates: [],
        coverage: {
          backends: [
            {
              backend: 'ripgrep',
              status: 'used',
              completion: 'complete',
              termination: 'none',
              reasonCode: 'RIPGREP_NO_RESULT',
              hitCount: 0,
            },
          ],
          limitsReached: [],
        },
        nextActions: ['ADD_TERM', 'ADD_SYMBOL_ANCHOR'],
      },
    });
  });
});

describe.runIf(isSelected(baselineIdentity))('text engine verified metadata', () => {
  it.each(['term', 'table', 'route'] as const)(
    'carries a %s anchor into filesystem verification',
    async (kind) => {
      const goldenCase = loadCase('text-engine-baseline');
      const request: LocateRequest = {
        ...goldenCase.request,
        terms: ['targetField'],
        anchors: [{ kind, value: 'row.source_field' }],
      };
      const service = createCanonicalLocateEngineHarnessV2([new FixtureBackend(backendResult('text-engine-baseline'))],
        new NodeRepositoryReader(),
      ).service;
      const result = await service.locate(request, {
        signal: new AbortController().signal,
      });
      expect(result).toMatchObject({
        ok: true,
        evidence: {
          status: 'partial',
          confirmed: [
            {
              role: 'value-mapping',
              location: { file: 'server/mapping.fixture' },
            },
          ],
          candidates: [],
        },
      });
    },
  );

  it('rejects an unsafe backend path at the engine boundary', async () => {
    const backend = new FixtureBackend({
      health: { state: 'available' },
      hits: [
        {
          file: '../secret',
          lines: [1, 1],
          matchedText: 'targetField = row.source_field;',
          source: 'ripgrep',
          reasonCodes: ['LITERAL_TERM_HIT'],
        },
      ],
      complete: true,
    });
    const service = createCanonicalLocateEngineHarnessV2([backend],
      new NodeRepositoryReader(),
    ).service;
    const result = await service.locate(loadCase('text-engine-baseline').request, {
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'PATH_OUTSIDE_ROOT', recoverable: false },
    });
  });

  it('surfaces an invalid repository raised during verification', async () => {
    class InvalidatingReader extends NodeRepositoryReader {
      public override async readRange(): Promise<EvidenceLocation> {
        throw new RepositoryAccessError('INVALID_REPOSITORY');
      }
    }
    const service = createCanonicalLocateEngineHarnessV2([new FixtureBackend(backendResult('text-engine-baseline'))],
      new InvalidatingReader(),
    ).service;
    const result = await service.locate(loadCase('text-engine-baseline').request, {
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY', recoverable: true },
    });
  });

  it('confirms a multiline mapping through the real ripgrep-to-reader chain', async () => {
    const service = createCanonicalLocateEngineHarnessV2([new RipgrepBackend(new NodeSafeProcessRunner())],
      new NodeRepositoryReader(),
    ).service;
    const result = await service.locate(
      {
        ...loadCase('text-engine-baseline').request,
        limits: {
          timeoutMs: 30_000,
          maxFiles: 20,
          maxConfirmed: 20,
          maxCandidates: 20,
        },
      },
      { signal: new AbortController().signal },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`Real text engine failed: ${result.error.code}`);
    }
    expect(result.evidence.status).toBe('partial');
    // Oversized verified content is redacted in public output (not a reader limit).
    expect(result.evidence.coverage.limitsReached).not.toContain(
      'MAX_EXCERPT_BYTES_REACHED',
    );
    expect(result.evidence.nextActions).toEqual(['CONFIRM_CANDIDATE']);
    expect(result.evidence.confirmed).toContainEqual(
      expect.objectContaining({
        role: 'value-mapping',
        location: expect.objectContaining({
          file: 'server/multiline.fixture',
          lines: [1, 2],
          excerpt: 'return {\n  targetField: row.source_field',
        }),
      }),
    );
    expect(result.evidence.confirmed).toContainEqual(
      expect.objectContaining({
        location: expect.objectContaining({
          file: 'server/window-12.fixture',
          lines: [1, 12],
        }),
      }),
    );
    expect(result.evidence.confirmed).toContainEqual(
      expect.objectContaining({
        location: expect.objectContaining({
          file: 'server/window-4096.fixture',
          lines: [1, 2],
          excerpt: '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]',
        }),
      }),
    );
    expect(result.evidence.confirmed).not.toContainEqual(
      expect.objectContaining({
        location: expect.objectContaining({
          file: 'server/window-13.fixture',
        }),
      }),
    );
    expect(result.evidence.confirmed).not.toContainEqual(
      expect.objectContaining({
        location: expect.objectContaining({
          file: 'server/window-4097.fixture',
        }),
      }),
    );
    expect(result.evidence.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: expect.objectContaining({
            file: 'server/window-13.fixture',
            lines: [2, 13],
          }),
        }),
        expect.objectContaining({
          location: expect.objectContaining({
            file: 'server/window-4097.fixture',
            lines: [2, 2],
          }),
        }),
      ]),
    );
  });

  it('keeps multiple canonical symbol facts stable across anchor permutations', async () => {
    const service = createCanonicalLocateEngineHarnessV2([new RipgrepBackend(new NodeSafeProcessRunner())],
      new NodeRepositoryReader(),
    ).service;
    const locate = async (
      symbols: readonly ['Alpha', 'Zeta'] | readonly ['Zeta', 'Alpha'],
      limits?: LocateRequest['limits'],
    ) =>
      await service.locate(
        {
          ...loadCase('text-engine-baseline').request,
          terms: ['required-but-absent'],
          anchors: symbols.map((value) => ({ kind: 'symbol' as const, value })),
          ...(limits === undefined ? {} : { limits }),
        },
        { signal: new AbortController().signal },
      );

    const forward = await locate(['Alpha', 'Zeta']);
    const reversed = await locate(['Zeta', 'Alpha']);
    expect(forward.ok).toBe(true);
    expect(reversed.ok).toBe(true);
    if (!forward.ok || !reversed.ok) {
      throw new Error('expected success');
    }
    // requestIndex follows request order; public confirmed projection stays stable.
    expect(forward.evidence.confirmed).toEqual(reversed.evidence.confirmed);
    expect(forward.evidence.status).toBe(reversed.evidence.status);
    expect(forward).toMatchObject({
      ok: true,
      evidence: {
        status: 'partial',
        confirmed: [
          {
            role: 'execution-site',
            location: {
              file: 'server/multi-symbol.fixture',
              symbol: 'Zeta',
            },
          },
        ],
        candidates: [],
      },
    });

    const oneFactBudget = await locate(['Alpha', 'Zeta'], {
      maxFiles: 1,
      maxConfirmed: 1,
      maxCandidates: 0,
    });
    expect(oneFactBudget).toMatchObject({
      ok: true,
      evidence: {
        status: 'partial',
        confirmed: [],
        candidates: [],
        coverage: {
          limitsReached: ['MAX_CANDIDATES_REACHED'],
        },
        nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
      },
    });

    const twoFactBudget = await locate(['Zeta', 'Alpha'], {
      maxFiles: 1,
      maxConfirmed: 1,
      maxCandidates: 1,
    });
    expect(twoFactBudget).toMatchObject({
      ok: true,
      evidence: {
        status: 'partial',
        confirmed: [{ location: { symbol: 'Zeta' } }],
        candidates: [],
        coverage: { limitsReached: ['MAX_CONFIRMED_REACHED'] },
        nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
      },
    });
  });
});

const timeoutIdentity = {
  group: 'text-evidence-engine',
  caseId: 'ripgrep-timeout',
} as const;
describe.runIf(isSelected(timeoutIdentity))('text engine partial timeout evidence', () => {
  it('keeps evidence verified before a caller abort', async () => {
    const caller = new AbortController();
    let reads = 0;
    class AbortingReader extends NodeRepositoryReader {
      public override async readRange(
        repository: string,
        file: string,
        lines: readonly [number, number],
        limits: RepositoryReadLimits,
        signal: AbortSignal,
      ): Promise<EvidenceLocation> {
        reads += 1;
        if (reads === 2) {
          caller.abort();
          throw new RepositoryAccessError('ABORTED', file);
        }
        return await super.readRange(repository, file, lines, limits, signal);
      }
    }
    const backend = new FixtureBackend({
      health: { state: 'available' },
      hits: [
        {
          file: 'server/mapping.fixture',
          lines: [1, 1],
          matchedText: 'targetField = row.source_field;',
          source: 'ripgrep',
          reasonCodes: ['LITERAL_TERM_HIT'],
        },
        {
          file: 'server/mapping.fixture',
          lines: [2, 2],
          matchedText: 'consume(row.source_field);',
          source: 'ripgrep',
          reasonCodes: ['LITERAL_TERM_HIT'],
        },
      ],
      complete: true,
    });
    const service = createCanonicalLocateEngineHarnessV2([backend], new AbortingReader()).service;
    const result = await service.locate(loadCase('text-engine-baseline').request, {
      signal: caller.signal,
    });
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        status: 'cancelled',
        confirmed: [{ location: { lines: [1, 1] } }],
        candidates: [],
        coverage: {
          limitsReached: [],
          abortSource: 'caller',
        },
        nextActions: [],
      },
    });
  });
});
