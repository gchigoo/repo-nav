import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  BackendSearchRequest,
  SafeProcessRequest,
  SafeProcessResult,
} from '../../src/contracts/index.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = { group: 'ripgrep-backend', caseId: 'ripgrep-backend' } as const;
const fixtureRoot = resolve(import.meta.dirname, '..', '..', 'testkit', 'fixtures', 'ripgrep');

function bytes(value: string): Uint8Array {
  return Buffer.from(value, 'utf8');
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
    return this.results[this.requests.length - 1] ?? {
      ok: true,
      exitCode: 0,
      stdout: bytes(''),
      stderr: bytes(''),
    };
  }
}

function request(root: string): BackendSearchRequest {
  return {
    repositoryRoot: root,
    terms: [
      { value: 'Source.Value', caseSensitive: true },
      { value: '[literal].*', caseSensitive: false },
    ],
    anchors: [],
    negativeTerms: [],
    maxHits: 10,
  };
}

describe.runIf(isSelected(identity))('ripgrep backend', () => {
  it('uses fixed-string JSON argv and independent per-term case groups', async () => {
    const fixture = readFileSync(resolve(fixtureRoot, 'match-v15.jsonl'), 'utf8');
    const runner = new RecordingProcessRunner([
      { ok: true, exitCode: 0, stdout: bytes(fixture), stderr: bytes('') },
      { ok: false, kind: 'non-zero-exit', exitCode: 1, terminationSignal: null, stdout: bytes(''), stderr: bytes('') },
    ]);
    const result = await new RipgrepBackend(runner).search(
      request('C:/repository'),
      new AbortController().signal,
    );

    expect(runner.requests).toHaveLength(2);
    expect(runner.requests[0]?.argv).toContain('--fixed-strings');
    expect(runner.requests[0]?.argv).toContain('--json');
    expect(runner.requests[0]?.argv).not.toContain('--ignore-case');
    expect(runner.requests[0]?.argv).toContain('Source.Value');
    expect(runner.requests[1]?.argv).toContain('--ignore-case');
    expect(runner.requests[1]?.argv).toContain('[literal].*');
    expect(result).toMatchObject({ complete: true, health: { state: 'available' } });
    expect(result.hits).toEqual([
      {
        file: 'src/mapping.ts',
        symbol: undefined,
        lines: [7, 7],
        matchedText: 'const target = Source.Value;',
        source: 'ripgrep',
        reasonCodes: ['LITERAL_TERM_HIT'],
      },
    ]);
  });

  it('runs literal metacharacter search through the real safe process seam', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-rg-'));
    try {
      writeFileSync(resolve(repository, 'literal.ts'), 'const value = \"[literal].*\";\n', 'utf8');
      const backend = new RipgrepBackend(new NodeSafeProcessRunner());
      const health = await backend.probe(repository, new AbortController().signal);
      const result = await backend.search(
        {
          repositoryRoot: repository,
          terms: [{ value: '[literal].*', caseSensitive: true }],
          anchors: [],
          negativeTerms: [],
          maxHits: 4,
        },
        new AbortController().signal,
      );

      expect(health.state).toBe('available');
      expect(health.version).toMatch(/^ripgrep /u);
      expect(result.complete).toBe(true);
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]?.file).toBe('literal.ts');
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('maps no-result, unavailable, abort, and malformed JSON distinctly', async () => {
    const missing = new RipgrepBackend(
      new RecordingProcessRunner([
        { ok: false, kind: 'spawn-error', exitCode: null, terminationSignal: null, stdout: bytes(''), stderr: bytes('') },
      ]),
    );
    await expect(
      missing.search(request('C:/repository'), new AbortController().signal),
    ).resolves.toMatchObject({
      complete: false,
      health: { state: 'missing', reasonCode: 'RIPGREP_UNAVAILABLE' },
    });

    const aborted = new RipgrepBackend(
      new RecordingProcessRunner([
        { ok: false, kind: 'aborted', exitCode: null, terminationSignal: null, stdout: bytes(''), stderr: bytes('') },
      ]),
    );
    await expect(
      aborted.search(request('C:/repository'), new AbortController().signal),
    ).resolves.toMatchObject({
      complete: false,
      health: { state: 'unavailable', reasonCode: 'BACKEND_ABORTED' },
    });

    const malformed = readFileSync(resolve(fixtureRoot, 'malformed-v15.jsonl'), 'utf8');
    const invalid = new RipgrepBackend(
      new RecordingProcessRunner([
        { ok: true, exitCode: 0, stdout: bytes(malformed), stderr: bytes('') },
      ]),
    );
    await expect(
      invalid.search(request('C:/repository'), new AbortController().signal),
    ).resolves.toMatchObject({
      complete: false,
      health: { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
    });
  });

  it('emits file anchors without treating them as glob or content patterns', async () => {
    const runner = new RecordingProcessRunner([]);
    const result = await new RipgrepBackend(runner).search(
      {
        repositoryRoot: 'C:/repository',
        terms: [],
        anchors: [{ kind: 'file', value: 'src/[literal].ts', caseSensitive: true }],
        negativeTerms: [],
        maxHits: 2,
      },
      new AbortController().signal,
    );
    expect(runner.requests).toHaveLength(0);
    expect(result.hits).toEqual([
      {
        file: 'src/[literal].ts',
        source: 'ripgrep',
        reasonCodes: ['FILE_ANCHOR_HIT'],
      },
    ]);
  });

  it('uses the actual submatch spelling as the canonical symbol', async () => {
    const stdout = [
      JSON.stringify({
        type: 'match',
        data: {
          path: { text: 'src/symbol.ts' },
          lines: { text: 'export function MapRow() {}\n' },
          line_number: 3,
          submatches: [{ match: { text: 'MapRow' }, start: 16, end: 22 }],
        },
      }),
      '',
    ].join('\n');
    const insensitiveRunner = new RecordingProcessRunner([
      { ok: true, exitCode: 0, stdout: bytes(stdout), stderr: bytes('') },
    ]);
    const result = await new RipgrepBackend(insensitiveRunner).search(
      {
        repositoryRoot: 'C:/repository',
        terms: [],
        anchors: [
          { kind: 'symbol', value: 'maprow', caseSensitive: false },
        ],
        negativeTerms: [],
        maxHits: 4,
      },
      new AbortController().signal,
    );
    expect(result.hits[0]?.symbol).toBe('MapRow');
    expect(insensitiveRunner.requests[0]?.argv).toContain('--ignore-case');

    const sensitive = await new RipgrepBackend(
      new RecordingProcessRunner([
        { ok: true, exitCode: 0, stdout: bytes(stdout), stderr: bytes('') },
      ]),
    ).search(
      {
        repositoryRoot: 'C:/repository',
        terms: [],
        anchors: [{ kind: 'symbol', value: 'maprow', caseSensitive: true }],
        negativeTerms: [],
        maxHits: 4,
      },
      new AbortController().signal,
    );
    expect(sensitive.hits).toEqual([]);
  });

  it('emits every canonical symbol fact independently of anchor order', async () => {
    const stdout = `${JSON.stringify({
      type: 'match',
      data: {
        path: { text: 'src/symbols.ts' },
        lines: { text: 'function Alpha(){ Beta(); }\n' },
        line_number: 1,
        submatches: [
          { match: { text: 'Alpha' }, start: 9, end: 14 },
          { match: { text: 'Beta' }, start: 18, end: 22 },
        ],
      },
    })}\n`;
    const search = async (values: readonly ['Alpha', 'Beta'] | readonly ['Beta', 'Alpha']) =>
      await new RipgrepBackend(
        new RecordingProcessRunner([
          { ok: true, exitCode: 0, stdout: bytes(stdout), stderr: bytes('') },
        ]),
      ).search(
        {
          repositoryRoot: 'C:/repository',
          terms: [],
          anchors: values.map((value) => ({
            kind: 'symbol' as const,
            value,
            caseSensitive: true,
          })),
          negativeTerms: [],
          maxHits: 4,
        },
        new AbortController().signal,
      );

    const forward = await search(['Alpha', 'Beta']);
    const reversed = await search(['Beta', 'Alpha']);
    expect(forward).toEqual(reversed);
    expect(forward.hits.map((hit) => hit.symbol)).toEqual(['Alpha', 'Beta']);
  });
});
