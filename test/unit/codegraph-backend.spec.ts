import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

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
import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import { createMultiViewBackendSearchRequestV2 } from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import {
  createBackendExecutionContextV2,
  finalizeBackendExecutionTraceV2,
  requireBackendDiscoveryHandoffForF3V2,
  requireBackendExecutionOutcomeV2,
  requireBackendExecutionTraceV2,
} from '../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import {
  parseCodeGraphQuery,
  parseCodeGraphStatus,
} from '../../src/repository/codegraph-json.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { isSelected } from '../../testkit/testing/selection.js';

const fixtureRoot = resolve(
  import.meta.dirname,
  '..',
  '..',
  'testkit',
  'fixtures',
  'codegraph',
);

function bytes(value: string): Uint8Array {
  return Buffer.from(value, 'utf8');
}

function fixture(name: string): Uint8Array {
  return readFileSync(resolve(fixtureRoot, name));
}

function toStreamingResultV2(
  result: SafeProcessResult,
): SafeProcessStreamingResultV2<Uint8Array, Uint8Array> {
  if (result.ok) {
    return {
      ok: true,
      kind: 'completed',
      startState: 'started',
      exitCode: result.exitCode,
      terminationSignal: null,
      stdout: { kind: 'complete', value: result.stdout },
      stderr: result.stderr,
    };
  }
  if (result.kind === 'spawn-error') {
    return {
      ok: false,
      kind: 'other-spawn-error',
      startState: 'no-child',
      spawnFailureReason: 'not-found',
      exitCode: null,
      terminationSignal: null,
      stdout: { kind: 'unavailable' },
      stderr: result.stderr,
    };
  }
  if (result.kind === 'invalid-request') {
    return {
      ok: false,
      kind: 'invalid-request',
      startState: 'no-child',
      exitCode: null,
      terminationSignal: null,
      stdout: { kind: 'unavailable' },
      stderr: result.stderr,
    };
  }
  if (result.kind === 'non-zero-exit') {
    return {
      ok: false,
      kind: 'process-exit',
      startState: 'started',
      exitCode: result.exitCode,
      terminationSignal: result.terminationSignal,
      stdout: { kind: 'unavailable' },
      stderr: result.stderr,
    };
  }
  return {
    ok: false,
    kind: result.kind,
    startState: 'started',
    exitCode: result.exitCode,
    terminationSignal: result.terminationSignal,
    stdout: { kind: 'unavailable' },
    stderr: result.stderr,
  };
}

class RecordingProcessRunner extends NodeSafeProcessRunner {
  public readonly requests: SafeProcessRequest[] = [];

  public constructor(private readonly results: readonly SafeProcessResult[]) {
    super();
  }

  private nextResult(): SafeProcessResult {
    return (
      this.results[this.requests.length - 1] ?? {
        ok: true,
        exitCode: 0,
        stdout: bytes('[]'),
        stderr: bytes(''),
      }
    );
  }

  public override async run(
    request: SafeProcessRequest,
    _signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    this.requests.push(request);
    return this.nextResult();
  }

  public override runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    _signal: AbortSignal,
    _consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    this.requests.push(request);
    return Promise.resolve(
      toStreamingResultV2(this.nextResult()) as SafeProcessStreamingResultV2<
        TPartial,
        TComplete
      >,
    );
  }
}

function request(): BackendSearchRequest {
  return {
    repositoryRoot: 'C:/repository',
    terms: [{ value: 'AlphaMapping', caseSensitive: true }],
    anchors: [{ kind: 'symbol', value: 'AlphaMapping', caseSensitive: true }],
    negativeTerms: [],
    layers: [],
    maxHits: 5,
  };
}

