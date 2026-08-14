import { describe, expect, it } from 'vitest';

import {
  createDiscoveryKey,
  RepositoryAccessError,
  type BackendHit,
  type EvidenceLocation,
  type NormalizedSearchTerm,
  type RepositoryReader,
  type RepositoryReadLimits,
} from '../../src/contracts/index.js';
import { verifyAndMergeBackendHits } from '../../src/evidence/discovery-record.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = { group: 'evidence-merge', caseId: 'evidence-merge' } as const;
const limits: RepositoryReadLimits = {
  maxFileBytes: 1024,
  maxExcerptBytes: 1024,
  maxExcerptLines: 12,
};
const terms: readonly NormalizedSearchTerm[] = [
  { value: 'Source.Value', caseSensitive: true },
];
const currentLocation: EvidenceLocation = {
  file: 'src/mapping.ts',
  lines: [7, 7],
  excerpt: 'const target = Source.Value;',
};

class FakeReader implements RepositoryReader {
  public constructor(
    private readonly rangeLocation: EvidenceLocation = currentLocation,
    private readonly foundLocations: readonly EvidenceLocation[] = [],
  ) {}

  public async resolveRoot(repoPath: string): Promise<string> {
    return repoPath;
  }

  public async readRange(): Promise<EvidenceLocation> {
    return this.rangeLocation;
  }

  public async readWindow(): Promise<EvidenceLocation> {
    return this.rangeLocation;
  }

  public async findMatches(): Promise<readonly EvidenceLocation[]> {
    return this.foundLocations;
  }
}

function hit(
  source: BackendHit['source'],
  reasonCodes: BackendHit['reasonCodes'],
  symbol?: string,
): BackendHit {
  return {
    file: 'src/mapping.ts',
    lines: [7, 7],
    matchedText: currentLocation.excerpt,
    source,
    reasonCodes,
    ...(symbol === undefined ? {} : { symbol }),
  };
}

async function merge(hits: readonly BackendHit[], reader = new FakeReader()) {
  return await verifyAndMergeBackendHits({
    repositoryRoot: 'C:/repository',
    hits,
    terms,
    reader,
    limits,
    maxMatchesPerHit: 4,
    signal: new AbortController().signal,
  });
}

