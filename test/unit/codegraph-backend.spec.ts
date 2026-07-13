import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  BackendSearchRequest,
  SafeProcessRequest,
  SafeProcessResult,
} from '../../src/contracts/index.js';
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

class RecordingProcessRunner extends NodeSafeProcessRunner {
  public readonly requests: SafeProcessRequest[] = [];

  public constructor(private readonly results: readonly SafeProcessResult[]) {
    super();
  }

  public override async run(
    request: SafeProcessRequest,
    _signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    this.requests.push(request);
    return (
      this.results[this.requests.length - 1] ?? {
        ok: true,
        exitCode: 0,
        stdout: bytes('[]'),
        stderr: bytes(''),
      }
    );
  }
}

function request(): BackendSearchRequest {
  return {
    repositoryRoot: 'C:/repository',
    terms: [{ value: 'AlphaMapping', caseSensitive: true }],
    anchors: [
      { kind: 'symbol', value: 'AlphaMapping', caseSensitive: true },
    ],
    negativeTerms: [],
    layers: [],
    maxHits: 5,
  };
}

describe.runIf(isSelected({ group: 'codegraph-probe', caseId: 'codegraph-probe' }))(
  'CodeGraph probe',
  () => {
    it('maps 1.1.6 missing, clean, and stale status payloads', () => {
      expect(parseCodeGraphStatus(fixture('status-v1.1.6-missing.json'))).toEqual({
        state: 'missing',
        version: '1.1.6',
        indexFound: false,
        reasonCode: 'CODEGRAPH_INDEX_MISSING',
      });
      expect(parseCodeGraphStatus(fixture('status-v1.1.6-clean.json'))).toEqual({
        state: 'available',
        version: '1.1.6',
        indexFound: true,
        possibleStaleIndex: false,
      });
      expect(parseCodeGraphStatus(fixture('status-v1.1.6-stale.json'))).toEqual({
        state: 'available',
        version: '1.1.6',
        indexFound: true,
        possibleStaleIndex: true,
      });
    });

    it('accepts future additional fields but rejects missing required fields', () => {
      expect(
        parseCodeGraphStatus(
          bytes(JSON.stringify({ initialized: true, version: '2.0.0', extra: 1 })),
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
          stdout: fixture('status-v1.1.6-clean.json'),
          stderr: bytes('ignored diagnostics'),
        },
      ]);
      await expect(
        new CodeGraphBackend(runner).probe(
          'C:/repository',
          new AbortController().signal,
        ),
      ).resolves.toMatchObject({ state: 'available', version: '1.1.6' });
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
  },
);

describe.runIf(
  isSelected({ group: 'codegraph-parser', caseId: 'codegraph-parser' }),
)('CodeGraph query JSON parser', () => {
  it('parses exact current-file candidates and ignores fuzzy decoys', () => {
    const parsed = parseCodeGraphQuery(fixture('query-v1.1.6.json'), {
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

  it('accepts insensitive actual spelling but rejects malformed required hit fields', () => {
    const parsed = parseCodeGraphQuery(fixture('query-v1.1.6.json'), {
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
        stdout: fixture('status-v1.1.6-clean.json'),
        stderr: bytes(''),
      },
      {
        ok: true,
        exitCode: 0,
        stdout: fixture('query-v1.1.6.json'),
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
      health: { state: 'available', version: '1.1.6' },
      canSkipFallbackIfVerified: true,
    });
    expect(result.hits).toHaveLength(1);
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
          stdout: fixture('status-v1.1.6-clean.json'),
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