describe.runIf(
  isSelected({ group: 'codegraph-probe', caseId: 'codegraph-probe' }),
)('CodeGraph probe', () => {
  it('maps 1.5.0 missing, clean, and stale status payloads', () => {
    expect(parseCodeGraphStatus(fixture('status-v1.5.0-missing.json'))).toEqual(
      {
        state: 'missing',
        version: '1.5.0',
        indexFound: false,
        reasonCode: 'CODEGRAPH_INDEX_MISSING',
      },
    );
    expect(parseCodeGraphStatus(fixture('status-v1.5.0-clean.json'))).toEqual({
      state: 'available',
      version: '1.5.0',
      indexFound: true,
      possibleStaleIndex: false,
    });
    expect(parseCodeGraphStatus(fixture('status-v1.5.0-stale.json'))).toEqual({
      state: 'available',
      version: '1.5.0',
      indexFound: true,
      possibleStaleIndex: true,
    });
  });

  it('keeps the previous 1.1.6 status contract backward-compatible', () => {
    expect(parseCodeGraphStatus(fixture('status-v1.1.6-clean.json'))).toEqual({
      state: 'available',
      version: '1.1.6',
      indexFound: true,
      possibleStaleIndex: false,
    });
  });

  it('accepts future additional fields but rejects missing required fields', () => {
    expect(
      parseCodeGraphStatus(
        bytes(
          JSON.stringify({ initialized: true, version: '2.0.0', extra: 1 }),
        ),
      ),
    ).toEqual({
      state: 'available',
      version: '2.0.0',
      indexFound: true,
    });
    expect(parseCodeGraphStatus(bytes('{"initialized":true}'))).toBeUndefined();
    expect(parseCodeGraphStatus(bytes('not-json'))).toBeUndefined();
  });

  it('uses status JSON through SafeProcessRunner and maps process failures', async () => {
    const runner = new RecordingProcessRunner([
      {
        ok: true,
        exitCode: 0,
        stdout: fixture('status-v1.5.0-clean.json'),
        stderr: bytes('ignored diagnostics'),
      },
    ]);
    await expect(
      new CodeGraphBackend(runner).probe(
        'C:/repository',
        new AbortController().signal,
      ),
    ).resolves.toMatchObject({ state: 'available', version: '1.5.0' });
    expect(runner.requests[0]?.cwd).toBe('C:/repository');
    expect(runner.requests[0]?.executable.length).toBeGreaterThan(0);
    expect(runner.requests[0]?.argv.slice(-3)).toEqual([
      'status',
      '--json',
      'C:/repository',
    ]);

    const missing = new CodeGraphBackend(
      new RecordingProcessRunner([
        {
          ok: false,
          kind: 'spawn-error',
          exitCode: null,
          terminationSignal: null,
          stdout: bytes(''),
          stderr: bytes(''),
        },
      ]),
    );
    await expect(
      missing.probe('C:/repository', new AbortController().signal),
    ).resolves.toEqual({
      state: 'unavailable',
      reasonCode: 'CODEGRAPH_UNAVAILABLE',
    });
  });
});