describe.runIf(isSelected(identity))('evidence discovery merge', () => {
  it('merges permuted duplicate hits before classification or public ID creation', async () => {
    const hits = [
      hit('ripgrep', ['SYMBOL_SEARCH_HIT'], 'MapAlias'),
      hit('codegraph', ['LITERAL_TERM_HIT']),
    ] as const;
    const forward = await merge(hits);
    const reversed = await merge([...hits].reverse());

    expect(forward).toEqual(reversed);
    expect(forward.duplicateLocations).toBe(1);
    expect(forward.unverifiedLocations).toBe(0);
    expect(forward.aborted).toBe(false);
    expect(forward.records).toHaveLength(1);
    expect(forward.records[0]).toEqual({
      discoveryKey: createDiscoveryKey(currentLocation),
      location: currentLocation,
      discoveredBy: ['codegraph', 'ripgrep'],
      operations: [
        'CODEGRAPH_QUERY',
        'RIPGREP_SEARCH',
        'FILESYSTEM_READ_RANGE',
      ],
      discoveryReasonCodes: ['LITERAL_TERM_HIT', 'SYMBOL_SEARCH_HIT'],
      matchedTerms: terms,
      focusLines: currentLocation.lines,
      focusExcerpt: currentLocation.excerpt,
      canonicalSymbols: ['MapAlias'],
    });
    expect(forward.records[0]).not.toHaveProperty('id');
    expect(forward.records[0]).not.toHaveProperty('evidenceClass');
    expect(forward.records[0]).not.toHaveProperty('role');
  });

  it('rejects a stale line hit and verifies unlocated hits through findMatches', async () => {
    const stale = await merge(
      [hit('ripgrep', ['LITERAL_TERM_HIT'])],
      new FakeReader({
        ...currentLocation,
        excerpt: 'const target = New.Value;',
      }),
    );
    expect(stale.records).toEqual([]);
    expect(stale.unverifiedLocations).toBe(1);

    const unlocated: BackendHit = {
      file: 'src/mapping.ts',
      source: 'ripgrep',
      reasonCodes: ['FILE_ANCHOR_HIT'],
    };
    const verified = await merge(
      [unlocated],
      new FakeReader(currentLocation, [currentLocation]),
    );
    expect(verified.records[0]?.operations).toEqual([
      'RIPGREP_SEARCH',
      'FILESYSTEM_FIND_MATCHES',
    ]);
  });

  it('preserves every canonical symbol fact across hit permutations', async () => {
    const hits = [
      hit('ripgrep', ['SYMBOL_SEARCH_HIT'], 'Zeta'),
      hit('ripgrep', ['SYMBOL_SEARCH_HIT'], 'Alpha'),
    ] as const;
    const forward = await merge(hits);
    const reversed = await merge([...hits].reverse());
    expect(forward).toEqual(reversed);
    expect(forward.records[0]?.canonicalSymbols).toEqual(['Alpha', 'Zeta']);
  });

  it('accounts for ordinary read failures and propagates root escape', async () => {
    class FailingReader extends FakeReader {
      public override async readRange(): Promise<EvidenceLocation> {
        throw new RepositoryAccessError('FILE_UNREADABLE', 'src/mapping.ts');
      }
    }
    const failed = await merge(
      [hit('ripgrep', ['LITERAL_TERM_HIT'])],
      new FailingReader(),
    );
    expect(failed).toMatchObject({
      records: [],
      unverifiedLocations: 1,
      failures: [{ file: 'src/mapping.ts', code: 'FILE_UNREADABLE' }],
    });

    class EscapingReader extends FakeReader {
      public constructor(
        private readonly code:
          'PATH_OUTSIDE_ROOT' | 'INVALID_RELATIVE_PATH' | 'INVALID_REPOSITORY',
      ) {
        super();
      }
      public override async readRange(): Promise<EvidenceLocation> {
        throw new RepositoryAccessError(this.code, '../secret');
      }
    }
    for (const code of [
      'PATH_OUTSIDE_ROOT',
      'INVALID_RELATIVE_PATH',
      'INVALID_REPOSITORY',
    ] as const) {
      await expect(
        merge([hit('ripgrep', ['LITERAL_TERM_HIT'])], new EscapingReader(code)),
      ).rejects.toMatchObject({ code });
    }
  });

  it('returns records completed before an abort without counting them unverified', async () => {
    let calls = 0;
    class AbortingReader extends FakeReader {
      public override async readRange(): Promise<EvidenceLocation> {
        calls += 1;
        if (calls === 2) {
          throw new RepositoryAccessError('ABORTED', 'src/second.ts');
        }
        return currentLocation;
      }
    }
    const second = {
      ...hit('ripgrep', ['LITERAL_TERM_HIT']),
      file: 'src/second.ts',
    };
    const result = await merge(
      [hit('ripgrep', ['LITERAL_TERM_HIT']), second],
      new AbortingReader(),
    );
    expect(result.records).toHaveLength(1);
    expect(result.aborted).toBe(true);
    expect(result.unverifiedLocations).toBe(0);
  });

  it('preserves the focus record and reports a logical-window byte limit', async () => {
    let calls = 0;
    class WindowLimitedReader extends FakeReader {
      public override async readRange(): Promise<EvidenceLocation> {
        calls += 1;
        if (calls === 2) {
          throw new RepositoryAccessError(
            'MAX_EXCERPT_BYTES_REACHED',
            currentLocation.file,
          );
        }
        return currentLocation;
      }
    }
    const result = await merge(
      [hit('ripgrep', ['LITERAL_TERM_HIT'])],
      new WindowLimitedReader(),
    );
    expect(result).toMatchObject({
      records: [{ location: currentLocation }],
      unverifiedLocations: 0,
      failures: [
        { file: currentLocation.file, code: 'MAX_EXCERPT_BYTES_REACHED' },
      ],
    });
  });
});
