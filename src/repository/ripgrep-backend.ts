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
import type { LocateExecutionTokenV2 } from '../contracts/v2/locate-fact-envelope-v2.js';
import type {
  BackendExecutionContextV2,
  BackendExecutionOutcomeV2,
  BackendFallbackFactsForF3V2,
  CompleteSafeBackendHitForF3V2,
  TrustedBackendDiscoveryHandoffV2,
} from '../contracts/v2/backend-execution-outcome-v2.js';
import type { SafeProcessStreamingResultV2 } from '../contracts/safe-process.js';
import {
  createBackendNoStartDecisionV2,
  createExpandedLaneAttemptFactsV2,
  createTrustedBackendDiscoveryHandoffV2,
  requireBackendPhysicalAttemptExecutorV2,
  requireExpandedBackendAttemptReducerV2,
  sealExpandedBackendAttemptSetV2,
  signBackendExecutionOutcomeForFactsV2,
} from '../process/backend-execution-context-v2.js';
import type {
  AvailabilityProbeExecutionResultV2,
  BackendPhysicalAttemptLaneMaskV2,
  BackendPhysicalAttemptResultV2,
} from '../process/backend-physical-attempt-executor-v2.js';
import { NodeSafeProcessRunner } from './node-safe-process-runner.js';
import {
  MultiViewAccumulatorV2,
  RipgrepJsonLineConsumerV2,
  type MultiViewSeedV2,
  type RipgrepJsonConsumerCompleteV2,
  type RipgrepJsonConsumerPartialV2,
} from './ripgrep-stream/index.js';

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