describe.runIf(
  isSelected({ group: 'codegraph-parser', caseId: 'codegraph-parser' }),
)('CodeGraph query JSON parser', () => {
  it('parses exact current-file candidates and ignores fuzzy decoys', () => {
    const parsed = parseCodeGraphQuery(fixture('query-v1.5.0.json'), {
      value: 'AlphaMapping',
      caseSensitive: true,
      source: 'symbol-anchor',
    });
    expect(parsed).toEqual({
      rawResultCount: 2,
      hits: [
        {
          file: 'src/alpha.ts',
          symbol: 'AlphaMapping',
          lines: [2, 2],
          source: 'codegraph',
          reasonCodes: ['SYMBOL_SEARCH_HIT'],
        },
      ],
    });
  });

  it('keeps the previous 1.1.6 query contract backward-compatible', () => {
    expect(
      parseCodeGraphQuery(fixture('query-v1.1.6.json'), {
        value: 'AlphaMapping',
        caseSensitive: true,
        source: 'symbol-anchor',
      }),
    ).toEqual({
      rawResultCount: 2,
      hits: [
        {
          file: 'src/alpha.ts',
          symbol: 'AlphaMapping',
          lines: [2, 2],
          source: 'codegraph',
          reasonCodes: ['SYMBOL_SEARCH_HIT'],
        },
      ],
    });
  });

  it('accepts insensitive actual spelling but rejects malformed required hit fields', () => {
    const parsed = parseCodeGraphQuery(fixture('query-v1.5.0.json'), {
      value: 'alphamapping',
      caseSensitive: false,
      source: 'term',
    });
    expect(parsed?.hits[0]).toMatchObject({
      symbol: 'AlphaMapping',
      reasonCodes: ['LITERAL_TERM_HIT'],
    });
    expect(
      parseCodeGraphQuery(
        bytes(JSON.stringify([{ node: { name: 'AlphaMapping' } }])),
        {
          value: 'AlphaMapping',
          caseSensitive: true,
          source: 'term',
        },
      ),
    ).toBeUndefined();
  });

  it('runs probe then one structured query without reading stderr text', async () => {
    const runner = new RecordingProcessRunner([
      {
        ok: true,
        exitCode: 0,
        stdout: fixture('status-v1.5.0-clean.json'),
        stderr: bytes(''),
      },
      {
        ok: true,
        exitCode: 0,
        stdout: fixture('query-v1.5.0.json'),
        stderr: bytes('\u001b[31mhuman diagnostics\u001b[0m'),
      },
    ]);
    const result = await new CodeGraphBackend(runner).search(
      request(),
      new AbortController().signal,
    );
    expect(runner.requests[1]?.argv.slice(-7)).toEqual([
      'query',
      '--json',
      '--path',
      'C:/repository',
      '--limit',
      '5',
      'AlphaMapping',
    ]);
    expect(result).toMatchObject({
      health: { state: 'available', version: '1.5.0' },
      canSkipFallbackIfVerified: true,
    });
    expect(result.hits).toHaveLength(1);
  });

  it('preserves CodeGraph relevance order instead of re-sorting by path', async () => {
    const query = bytes(
      JSON.stringify([
        {
          node: {
            name: 'AlphaMapping',
            qualifiedName: 'AlphaMapping',
            filePath: 'src/z-best.ts',
            startLine: 10,
            endLine: 12,
          },
          score: 99,
        },
        {
          node: {
            name: 'AlphaMapping',
            qualifiedName: 'AlphaMapping',
            filePath: 'src/a-second.ts',
            startLine: 1,
            endLine: 2,
          },
          score: 80,
        },
      ]),
    );
    const runner = new RecordingProcessRunner([
      {
        ok: true,
        exitCode: 0,
        stdout: fixture('status-v1.5.0-clean.json'),
        stderr: bytes(''),
      },
      { ok: true, exitCode: 0, stdout: query, stderr: bytes('') },
    ]);

    const result = await new CodeGraphBackend(runner).search(
      request(),
      new AbortController().signal,
    );

    expect(
      result.hits.map(({ file, backendRank }) => [file, backendRank]),
    ).toEqual([
      ['src/z-best.ts', 0],
      ['src/a-second.ts', 1],
    ]);
  });

  it.each([
    ['spawn-error', 'BACKEND_PROCESS_FAILED'],
    ['timeout', 'BACKEND_ABORTED'],
  ] as const)(
    'maps a query %s to an error health and a failed attempt reason',
    async (kind, reasonCode) => {
      const runner = new RecordingProcessRunner([
        {
          ok: true,
          exitCode: 0,
          stdout: fixture('status-v1.5.0-clean.json'),
          stderr: bytes(''),
        },
        {
          ok: false,
          kind,
          exitCode: null,
          terminationSignal: null,
          stdout: bytes(''),
          stderr: bytes(''),
        },
      ]);

      await expect(
        new CodeGraphBackend(runner).search(
          request(),
          new AbortController().signal,
        ),
      ).resolves.toMatchObject({
        health: { state: 'error', reasonCode },
        hits: [],
        complete: false,
      });
      expect(runner.requests).toHaveLength(2);
    },
  );
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'codegraph-outcome-trace',
  }),
)('F5-CODEGRAPH-002 searchViews trace ownership', () => {
  function multiView(repositoryRoot: string) {
    return createMultiViewBackendSearchRequestV2(
      {
        repositoryRoot,
        terms: [{ value: 'AlphaMapping', caseSensitive: true }],
        anchors: [
          { kind: 'symbol', value: 'AlphaMapping', caseSensitive: true },
        ],
        negativeTerms: [],
        layers: [],
      },
      40,
    );
  }

  it('records tool-unavailable from an unavailable status probe', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-cg-sv-'));
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      const runner = new RecordingProcessRunner([
        {
          ok: false,
          kind: 'spawn-error',
          exitCode: null,
          terminationSignal: null,
          stdout: bytes(''),
          stderr: bytes(''),
        },
      ]);
      const signal = new AbortController().signal;
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const context = createBackendExecutionContextV2(
        runner,
        undefined,
        signal,
        execution,
      );
      const request = multiView(repository);
      const handoff = await new CodeGraphBackend(runner).searchViews(
        request,
        signal,
        context,
        execution,
      );
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'codegraph',
        request,
        context,
        execution,
      );
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      expect(
        requireBackendExecutionOutcomeV2(view.expandedOutcome, execution),
      ).toMatchObject({
        backend: 'codegraph',
        status: 'unavailable',
        reasonCode: 'CODEGRAPH_UNAVAILABLE',
        hitCount: 0,
      });
      const trace = finalizeBackendExecutionTraceV2(context, execution);
      expect(
        requireBackendExecutionTraceV2(trace, execution)
          .codegraphIndexObservation,
      ).toEqual({ kind: 'tool-unavailable' });
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('runs the query plan through the physical executor and completes safe-set', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-cg-sv-'));
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      const runner = new RecordingProcessRunner([
        {
          ok: true,
          exitCode: 0,
          stdout: fixture('status-v1.5.0-clean.json'),
          stderr: bytes(''),
        },
        {
          ok: true,
          exitCode: 0,
          stdout: fixture('query-v1.5.0.json'),
          stderr: bytes(''),
        },
      ]);
      const signal = new AbortController().signal;
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const context = createBackendExecutionContextV2(
        runner,
        undefined,
        signal,
        execution,
      );
      const request = multiView(repository);
      const handoff = await new CodeGraphBackend(runner).searchViews(
        request,
        signal,
        context,
        execution,
      );
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'codegraph',
        request,
        context,
        execution,
      );
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      expect(
        requireBackendExecutionOutcomeV2(view.expandedOutcome, execution),
      ).toMatchObject({
        backend: 'codegraph',
        status: 'used',
        completion: 'complete',
        selectionEligibility: 'complete-safe-set',
        hitCount: 1,
      });
      expect(view.completeSafeHits).toHaveLength(1);
      const trace = finalizeBackendExecutionTraceV2(context, execution);
      const traceView = requireBackendExecutionTraceV2(trace, execution);
      expect(traceView.codegraphIndexObservation).toEqual({
        kind: 'available',
        possiblyStale: false,
      });
      expect(traceView.outcomes[0]).toMatchObject({
        backend: 'codegraph',
        status: 'used',
        completion: 'complete',
      });
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('keeps later expanded-lane terms reachable after a saturated fuzzy query', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-cg-sv-'));
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      const fuzzyResults = Array.from({ length: 800 }, (_, index) => ({
        node: {
          name: `AlphaHelper${index}`,
          qualifiedName: `AlphaHelper${index}`,
          filePath: 'a.ts',
          startLine: 1,
          endLine: 1,
        },
      }));
      const exactBeta = [
        {
          node: {
            name: 'Beta',
            qualifiedName: 'Beta',
            filePath: 'a.ts',
            startLine: 1,
            endLine: 1,
          },
        },
      ];
      const runner = new RecordingProcessRunner([
        {
          ok: true,
          exitCode: 0,
          stdout: fixture('status-v1.5.0-clean.json'),
          stderr: bytes(''),
        },
        {
          ok: true,
          exitCode: 0,
          stdout: bytes(JSON.stringify(fuzzyResults)),
          stderr: bytes(''),
        },
        {
          ok: true,
          exitCode: 0,
          stdout: bytes(JSON.stringify(exactBeta)),
          stderr: bytes(''),
        },
      ]);
      const signal = new AbortController().signal;
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const context = createBackendExecutionContextV2(
        runner,
        undefined,
        signal,
        execution,
      );
      const request = createMultiViewBackendSearchRequestV2(
        {
          repositoryRoot: repository,
          terms: [
            { value: 'Alpha', caseSensitive: true },
            { value: 'Beta', caseSensitive: true },
          ],
          anchors: [],
          negativeTerms: [],
          layers: [],
        },
        40,
      );
      const handoff = await new CodeGraphBackend(runner).searchViews(
        request,
        signal,
        context,
        execution,
      );
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'codegraph',
        request,
        context,
        execution,
      );
      expect(runner.requests).toHaveLength(3);
      expect(runner.requests[1]?.argv.at(-2)).toBe('800');
      expect(runner.requests[2]?.argv.at(-2)).toBe('800');
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      expect(
        requireBackendExecutionOutcomeV2(view.expandedOutcome, execution),
      ).toMatchObject({
        completion: 'incomplete',
        termination: 'early-stop',
        hitCount: 1,
        retainedHits: [{ symbol: 'Beta' }],
      });
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('binds complete no-result when the available query plan has zero entries', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-cg-sv-'));
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      const runner = new RecordingProcessRunner([
        {
          ok: true,
          exitCode: 0,
          stdout: fixture('status-v1.5.0-clean.json'),
          stderr: bytes(''),
        },
      ]);
      const signal = new AbortController().signal;
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const context = createBackendExecutionContextV2(
        runner,
        undefined,
        signal,
        execution,
      );
      const request = createMultiViewBackendSearchRequestV2(
        {
          repositoryRoot: repository,
          terms: [{ value: 'row-changed-id', caseSensitive: true }],
          anchors: [],
          negativeTerms: [],
          layers: [],
        },
        40,
      );
      const handoff = await new CodeGraphBackend(runner).searchViews(
        request,
        signal,
        context,
        execution,
      );
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'codegraph',
        request,
        context,
        execution,
      );
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      expect(
        requireBackendExecutionOutcomeV2(view.expandedOutcome, execution),
      ).toMatchObject({
        backend: 'codegraph',
        status: 'used',
        completion: 'complete',
        reasonCode: 'CODEGRAPH_NO_RESULT',
        hitCount: 0,
      });
      expect(runner.requests).toHaveLength(1);
      const trace = finalizeBackendExecutionTraceV2(context, execution);
      expect(
        requireBackendExecutionTraceV2(trace, execution).outcomes[0],
      ).toMatchObject({
        backend: 'codegraph',
        status: 'used',
        completion: 'complete',
      });
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
