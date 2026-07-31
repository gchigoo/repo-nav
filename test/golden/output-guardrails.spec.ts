import { describe, expect, it } from 'vitest';

import {
  RepositoryAccessError,
  type BackendHealth,
  type BackendHit,
  type BackendSearchRequest,
  type BackendSearchResult,
  type EvidenceLocation,
  type LocateRequest,
  type NormalizedSearchTerm,
  type RepositoryReader,
  type RepositoryReadLimits,
  type RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { OVERSIZED_CONTENT_PLACEHOLDER } from '../../src/evidence/evidence-redactor.js';
import { isSelected } from '../../testkit/testing/selection.js';

class GuardrailBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public constructor(private readonly hits: readonly BackendHit[]) {}

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    _request: BackendSearchRequest,
    _signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    return {
      health: { state: 'available' },
      hits: this.hits,
      complete: true,
    };
  }
}

class GuardrailReader implements RepositoryReader {
  public constructor(
    private readonly excerpts: Readonly<Record<string, string>>,
    private readonly failure?:
      | 'MAX_FILE_BYTES_REACHED'
      | 'MAX_EXCERPT_BYTES_REACHED'
      | 'BINARY_FILE',
  ) {}

  public async resolveRoot(): Promise<string> {
    return 'C:/guardrail-repository';
  }

  public async readRange(
    _repositoryRoot: string,
    relativeFile: string,
    lines: readonly [number, number],
  ): Promise<EvidenceLocation> {
    if (this.failure !== undefined) {
      throw new RepositoryAccessError(this.failure, relativeFile);
    }
    const excerpt = this.excerpts[relativeFile];
    if (excerpt === undefined) {
      throw new RepositoryAccessError('FILE_UNREADABLE', relativeFile);
    }
    return { file: relativeFile, lines, excerpt };
  }

  public async readWindow(
    repositoryRoot: string,
    relativeFile: string,
    focusLines: readonly [number, number],
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    return await this.readRange(repositoryRoot, relativeFile, focusLines);
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

function hit(file: string, matchedText: string): BackendHit {
  return {
    file,
    lines: [1, 1],
    matchedText,
    source: 'ripgrep',
    reasonCodes: ['LITERAL_TERM_HIT'],
  };
}

function request(
  terms: readonly string[],
  limits: LocateRequest['limits'],
): LocateRequest {
  return {
    repoPath: 'C:/guardrail-repository',
    question: 'Verify output guardrails.',
    terms,
    termCase: 'sensitive',
    layers: ['server'],
    ...(limits === undefined ? {} : { limits }),
  };
}

async function locate(
  hits: readonly BackendHit[],
  excerpts: Readonly<Record<string, string>>,
  locateRequest: LocateRequest,
  failure?: 'MAX_FILE_BYTES_REACHED' | 'MAX_EXCERPT_BYTES_REACHED',
) {
  return await createCanonicalLocateEngineHarnessV2([new GuardrailBackend(hits)],
    new GuardrailReader(excerpts, failure),
  ).service.locate(locateRequest, { signal: new AbortController().signal });
}

async function locateUnreadable(
  hits: readonly BackendHit[],
  excerpts: Readonly<Record<string, string>>,
  locateRequest: LocateRequest,
  failure: 'BINARY_FILE',
) {
  return await createCanonicalLocateEngineHarnessV2([new GuardrailBackend(hits)],
    new GuardrailReader(excerpts, failure),
  ).service.locate(locateRequest, { signal: new AbortController().signal });
}

describe.runIf(
  isSelected({ group: 'result-limits', caseId: 'partial-empty-limit' }),
)('empty result limit guardrails', () => {
  it('reports candidate truncation only when an eligible candidate exists', async () => {
    const excerpt = 'consume(api_key);';
    const result = await locate(
      [hit('server/candidate.ts', excerpt)],
      { 'server/candidate.ts': excerpt },
      request(['api_key'], { maxCandidates: 0 }),
    );
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        status: 'no_result',
        confirmed: [],
        candidates: [],
        coverage: { limitsReached: ['MAX_CANDIDATES_REACHED'] },
        nextActions: ['ADD_TERM', 'ADD_SYMBOL_ANCHOR'],
      },
    });
  });

  it('maps maxFiles and fixed reader caps without retrying fixed safety limits', async () => {
    const first = 'firstTarget = sourceField;';
    const second = 'secondTarget = sourceField;';
    const filesResult = await locate(
      [
        hit('server/zeta.ts', second),
        hit('server/alpha.ts', first),
      ],
      { 'server/alpha.ts': first, 'server/zeta.ts': second },
      request(['firstTarget', 'sourceField'], { maxFiles: 1 }),
    );
    expect(filesResult).toMatchObject({
      ok: true,
      evidence: {
        status: 'ok',
        coverage: { limitsReached: ['MAX_FILES_REACHED'] },
        nextActions: [],
      },
    });

    for (const code of [
      'MAX_FILE_BYTES_REACHED',
      'MAX_EXCERPT_BYTES_REACHED',
    ] as const) {
      const fixedResult = await locate(
        [hit('server/fixed.ts', first)],
        { 'server/fixed.ts': first },
        request(['sourceField'], undefined),
        code,
      );
      // Reader-cap failures drop the hit before selected-ledger contribution,
      // so public coverage keeps empty limits/exclusions and no_result status.
      expect(fixedResult).toMatchObject({
        ok: true,
        evidence: {
          status: 'no_result',
          coverage: {
            limitsReached: [],
            exclusionSummary: {},
          },
          nextActions: ['ADD_TERM', 'ADD_SYMBOL_ANCHOR'],
        },
      });
      void code;
    }
  });
});

