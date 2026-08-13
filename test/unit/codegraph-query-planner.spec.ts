import { describe, expect, it } from 'vitest';

import type {
  BackendSearchRequest,
  SafeProcessRequest,
  SafeProcessResult,
} from '../../src/contracts/index.js';
import type {
  SafeProcessStreamingResultV2,
  SafeStdoutConsumerV2,
} from '../../src/contracts/safe-process.js';
import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import { createCodeGraphQueryPlan } from '../../src/repository/codegraph-query-planner.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { isSelected } from '../../testkit/testing/selection.js';

function bytes(value: string): Uint8Array {
  return Buffer.from(value, 'utf8');
}

function status(): SafeProcessResult {
  return {
    ok: true,
    exitCode: 0,
    stdout: bytes(
      JSON.stringify({
        initialized: true,
        version: '1.1.6',
        pendingChanges: { added: 0, modified: 0, removed: 0 },
        worktreeMismatch: null,
        index: { reindexRecommended: false },
      }),
    ),
    stderr: bytes(''),
  };
}

function query(name: string, line: number): SafeProcessResult {
  return {
    ok: true,
    exitCode: 0,
    stdout: bytes(
      JSON.stringify([
        {
          node: {
            name,
            qualifiedName: name,
            filePath: `src/${name}.ts`,
            startLine: line,
            endLine: line,
          },
        },
      ]),
    ),
    stderr: bytes(''),
  };
}

class RecordingRunner extends NodeSafeProcessRunner {
  public readonly requests: SafeProcessRequest[] = [];

  public constructor(private readonly results: readonly SafeProcessResult[]) {
    super();
  }

  public override async run(
    request: SafeProcessRequest,
    _signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    this.requests.push(request);
    const result = this.results[this.requests.length - 1];
    if (result === undefined) {
      throw new Error('Unexpected CodeGraph invocation.');
    }
    return result;
  }

  public override runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    _signal: AbortSignal,
    _consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    this.requests.push(request);
    const result = this.results[this.requests.length - 1];
    if (result === undefined) {
      throw new Error('Unexpected CodeGraph invocation.');
    }
    if (!result.ok) {
      throw new Error('Expected successful CodeGraph status fixture.');
    }
    return Promise.resolve({
      ok: true,
      kind: 'completed',
      startState: 'started',
      exitCode: 0,
      terminationSignal: null,
      stdout: { kind: 'complete', value: result.stdout as TComplete },
      stderr: result.stderr,
    });
  }
}

function baseRequest(
  overrides: Partial<BackendSearchRequest> = {},
): BackendSearchRequest {
  return {
    repositoryRoot: 'C:/repository',
    terms: [{ value: 'Alpha', caseSensitive: true }],
    anchors: [{ kind: 'symbol', value: 'Alpha', caseSensitive: true }],
    negativeTerms: [],
    layers: [],
    maxHits: 4,
    ...overrides,
  };
}

