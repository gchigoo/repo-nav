import { Injectable } from '@nestjs/common';
import { posix } from 'node:path';

import {
  type BackendHealth,
  type BackendHit,
  type BackendSearchRequest,
  type BackendSearchResult,
  type DiscoveryReasonCode,
  type NormalizedLocateAnchor,
  type NormalizedSearchTerm,
  type RepositorySearchBackend,
  type SafeProcessFailure,
} from '../contracts/index.js';
import { NodeSafeProcessRunner } from './node-safe-process-runner.js';

interface SearchSeed {
  readonly value: string;
  readonly caseSensitive: boolean;
  readonly reasonCode: DiscoveryReasonCode;
  readonly symbol: boolean;
}

interface RipgrepMatch {
  readonly file: string;
  readonly line: number;
  readonly lineText: string;
  readonly matchedTexts: readonly string[];
}

const PROCESS_LIMITS = Object.freeze({
  timeoutMs: 10_000,
  maxStdoutBytes: 8 * 1024 * 1024,
  maxStderrBytes: 1024 * 1024,
  terminateGraceMs: 500,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nestedText(value: unknown): string | undefined {
  return isRecord(value) && typeof value['text'] === 'string'
    ? value['text']
    : undefined;
}

function parseMatch(value: unknown): RipgrepMatch | undefined {
  if (!isRecord(value) || value['type'] !== 'match' || !isRecord(value['data'])) {
    return undefined;
  }
  const data = value['data'];
  const file = nestedText(data['path']);
  const lineText = nestedText(data['lines']);
  const line = data['line_number'];
  const rawSubmatches = data['submatches'];
  if (
    file === undefined ||
    lineText === undefined ||
    typeof line !== 'number' ||
    !Number.isSafeInteger(line) ||
    line < 1 ||
    !Array.isArray(rawSubmatches)
  ) {
    return undefined;
  }
  const matchedTexts: string[] = [];
  for (const submatch of rawSubmatches) {
    if (!isRecord(submatch)) {
      return undefined;
    }
    const matchedText = nestedText(submatch['match']);
    if (matchedText === undefined) {
      return undefined;
    }
    matchedTexts.push(matchedText);
  }
  return {
    file: posix.normalize(file.replaceAll('\\', '/')),
    line,
    lineText: lineText.replace(/[\r\n]+$/u, ''),
    matchedTexts: Object.freeze(matchedTexts),
  };
}

function parseJsonLines(stdout: Uint8Array):
  | { readonly ok: true; readonly matches: readonly RipgrepMatch[] }
  | { readonly ok: false } {
  const text = Buffer.from(stdout).toString('utf8');
  const matches: RipgrepMatch[] = [];
  for (const line of text.split(/\r?\n/u)) {
    if (line.length === 0) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      return { ok: false };
    }
    if (!isRecord(parsed) || typeof parsed['type'] !== 'string') {
      return { ok: false };
    }
    if (parsed['type'] === 'match') {
      const match = parseMatch(parsed);
      if (match === undefined) {
        return { ok: false };
      }
      matches.push(match);
    }
  }
  return { ok: true, matches: Object.freeze(matches) };
}

function matchesSeed(text: string, seed: SearchSeed): boolean {
  return seed.caseSensitive
    ? text === seed.value
    : text.toLocaleLowerCase('und') === seed.value.toLocaleLowerCase('und');
}

function failureHealth(result: SafeProcessFailure): BackendHealth {
  if (result.kind === 'spawn-error') {
    return { state: 'missing', reasonCode: 'RIPGREP_UNAVAILABLE' };
  }
  if (result.kind === 'aborted' || result.kind === 'timeout') {
    return { state: 'unavailable', reasonCode: 'BACKEND_ABORTED' };
  }
  return { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' };
}

function searchSeeds(request: BackendSearchRequest): readonly SearchSeed[] {
  const seeds: SearchSeed[] = request.terms.map((term: NormalizedSearchTerm) => ({
    ...term,
    reasonCode: 'LITERAL_TERM_HIT',
    symbol: false,
  }));
  for (const anchor of request.anchors) {
    if (anchor.kind === 'file') {
      continue;
    }
    seeds.push({
      value: anchor.value,
      caseSensitive: anchor.caseSensitive,
      reasonCode:
        anchor.kind === 'symbol' ? 'SYMBOL_SEARCH_HIT' : 'LITERAL_TERM_HIT',
      symbol: anchor.kind === 'symbol',
    });
  }
  return Object.freeze(seeds);
}

function fileAnchorHits(
  anchors: readonly NormalizedLocateAnchor[],
): readonly BackendHit[] {
  return Object.freeze(
    anchors
      .filter((anchor) => anchor.kind === 'file')
      .map((anchor) => ({
        file: anchor.value,
        source: 'ripgrep' as const,
        reasonCodes: ['FILE_ANCHOR_HIT' as const],
      })),
  );
}

function compareHits(left: BackendHit, right: BackendHit): number {
  const compareText = (first: string, second: string): number =>
    first === second ? 0 : first < second ? -1 : 1;
  return (
    compareText(left.file, right.file) ||
    (left.lines?.[0] ?? 0) - (right.lines?.[0] ?? 0) ||
    compareText(left.matchedText ?? '', right.matchedText ?? '') ||
    compareText(left.symbol ?? '', right.symbol ?? '')
  );
}

@Injectable()
export class RipgrepBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public constructor(private readonly processRunner: NodeSafeProcessRunner) {}

  public async probe(
    repositoryRoot: string,
    signal: AbortSignal,
  ): Promise<BackendHealth> {
    const result = await this.processRunner.run(
      {
        executable: 'rg',
        argv: ['--version'],
        cwd: repositoryRoot,
        ...PROCESS_LIMITS,
      },
      signal,
    );
    if (!result.ok) {
      return failureHealth(result);
    }
    const firstLine = Buffer.from(result.stdout).toString('utf8').split(/\r?\n/u)[0];
    return firstLine === undefined || firstLine.length === 0
      ? { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' }
      : { state: 'available', version: firstLine };
  }

  public async search(
    request: BackendSearchRequest,
    signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    const hits: BackendHit[] = [...fileAnchorHits(request.anchors)];
    const seeds = searchSeeds(request);
    const groups = [true, false]
      .map((caseSensitive) =>
        seeds.filter((seed) => seed.caseSensitive === caseSensitive),
      )
      .filter((group) => group.length > 0);

    for (const group of groups) {
      if (hits.length >= request.maxHits) {
        return {
          health: { state: 'available' },
          hits: Object.freeze(hits.slice(0, request.maxHits).sort(compareHits)),
          complete: false,
        };
      }
      const argv = [
        '--fixed-strings',
        '--json',
        '--no-heading',
        '--line-number',
        '--color',
        'never',
      ];
      if (group[0]?.caseSensitive === false) {
        argv.push('--ignore-case');
      }
      for (const seed of group) {
        argv.push('-e', seed.value);
      }
      argv.push('--', '.');

      const result = await this.processRunner.run(
        {
          executable: 'rg',
          argv,
          cwd: request.repositoryRoot,
          ...PROCESS_LIMITS,
        },
        signal,
      );
      if (!result.ok) {
        if (result.kind === 'non-zero-exit' && result.exitCode === 1) {
          continue;
        }
        return {
          health: failureHealth(result),
          hits: Object.freeze(hits.sort(compareHits)),
          complete: false,
        };
      }
      const parsed = parseJsonLines(result.stdout);
      if (!parsed.ok) {
        return {
          health: { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
          hits: Object.freeze(hits.sort(compareHits)),
          complete: false,
        };
      }
      for (const match of parsed.matches) {
        const matchedSeedFacts = group.flatMap((seed) =>
          match.matchedTexts
            .filter((text) => matchesSeed(text, seed))
            .map((text) => ({ seed, actualText: text })),
        );
        const matchedSeeds = matchedSeedFacts.map((fact) => fact.seed);
        const reasonCodes = Array.from(
          new Set(matchedSeeds.map((seed) => seed.reasonCode)),
        );
        if (reasonCodes.length === 0) {
          continue;
        }
        const symbols = Array.from(
          new Set(
            matchedSeedFacts
              .filter((fact) => fact.seed.symbol)
              .map((fact) => fact.actualText),
          ),
        ).sort((left, right) =>
          left === right ? 0 : left < right ? -1 : 1,
        );
        for (const symbol of symbols.length === 0 ? [undefined] : symbols) {
          hits.push({
            file: match.file,
            ...(symbol === undefined ? {} : { symbol }),
            lines: [match.line, match.line],
            matchedText: match.lineText,
            source: 'ripgrep',
            reasonCodes,
          });
        }
      }
    }

    const complete = hits.length <= request.maxHits;
    return {
      health: {
        state: 'available',
        ...(hits.length === 0 ? { reasonCode: 'RIPGREP_NO_RESULT' as const } : {}),
      },
      hits: Object.freeze(hits.sort(compareHits).slice(0, request.maxHits)),
      complete,
    };
  }
}