describe.runIf(
  isSelected({ group: 'result-limits', caseId: 'partial-with-evidence' }),
)('bounded evidence selection', () => {
  it('retains stable evidence before reporting maxConfirmed truncation', async () => {
    const alpha = 'alphaTarget = sourceField;';
    const zeta = 'zetaTarget = sourceField;';
    const hits = [
      hit('server/zeta.ts', zeta),
      hit('server/alpha.ts', alpha),
    ];
    const excerpts = { 'server/alpha.ts': alpha, 'server/zeta.ts': zeta };
    const locateRequest = request(
      ['alphaTarget', 'zetaTarget', 'sourceField'],
      {
      maxFiles: 2,
      maxConfirmed: 1,
      },
    );
    const forward = await locate(hits, excerpts, locateRequest);
    const reverse = await locate([...hits].reverse(), excerpts, locateRequest);
    expect(forward).toEqual(reverse);
    expect(forward).toMatchObject({
      ok: true,
      evidence: {
        status: 'ok',
        confirmed: [{ location: { file: 'server/alpha.ts' } }],
        coverage: { limitsReached: ['MAX_CONFIRMED_REACHED'] },
        nextActions: [],
      },
    });
  });
});

for (const caseId of ['secret-redaction', 'redaction-metadata'] as const) {
  describe.runIf(isSelected({ group: 'output-redaction', caseId }))(caseId, () => {
    it('redacts after ID creation and exposes deterministic metadata', async () => {
      const excerpt = 'api_key = "rawSecretValue"; password="my secret value"; secret=\'abc,def\'; token=`my backtick secret`; passwd=`backtick,comma`; client_secret="my \\"escaped\\" secret";';
      const result = await locate(
        [hit('server/sample-config.ts', excerpt)],
        { 'server/sample-config.ts': excerpt },
        request(['api_key'], undefined),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error('Expected a recoverable redacted result.');
      }
      const publicEvidence = [
        ...result.evidence.confirmed,
        ...result.evidence.candidates,
      ][0];
      expect(publicEvidence?.location.redaction).toEqual({
        applied: true,
        fields: [
          {
            field: 'excerpt',
            reasonCodes: ['SECRET_LIKE_VALUE'],
          },
        ],
      });
      expect(publicEvidence?.location.excerpt).toBe(
        'api_key = "[REDACTED]"; password="[REDACTED]"; secret=\'[REDACTED]\'; token=`[REDACTED]`; passwd=`[REDACTED]`; client_secret="[REDACTED]";',
      );
      expect(publicEvidence?.id).toMatch(/^evidence:v2:\d{4,}$/u);
      for (const forbidden of [
        'rawSecretValue',
        'my secret value',
        'abc,def',
        'my backtick secret',
        'backtick,comma',
        'escaped',
      ]) {
        expect(JSON.stringify(result)).not.toContain(forbidden);
      }
    });
  });
}

describe.runIf(
  isSelected({ group: 'output-redaction', caseId: 'redaction-metadata' }),
)('malformed secret propagation in the real evidence engine', () => {
  it('removes a malformed tail reused by another verified evidence item', async () => {
    const rawSecret = 'malformed shared value';
    const seed = `aliasProbe; api_key="${rawSecret}`;
    const derived = `aliasProbe; const alias = "${rawSecret}";`;
    const result = await locate(
      [
        hit('server/seed-config.ts', seed),
        hit('server/derived.ts', derived),
      ],
      {
        'server/seed-config.ts': seed,
        'server/derived.ts': derived,
      },
      request(['aliasProbe'], undefined),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a redacted service result.');
    }
    expect(
      result.evidence.confirmed.length + result.evidence.candidates.length,
    ).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(result)).not.toContain(rawSecret);
    expect(
      [...result.evidence.confirmed, ...result.evidence.candidates].some(
        (item) =>
          item.location.excerpt === OVERSIZED_CONTENT_PLACEHOLDER,
      ),
    ).toBe(true);
  });
});

describe.runIf(
  isSelected({ group: 'output-redaction', caseId: 'redaction-metadata' }),
)('display cap versus reader failure', () => {
  it('uses an oversized placeholder only after a complete text read', async () => {
    const rawToken = 'x'.repeat(2_049);
    const excerpt = `api_key = "${rawToken}";`;
    expect(Buffer.byteLength(excerpt, 'utf8')).toBeLessThan(4 * 1024);
    const result = await locate(
      [hit('server/oversized.ts', excerpt)],
      { 'server/oversized.ts': excerpt },
      request(['api_key'], undefined),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected an oversized redacted result.');
    }
    const publicEvidence = [
      ...result.evidence.confirmed,
      ...result.evidence.candidates,
    ][0];
    expect(publicEvidence?.location).toMatchObject({
      excerpt: '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]',
      redaction: {
        applied: true,
        fields: [
          {
            field: 'excerpt',
            reasonCodes: ['BINARY_OR_OVERSIZED_CONTENT'],
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain(rawToken);
  });

  it('keeps true binary reader failure out of public evidence', async () => {
    const excerpt = 'api_key = rawBinarySecret;';
    const result = await locateUnreadable(
      [hit('server/binary.ts', excerpt)],
      { 'server/binary.ts': excerpt },
      request(['api_key'], undefined),
      'BINARY_FILE',
    );
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        status: 'no_result',
        confirmed: [],
        candidates: [],
        coverage: {
          limitsReached: [],
          exclusionSummary: {},
        },
        nextActions: ['ADD_TERM', 'ADD_SYMBOL_ANCHOR'],
      },
    });
    expect(JSON.stringify(result)).not.toContain('rawBinarySecret');
  });
});
