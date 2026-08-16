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
import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  bindRawDiscoveryLocatorV2,
  projectExpandedSafePreCapPoolV2,
} from '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import { DiscoveryHitSelectorV2 } from '../../src/evidence/ranking/discovery-hit-selector-v2.js';
import { runFinalSnapshotCheckV2 } from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import {
  bindSelectedVerificationOutcomeToSnapshotV2,
  requireSnapshotBoundSelectedVerificationOutcomeV2,
  type SelectedVerificationOutcomeV2,
} from '../../src/evidence/request-snapshot/selected-verification-outcome-v2.js';
import { scopeFoldSafeCandidatePoolV2 } from '../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js';
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

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

async function selectedMerge(
  hits: readonly BackendHit[],
  reader = new FakeReader(),
) {
  const execution = executionToken();
  const first = hits[0];
  if (first === undefined) {
    throw new Error('selected merge requires one hit');
  }
  const candidates = hits.map((selectedHit) => {
    const locatorRef = bindRawDiscoveryLocatorV2(
      {
        source: 'backend',
        backend: selectedHit.source,
        pathFlavor: 'native',
        rawPath: selectedHit.file,
      },
      execution,
    );
    if (locatorRef === undefined) {
      throw new Error('selected merge locator binding failed');
    }
    return Object.freeze({
      locatorRef,
      safeFile: selectedHit.file,
      safeSymbol: selectedHit.symbol ?? '',
      lineStart: selectedHit.lines?.[0] ?? 1,
      lineEnd: selectedHit.lines?.[1] ?? 1,
      source: selectedHit.source,
    });
  });
  const preCap = projectExpandedSafePreCapPoolV2(
    Object.freeze(candidates),
    true,
    execution,
  );
  const folded = scopeFoldSafeCandidatePoolV2(
    preCap,
    preCap.candidates.map((candidate) =>
      Object.freeze({
        locatorRef: candidate.locatorRef,
        decision: Object.freeze({
          layer: 'server',
          included: true,
          confirmation: 'allowed' as const,
        }),
      }),
    ),
    execution,
  );
  const selector = new DiscoveryHitSelectorV2();
  const boundSelection = selector.bind(
    selector.select(folded, [], candidates.length, execution),
    execution,
  ).bound;
  const result = await verifyAndMergeBackendHits({
    repositoryRoot: 'C:/repository',
    hits,
    terms,
    reader,
    limits,
    maxMatchesPerHit: 4,
    signal: new AbortController().signal,
    selectedDiscoveryAuthority: Object.freeze({
      boundSelection,
      execution,
    }),
  });
  return Object.freeze({ execution, boundSelection, result });
}