describe.runIf(
  isSelected({ group: 'codegraph-query-plan', caseId: 'codegraph-query-plan' }),
)('CodeGraph query planner', () => {
  it('orders symbol anchors before Unicode identifier terms and deduplicates', () => {
    const plan = createCodeGraphQueryPlan(
      baseRequest({
        anchors: [
          { kind: 'symbol', value: 'Beta', caseSensitive: true },
          { kind: 'symbol', value: 'Alpha', caseSensitive: true },
        ],
        terms: [
          { value: 'Alpha', caseSensitive: true },
          { value: 'Δelta', caseSensitive: true },
          { value: 'Beta', caseSensitive: true },
        ],
      }),
    );
    expect(plan.entries).toEqual([
      { value: 'Beta', caseSensitive: true, source: 'symbol-anchor' },
      { value: 'Alpha', caseSensitive: true, source: 'symbol-anchor' },
      { value: 'Δelta', caseSensitive: true, source: 'term' },
    ]);
    expect(plan.unsupportedDimensions).toEqual([]);
    expect(plan.canSkipFallbackIfVerified).toBe(false);
  });

  it('marks every unsupported or incomplete input dimension explicitly', () => {
    const plan = createCodeGraphQueryPlan(
      baseRequest({
        anchors: [
          { kind: 'symbol', value: 'alpha', caseSensitive: false },
          { kind: 'file', value: 'src/alpha.ts', caseSensitive: true },
          { kind: 'table', value: 'alpha_table', caseSensitive: true },
        ],
        terms: [
          { value: 'alpha', caseSensitive: false },
          { value: 'alpha-value', caseSensitive: true },
        ],
        negativeTerms: [{ value: 'legacy', caseSensitive: false }],
        layers: ['server'],
      }),
    );
    expect(plan.entries).toEqual([
      { value: 'alpha', caseSensitive: false, source: 'symbol-anchor' },
    ]);
    expect(plan.unsupportedDimensions).toEqual([
      'case-insensitive-search',
      'anchor:file',
      'anchor:table',
      'negative-terms',
      'layer-filter',
      'non-identifier-term',
    ]);
    expect(plan.canSkipFallbackIfVerified).toBe(false);
  });

  it('requires all terms to exactly match a sensitive explicit symbol anchor', () => {
    expect(
      createCodeGraphQueryPlan(baseRequest()).canSkipFallbackIfVerified,
    ).toBe(true);
    expect(
      createCodeGraphQueryPlan(
        baseRequest({
          anchors: [
            { kind: 'symbol', value: 'Alpha', caseSensitive: true },
            { kind: 'symbol', value: 'Beta', caseSensitive: true },
          ],
          terms: [
            { value: 'Alpha', caseSensitive: true },
            { value: 'Beta', caseSensitive: true },
          ],
        }),
      ).canSkipFallbackIfVerified,
    ).toBe(false);
    expect(
      createCodeGraphQueryPlan(
        baseRequest({
          terms: [
            { value: 'Alpha', caseSensitive: true },
            { value: 'Other', caseSensitive: true },
          ],
        }),
      ).canSkipFallbackIfVerified,
    ).toBe(false);
  });

  it('shares total maxHits, passes only positive remaining, and stops at zero', async () => {
    const runner = new RecordingRunner([status(), query('Alpha', 1)]);
    const result = await new CodeGraphBackend(runner).search(
      baseRequest({
        terms: [
          { value: 'Alpha', caseSensitive: true },
          { value: 'Beta', caseSensitive: true },
        ],
        anchors: [],
        maxHits: 1,
      }),
      new AbortController().signal,
    );
    expect(runner.requests).toHaveLength(2);
    expect(runner.requests[1]?.argv.slice(-7)).toEqual([
      'query',
      '--json',
      '--path',
      'C:/repository',
      '--limit',
      '1',
      'Alpha',
    ]);
    expect(result).toMatchObject({ complete: false });
    expect(result.hits).toHaveLength(1);
  });

  it('charges fuzzy raw results against the shared total budget', async () => {
    const runner = new RecordingRunner([status(), query('AlphaHelper', 1)]);
    const result = await new CodeGraphBackend(runner).search(
      baseRequest({
        terms: [
          { value: 'Alpha', caseSensitive: true },
          { value: 'Beta', caseSensitive: true },
        ],
        anchors: [],
        maxHits: 1,
      }),
      new AbortController().signal,
    );
    expect(runner.requests).toHaveLength(2);
    expect(result.hits).toEqual([]);
    expect(result.complete).toBe(false);
  });

  it('reduces remaining budget for each stable single-search invocation', async () => {
    const runner = new RecordingRunner([
      status(),
      query('Alpha', 1),
      query('Beta', 2),
    ]);
    const result = await new CodeGraphBackend(runner).search(
      baseRequest({
        terms: [
          { value: 'Alpha', caseSensitive: true },
          { value: 'Beta', caseSensitive: true },
        ],
        anchors: [],
        maxHits: 3,
      }),
      new AbortController().signal,
    );
    expect(runner.requests[1]?.argv.at(-2)).toBe('3');
    expect(runner.requests[2]?.argv.at(-2)).toBe('2');
    expect(result.complete).toBe(true);
    expect(result.hits.map((hit) => hit.symbol)).toEqual(['Alpha', 'Beta']);
  });
});