/** F5 searchViews 请求面（与 F3 MultiView 对齐，不反向依赖 evidence）。 */
export interface RipgrepMultiViewSearchRequestV2 {
  readonly base: Omit<BackendSearchRequest, 'maxHits'>;
  readonly expandedMaxHits: number;
  readonly legacyMaxHits: number;
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
  if (
    !isRecord(value) ||
    value['type'] !== 'match' ||
    !isRecord(value['data'])
  ) {
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

function parseJsonLines(
  stdout: Uint8Array,
):
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
  const seeds: SearchSeed[] = request.terms.map(
    (term: NormalizedSearchTerm) => ({
      ...term,
      reasonCode: 'LITERAL_TERM_HIT',
      symbol: false,
    }),
  );
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

function buildGroupArgv(group: readonly SearchSeed[]): string[] {
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
  return argv;
}

function seedKey(seed: SearchSeed): string {
  return `q:${seed.caseSensitive ? 's' : 'i'}:${seed.value}`;
}

function anchorKey(anchor: NormalizedLocateAnchor): string {
  return `a:${anchor.kind}:${anchor.caseSensitive ? 's' : 'i'}:${anchor.value}`;
}

function provenanceForHit(
  hit: BackendHit,
  seeds: readonly SearchSeed[],
  anchors: readonly NormalizedLocateAnchor[],
): CompleteSafeBackendHitForF3V2 {
  const querySeedKeys = seeds
    .filter((seed) => {
      if (hit.reasonCodes.includes('FILE_ANCHOR_HIT')) {
        return false;
      }
      if (seed.symbol) {
        return hit.symbol !== undefined && matchesSeed(hit.symbol, seed);
      }
      if (hit.matchedText !== undefined) {
        return seed.caseSensitive
          ? hit.matchedText.includes(seed.value)
          : hit.matchedText
              .toLocaleLowerCase('und')
              .includes(seed.value.toLocaleLowerCase('und'));
      }
      return hit.reasonCodes.includes(seed.reasonCode);
    })
    .map(seedKey)
    .sort();
  const matchedAnchorKeys = anchors
    .filter((anchor) => {
      if (anchor.kind === 'file') {
        return hit.file === posix.normalize(anchor.value.replaceAll('\\', '/'));
      }
      if (anchor.kind === 'symbol') {
        return (
          hit.symbol !== undefined &&
          matchesSeed(hit.symbol, {
            value: anchor.value,
            caseSensitive: anchor.caseSensitive,
            reasonCode: 'SYMBOL_SEARCH_HIT',
            symbol: true,
          })
        );
      }
      return (
        hit.matchedText !== undefined &&
        matchesSeed(hit.matchedText, {
          value: anchor.value,
          caseSensitive: anchor.caseSensitive,
          reasonCode: 'LITERAL_TERM_HIT',
          symbol: false,
        })
      );
    })
    .map(anchorKey)
    .sort();
  return Object.freeze({
    hit,
    querySeedKeys: Object.freeze(querySeedKeys),
    matchedAnchorKeys: Object.freeze(matchedAnchorKeys),
  });
}

function acceptRipgrepCompletedExit(
  exitCode: number,
  complete: RipgrepJsonConsumerCompleteV2,
): boolean {
  if (exitCode === 0) {
    return (
      complete.matchCount > 0 &&
      complete.stats.matchedLines > 0 &&
      complete.stats.matches > 0
    );
  }
  if (exitCode === 1) {
    return (
      complete.matchCount === 0 &&
      complete.scopeCount === 0 &&
      complete.stats.matchedLines === 0 &&
      complete.stats.matches === 0 &&
      complete.stats.searchesWithMatch === 0
    );
  }
  return false;
}

function emptyLegacyResult(
  health: BackendSearchResult['health'],
): BackendSearchResult {
  return Object.freeze({
    health,
    hits: Object.freeze([] as const),
    complete: false,
  });
}

type StreamingGroupResultV2 = SafeProcessStreamingResultV2<
  RipgrepJsonConsumerPartialV2,
  RipgrepJsonConsumerCompleteV2
>;

type GroupTerminalV2 =
  | { readonly kind: 'ok' }
  | { readonly kind: 'early-stop' }
  | { readonly kind: 'aborted' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'output-limit' }
  | { readonly kind: 'process-error' };

function classifyStreamingGroupResult(
  result: StreamingGroupResultV2,
): GroupTerminalV2 {
  if (result.ok && result.kind === 'completed') {
    if (
      result.stdout.kind === 'complete' &&
      acceptRipgrepCompletedExit(result.exitCode, result.stdout.value)
    ) {
      return { kind: 'ok' };
    }
    return { kind: 'process-error' };
  }
  if (!result.ok && result.kind === 'consumer-stop') {
    return { kind: 'early-stop' };
  }
  if (!result.ok && result.kind === 'aborted') {
    return { kind: 'aborted' };
  }
  if (!result.ok && result.kind === 'timeout') {
    return { kind: 'timeout' };
  }
  if (
    !result.ok &&
    (result.kind === 'stdout-limit' || result.kind === 'stderr-limit')
  ) {
    return { kind: 'output-limit' };
  }
  return { kind: 'process-error' };
}

function buildExpandedOutcomeShape(input: {
  readonly expandedHits: readonly BackendHit[];
  readonly expandedComplete: boolean;
  readonly earlyStop: boolean;
  readonly terminal: GroupTerminalV2 | undefined;
  readonly unavailable: boolean;
}): BackendExecutionOutcomeV2 {
  if (input.unavailable) {
    return {
      backend: 'ripgrep',
      status: 'unavailable',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'none',
      reasonCode: 'RIPGREP_UNAVAILABLE',
      hitCount: 0,
      retainedHits: Object.freeze([]),
    };
  }
  if (input.terminal?.kind === 'aborted') {
    return {
      backend: 'ripgrep',
      status: 'used',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'aborted',
      reasonCode: 'BACKEND_ABORTED',
      hitCount: input.expandedHits.length,
      retainedHits: input.expandedHits,
    };
  }
  if (input.terminal?.kind === 'timeout') {
    return {
      backend: 'ripgrep',
      status: 'failed',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'timeout',
      reasonCode: 'BACKEND_PROCESS_FAILED',
      hitCount: input.expandedHits.length,
      retainedHits: input.expandedHits,
    };
  }
  if (input.terminal?.kind === 'output-limit') {
    return {
      backend: 'ripgrep',
      status: 'used',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'output-limit',
      hitCount: input.expandedHits.length,
      retainedHits: input.expandedHits,
    };
  }
  if (input.terminal?.kind === 'process-error') {
    return {
      backend: 'ripgrep',
      status: 'failed',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'process-error',
      reasonCode: 'BACKEND_PROCESS_FAILED',
      hitCount: input.expandedHits.length,
      retainedHits: input.expandedHits,
    };
  }
  if (input.earlyStop || input.terminal?.kind === 'early-stop') {
    return {
      backend: 'ripgrep',
      status: 'used',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'early-stop',
      hitCount: input.expandedHits.length,
      retainedHits: input.expandedHits,
    };
  }
  if (input.expandedComplete) {
    return {
      backend: 'ripgrep',
      status: 'used',
      completion: 'complete',
      selectionEligibility: 'complete-safe-set',
      termination: 'none',
      ...(input.expandedHits.length === 0
        ? { reasonCode: 'RIPGREP_NO_RESULT' as const }
        : {}),
      hitCount: input.expandedHits.length,
      retainedHits: input.expandedHits,
    };
  }
  return {
    backend: 'ripgrep',
    status: 'failed',
    completion: 'incomplete',
    selectionEligibility: 'telemetry-only',
    termination: 'process-error',
    reasonCode: 'BACKEND_PROCESS_FAILED',
    hitCount: input.expandedHits.length,
    retainedHits: input.expandedHits,
  };
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
    const firstLine = Buffer.from(result.stdout)
      .toString('utf8')
      .split(/\r?\n/u)[0];
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
      const result = await this.processRunner.run(
        {
          executable: 'rg',
          argv: buildGroupArgv(group),
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
        const reasonCodes = Array.from(
          new Set(matchedSeedFacts.map((fact) => fact.seed.reasonCode)),
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
        ).sort((left, right) => (left === right ? 0 : left < right ? -1 : 1));
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
        ...(hits.length === 0
          ? { reasonCode: 'RIPGREP_NO_RESULT' as const }
          : {}),
      },
      hits: Object.freeze(hits.sort(compareHits).slice(0, request.maxHits)),
      complete,
    };
  }

  /**
   * F5 multi-view handoff：availability → startStreaming groups → seal/reducer。
   * 禁止 buffered search()/parseJsonLines 桥接；outcome 绑 ripgrep-group。
   */
  public async searchViews(
    request: RipgrepMultiViewSearchRequestV2,
    signal: AbortSignal,
    backendExecutionContext: BackendExecutionContextV2,
    execution: LocateExecutionTokenV2,
  ): Promise<TrustedBackendDiscoveryHandoffV2> {
    const executor = requireBackendPhysicalAttemptExecutorV2(
      backendExecutionContext,
      'ripgrep',
      execution,
    );
    const fallback: BackendFallbackFactsForF3V2 = Object.freeze({
      primaryNeededFallback: false,
      fallbackInvoked: false,
      fallbackAcceptedForExpanded: false,
      fallbackAcceptedForLegacy: false,
    });
    const abortedHealth = {
      state: 'unavailable' as const,
      reasonCode: 'BACKEND_ABORTED' as const,
    };

    if (signal.aborted) {
      try {
        const observation = executor.observePreAbortedNoStart(
          signal,
          execution,
        );
        const decision = createBackendNoStartDecisionV2(
          observation,
          backendExecutionContext,
          execution,
        );
        const empty = emptyLegacyResult(abortedHealth);
        return createTrustedBackendDiscoveryHandoffV2(
          {
            kind: 'no-start',
            request,
            decision,
            legacy: empty,
            fallback,
            expandedHealth: empty.health,
          },
          backendExecutionContext,
          execution,
        );
      } catch {
        // not the exact request signal — continue
      }
    }

    const versionRequest = {
      executable: 'rg',
      argv: ['--version'],
      cwd: request.base.repositoryRoot,
      ...PROCESS_LIMITS,
    };
    const prepared = await executor.prepareAvailabilityProbe(
      {
        backend: 'ripgrep',
        argvClass: 'ripgrep-version',
        request: versionRequest,
      },
      execution,
    );
    if (!prepared.ok) {
      const observation = executor.observeAvailabilityPreparationFailureNoStart(
        prepared,
        execution,
      );
      const decision = createBackendNoStartDecisionV2(
        observation,
        backendExecutionContext,
        execution,
      );
      const empty = emptyLegacyResult({
        state: 'missing',
        reasonCode: 'RIPGREP_UNAVAILABLE',
      });
      return createTrustedBackendDiscoveryHandoffV2(
        {
          kind: 'no-start',
          request,
          decision,
          legacy: empty,
          fallback,
          expandedHealth: empty.health,
        },
        backendExecutionContext,
        execution,
      );
    }

    const versionStart = executor.startAvailabilityProbe(
      {
        backend: 'ripgrep',
        laneMask: 'expanded-and-legacy',
        kind: 'ripgrep-version',
        request: versionRequest,
      },
      prepared.prepared,
      signal,
      execution,
    );
    const versionSettled = await executor.settlePhysicalAttempt(
      versionStart,
      execution,
    );
    const versionView = executor.requireResult(versionSettled, execution);
    const versionResult =
      versionView.result as AvailabilityProbeExecutionResultV2;

    const finishHandoff = (
      outcomeShape: BackendExecutionOutcomeV2,
      legacy: BackendSearchResult,
      expandedHealth: BackendSearchResult['health'],
      completeSafeHits: readonly CompleteSafeBackendHitForF3V2[],
      groupSettled: readonly {
        readonly settled: BackendPhysicalAttemptResultV2<StreamingGroupResultV2>;
        readonly laneMask: BackendPhysicalAttemptLaneMaskV2;
      }[],
      bindSearchToVersion: boolean,
    ): TrustedBackendDiscoveryHandoffV2 => {
      const signed = signBackendExecutionOutcomeForFactsV2(
        outcomeShape,
        backendExecutionContext,
        execution,
      );
      if (bindSearchToVersion) {
        createExpandedLaneAttemptFactsV2(
          versionSettled,
          signed,
          backendExecutionContext,
          execution,
        );
      } else {
        // version probe 只登记可用性占位，禁止承载 search hits
        createExpandedLaneAttemptFactsV2(
          versionSettled,
          Object.freeze({ kind: 'ripgrep-version-availability' }),
          backendExecutionContext,
          execution,
        );
        for (const group of groupSettled) {
          if (group.laneMask === 'legacy-only') {
            continue;
          }
          createExpandedLaneAttemptFactsV2(
            group.settled,
            signed,
            backendExecutionContext,
            execution,
          );
        }
      }
      const seal = sealExpandedBackendAttemptSetV2(
        backendExecutionContext,
        'ripgrep',
        execution,
      );
      const attempt = requireExpandedBackendAttemptReducerV2(
        backendExecutionContext,
        execution,
      ).reduce(seal, execution);
      if (attempt === undefined) {
        throw new TypeError('missing-logical-attempt');
      }
      return createTrustedBackendDiscoveryHandoffV2(
        {
          kind: 'started',
          request,
          attempt,
          legacy,
          fallback,
          expandedHealth,
          completeSafeHits,
          canSkipFallbackIfVerified: false,
        },
        backendExecutionContext,
        execution,
      );
    };

    if (!versionResult.ok || versionResult.kind !== 'completed') {
      const unavailable =
        !versionResult.ok && versionResult.kind === 'executable-not-found';
      const outcomeShape = buildExpandedOutcomeShape({
        expandedHits: Object.freeze([]),
        expandedComplete: false,
        earlyStop: false,
        terminal: unavailable ? undefined : { kind: 'process-error' },
        unavailable,
      });
      const health = unavailable
        ? {
            state: 'missing' as const,
            reasonCode: 'RIPGREP_UNAVAILABLE' as const,
          }
        : {
            state: 'error' as const,
            reasonCode: 'BACKEND_PROCESS_FAILED' as const,
          };
      return finishHandoff(
        outcomeShape,
        emptyLegacyResult(health),
        health,
        Object.freeze([]),
        [],
        true,
      );
    }

    const versionLine = Buffer.from(versionResult.stdout)
      .toString('utf8')
      .split(/\r?\n/u)[0];
    if (versionLine === undefined || versionLine.length === 0) {
      const health = {
        state: 'error' as const,
        reasonCode: 'BACKEND_PROCESS_FAILED' as const,
      };
      return finishHandoff(
        buildExpandedOutcomeShape({
          expandedHits: Object.freeze([]),
          expandedComplete: false,
          earlyStop: false,
          terminal: { kind: 'process-error' },
          unavailable: false,
        }),
        emptyLegacyResult(health),
        health,
        Object.freeze([]),
        [],
        true,
      );
    }

    const seeds = searchSeeds({
      ...request.base,
      maxHits: Math.max(request.expandedMaxHits, request.legacyMaxHits),
    });
    const groups = [true, false]
      .map((caseSensitive) =>
        seeds.filter((seed) => seed.caseSensitive === caseSensitive),
      )
      .filter((group) => group.length > 0);
    const accumulator = new MultiViewAccumulatorV2({
      expandedMaxHits: request.expandedMaxHits,
      legacyMaxHits: request.legacyMaxHits,
      fileAnchors: request.base.anchors,
    });

    const groupSettled: {
      settled: BackendPhysicalAttemptResultV2<StreamingGroupResultV2>;
      laneMask: BackendPhysicalAttemptLaneMaskV2;
    }[] = [];
    let terminal: GroupTerminalV2 | undefined;

    for (const group of groups) {
      const snap = accumulator.snapshot();
      if (snap.allLanesFrozen) {
        break;
      }
      const legacyBegin = accumulator.beginGroup();
      const expandedFrozen = accumulator.snapshot().expanded.frozen;
      if (expandedFrozen && legacyBegin === 'legacy-complete') {
        break;
      }
      const laneMask: BackendPhysicalAttemptLaneMaskV2 = expandedFrozen
        ? 'legacy-only'
        : legacyBegin === 'legacy-complete'
          ? 'expanded-only'
          : 'expanded-and-legacy';

      const groupSeeds: readonly MultiViewSeedV2[] = Object.freeze(
        group.map((seed) =>
          Object.freeze({
            value: seed.value,
            caseSensitive: seed.caseSensitive,
            reasonCode: seed.reasonCode,
            symbol: seed.symbol,
          }),
        ),
      );
      const consumer = new RipgrepJsonLineConsumerV2({
        allowContext: false,
        onMatch: (match) => {
          const decision = accumulator.observeMatch(match, groupSeeds);
          return decision === 'all-frozen' ? 'stop' : 'continue';
        },
      });
      const groupStart = executor.startStreaming(
        {
          backend: 'ripgrep',
          laneMask,
          kind: 'ripgrep-group',
          request: {
            executable: 'rg',
            argv: buildGroupArgv(group),
            cwd: request.base.repositoryRoot,
            ...PROCESS_LIMITS,
          },
        },
        signal,
        consumer,
        execution,
      );
      const settled = await executor.settlePhysicalAttempt(
        groupStart,
        execution,
      );
      groupSettled.push({ settled, laneMask });
      const groupView = executor.requireResult(settled, execution);
      const classified = classifyStreamingGroupResult(groupView.result);
      if (classified.kind === 'ok') {
        accumulator.commitGroup();
      } else {
        accumulator.discardGroup();
        if (classified.kind === 'early-stop') {
          // all-lanes freeze；若 expanded 已 early-stop 则保留该 termination
          if (!accumulator.expandedIsEarlyStop()) {
            terminal = { kind: 'process-error' };
          } else {
            terminal = { kind: 'early-stop' };
          }
          break;
        }
        terminal = classified;
        break;
      }
    }

    if (!accumulator.snapshot().legacy.frozen) {
      accumulator.finishNaturalLegacy();
    }
    if (!accumulator.expandedIsEarlyStop() && terminal === undefined) {
      accumulator.markExpandedComplete();
    }

    const finalSnap = accumulator.snapshot();
    const expandedHits = finalSnap.expanded.hits;
    const earlyStop = accumulator.expandedIsEarlyStop();
    const expandedComplete =
      terminal === undefined && !earlyStop && finalSnap.expanded.complete;
    const outcomeShape = buildExpandedOutcomeShape({
      expandedHits,
      expandedComplete,
      earlyStop,
      terminal,
      unavailable: false,
    });
    const availableHealth = {
      state: 'available' as const,
      version: versionLine,
      ...(expandedComplete && expandedHits.length === 0
        ? { reasonCode: 'RIPGREP_NO_RESULT' as const }
        : {}),
    };
    const legacy: BackendSearchResult = Object.freeze({
      health: availableHealth,
      hits: finalSnap.legacy.hits,
      complete: finalSnap.legacy.complete && terminal === undefined,
    });
    const completeSafeHits = Object.freeze(
      expandedComplete
        ? expandedHits.map((hit) =>
            provenanceForHit(hit, seeds, request.base.anchors),
          )
        : [],
    );
    const expandedRelatedGroups = groupSettled.filter(
      (entry) => entry.laneMask !== 'legacy-only',
    );
    return finishHandoff(
      outcomeShape,
      legacy,
      availableHealth,
      completeSafeHits,
      groupSettled,
      expandedRelatedGroups.length === 0,
    );
  }
}