async function selectedFacts(input: Awaited<ReturnType<typeof selectedMerge>>) {
  if (input.result.selectedVerificationOutcome === undefined) {
    throw new Error('selected verification outcome missing');
  }
  const finalCheck = await runFinalSnapshotCheckV2({
    repositoryRoot: '/synthetic',
    loadedFiles: Object.freeze([]),
    evidencePool: Object.freeze({
      records: Object.freeze([]),
      preRankingPoolTruncated: false,
      safeSelectionCollision: false,
    }),
    eligiblePool: Object.freeze({ records: Object.freeze([]) }),
    gitState: 'unknown',
    signal: new AbortController().signal,
    execution: input.execution,
    boundSelection: input.boundSelection,
    selectedVerificationOutcome: input.result.selectedVerificationOutcome,
  });
  const bound = bindSelectedVerificationOutcomeToSnapshotV2({
    outcome: input.result.selectedVerificationOutcome,
    boundSelection: input.boundSelection,
    snapshotProof: finalCheck.proof,
    execution: input.execution,
  });
  return requireSnapshotBoundSelectedVerificationOutcomeV2(
    bound,
    input.boundSelection,
    finalCheck.proof,
    input.execution,
  );
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

  it('binds duplicate, unique-unverified, and read-limit facts to the selected locator set and snapshot proof', async () => {
    const duplicate = await selectedMerge([
      hit('ripgrep', ['SYMBOL_SEARCH_HIT'], 'MapAlias'),
      hit('codegraph', ['LITERAL_TERM_HIT']),
    ]);
    await expect(selectedFacts(duplicate)).resolves.toEqual({
      readLimits: {
        maximumFileBytesReached: false,
        maximumExcerptBytesReached: false,
      },
      exclusions: {
        duplicateLocations: 1,
        unverifiedFileContent: 0,
      },
    });

    const stale = await selectedMerge(
      [
        hit('ripgrep', ['SYMBOL_SEARCH_HIT'], 'MapAlias'),
        hit('codegraph', ['LITERAL_TERM_HIT']),
      ],
      new FakeReader({
        ...currentLocation,
        excerpt: 'const target = New.Value;',
      }),
    );
    expect(stale.result.unverifiedLocations).toBe(2);
    await expect(selectedFacts(stale)).resolves.toMatchObject({
      exclusions: {
        duplicateLocations: 0,
        unverifiedFileContent: 1,
      },
    });

    class OptionalExpansionLimitReader extends FakeReader {
      private rangeReads = 0;

      public override async readRange(): Promise<EvidenceLocation> {
        this.rangeReads += 1;
        if (this.rangeReads === 1) {
          return currentLocation;
        }
        throw new RepositoryAccessError(
          'MAX_EXCERPT_BYTES_REACHED',
          currentLocation.file,
        );
      }
    }
    const optionalExpansion = await selectedMerge(
      [hit('ripgrep', ['LITERAL_TERM_HIT'])],
      new OptionalExpansionLimitReader(),
    );
    expect(optionalExpansion.result.records).toHaveLength(1);
    expect(optionalExpansion.result.failures).toEqual([
      {
        file: currentLocation.file,
        code: 'MAX_EXCERPT_BYTES_REACHED',
      },
    ]);
    await expect(selectedFacts(optionalExpansion)).resolves.toMatchObject({
      readLimits: {
        maximumFileBytesReached: false,
        maximumExcerptBytesReached: false,
      },
      exclusions: { unverifiedFileContent: 0 },
    });

    class SelectedReadLimitReader extends FakeReader {
      public override async readRange(): Promise<EvidenceLocation> {
        throw new RepositoryAccessError(
          'MAX_FILE_BYTES_REACHED',
          currentLocation.file,
        );
      }
    }
    const selectedReadLimit = await selectedMerge(
      [hit('ripgrep', ['LITERAL_TERM_HIT'])],
      new SelectedReadLimitReader(),
    );
    await expect(selectedFacts(selectedReadLimit)).resolves.toMatchObject({
      readLimits: {
        maximumFileBytesReached: true,
        maximumExcerptBytesReached: false,
      },
      exclusions: { unverifiedFileContent: 1 },
    });
  });

  it('rejects cross-snapshot, cross-outcome, and cross-execution proof substitution', async () => {
    const selected = await selectedMerge([
      hit('ripgrep', ['LITERAL_TERM_HIT']),
    ]);
    const outcome = selected.result.selectedVerificationOutcome;
    if (outcome === undefined) {
      throw new Error('selected verification outcome missing');
    }
    const pools = Object.freeze({
      evidencePool: Object.freeze({
        records: Object.freeze([]),
        preRankingPoolTruncated: false,
        safeSelectionCollision: false,
      }),
      eligiblePool: Object.freeze({ records: Object.freeze([]) }),
    });
    const unrelatedOutcome = Object.freeze({}) as SelectedVerificationOutcomeV2;
    const wrongOutcomeProof = await runFinalSnapshotCheckV2({
      repositoryRoot: '/synthetic',
      loadedFiles: Object.freeze([]),
      evidencePool: pools.evidencePool,
      eligiblePool: pools.eligiblePool,
      gitState: 'unknown',
      signal: new AbortController().signal,
      execution: selected.execution,
      boundSelection: selected.boundSelection,
      selectedVerificationOutcome: unrelatedOutcome,
    });
    expect(() =>
      bindSelectedVerificationOutcomeToSnapshotV2({
        outcome,
        boundSelection: selected.boundSelection,
        snapshotProof: wrongOutcomeProof.proof,
        execution: selected.execution,
      }),
    ).toThrow(/binding mismatch/i);

    const otherExecution = executionToken();
    const wrongExecutionProof = await runFinalSnapshotCheckV2({
      repositoryRoot: '/synthetic',
      loadedFiles: Object.freeze([]),
      evidencePool: pools.evidencePool,
      eligiblePool: pools.eligiblePool,
      gitState: 'unknown',
      signal: new AbortController().signal,
      execution: otherExecution,
      boundSelection: selected.boundSelection,
      selectedVerificationOutcome: outcome,
    });
    expect(() =>
      bindSelectedVerificationOutcomeToSnapshotV2({
        outcome,
        boundSelection: selected.boundSelection,
        snapshotProof: wrongExecutionProof.proof,
        execution: selected.execution,
      }),
    ).toThrow(/binding mismatch/i);
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
