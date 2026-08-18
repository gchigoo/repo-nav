/**
 * Non-regression gate: repo-nav must preserve the exact, ordered, top-K symbol
 * locations returned by the pinned CodeGraph CLI. Preserved locations must
 * remain filesystem-confirmed and retain CodeGraph provenance. Extra evidence
 * may only follow the standalone CodeGraph prefix.
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LocateRequestSchema } from '../../src/contracts/index.js';
import type { LocateResultV2 } from '../../src/contracts/v2/locate-result-v2.js';
import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import { createCodeGraphProcessInvocation } from '../../src/repository/codegraph-command.js';
import { parseCodeGraphQuery } from '../../src/repository/codegraph-json.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(moduleDirectory, '..', '..');
const TOP_K = 5;
export const EXPECTED_CODEGRAPH_VERSION = '1.5.0';

export interface CodeGraphDifferentialCase {
  readonly id: string;
  readonly path: string;
  readonly symbol: string;
  readonly requestMode: 'symbol-anchor' | 'term-only';
}

export const CODEGRAPH_DIFFERENTIAL_CASES = Object.freeze([
  Object.freeze({
    id: 'codegraph-typescript-symbol',
    path: 'typescript',
    symbol: 'verifyAccessToken',
    requestMode: 'symbol-anchor',
  }),
  Object.freeze({
    id: 'codegraph-javascript-symbol',
    path: 'javascript',
    symbol: 'renderBenchmarkChart',
    requestMode: 'symbol-anchor',
  }),
  Object.freeze({
    id: 'codegraph-python-symbol',
    path: 'python',
    symbol: 'load_password_policy',
    requestMode: 'symbol-anchor',
  }),
  Object.freeze({
    id: 'codegraph-go-symbol',
    path: 'go',
    symbol: 'ResolveAuthToken',
    requestMode: 'symbol-anchor',
  }),
  Object.freeze({
    id: 'codegraph-typescript-term-only',
    path: 'typescript',
    symbol: 'verifyAccessToken',
    requestMode: 'term-only',
  }),
  Object.freeze({
    id: 'codegraph-javascript-term-only',
    path: 'javascript',
    symbol: 'renderBenchmarkChart',
    requestMode: 'term-only',
  }),
  Object.freeze({
    id: 'codegraph-python-term-only',
    path: 'python',
    symbol: 'load_password_policy',
    requestMode: 'term-only',
  }),
  Object.freeze({
    id: 'codegraph-go-term-only',
    path: 'go',
    symbol: 'ResolveAuthToken',
    requestMode: 'term-only',
  }),
] as const satisfies readonly CodeGraphDifferentialCase[]);

export interface DifferentialEvidenceView {
  readonly orderedLocationKeys: readonly string[];
  readonly confirmedLocationKeys: readonly string[];
  readonly codegraphProvenanceLocationKeys: readonly string[];
  readonly codegraphHitCount: number;
  readonly ripgrepHitCount: number;
  readonly fallbackChecked: boolean;
}

export interface CodeGraphDifferentialMetrics {
  readonly baselineCount: number;
  readonly combinedCount: number;
  readonly retainedCount: number;
  readonly retainedRatio: number;
  readonly confirmedRetainedCount: number;
  readonly confirmedRetainedRatio: number;
  readonly codegraphProvenanceRetainedCount: number;
  readonly codegraphProvenanceRetainedRatio: number;
  readonly rankInversions: number;
  readonly maxRankRegression: number;
  readonly exactPrefixPreserved: boolean;
  readonly unexpectedPrefixCount: number;
  readonly topOnePreserved: boolean;
  readonly fallbackAmplification: number;
  readonly fallbackChecked: boolean;
}

export interface CodeGraphDifferentialCaseResult {
  readonly id: string;
  readonly status: 'passed' | 'failed' | 'skipped';
  readonly ok: boolean;
  readonly reason?: string;
  readonly codegraphVersion?: string;
  readonly metrics?: CodeGraphDifferentialMetrics;
}

export interface CodeGraphDifferentialSummary {
  readonly ok: boolean;
  readonly status: 'executed' | 'skipped';
  readonly executed: number;
  readonly skipped: number;
  readonly failed: number;
  readonly cases: readonly CodeGraphDifferentialCaseResult[];
}

function evidenceLocationKey(
  item: Readonly<{
    location: Readonly<{
      file: string;
      lines: readonly [number, number];
      symbol?: string | undefined;
    }>;
  }>,
): string {
  // Filesystem verification may safely widen a one-line CodeGraph locator to
  // a declaration window (for example package/header lines in Go). The model
  // navigation identity is the repository-relative file plus exact symbol;
  // widening the excerpt is not a rank or retention regression.
  return [item.location.file, item.location.symbol ?? ''].join('\u0000');
}

function uniqueLocationKeys(values: readonly string[]): readonly string[] {
  return Object.freeze(Array.from(new Set(values)));
}

export function differentialEvidenceView(
  result: LocateResultV2,
  topK: number = TOP_K,
): DifferentialEvidenceView | undefined {
  if (!result.ok) {
    return undefined;
  }
  const evidence = [
    ...result.evidence.confirmed,
    ...result.evidence.candidates,
  ];
  const orderedLocationKeys = uniqueLocationKeys(
    evidence.map(evidenceLocationKey),
  ).slice(0, topK);
  const confirmedLocationKeys = uniqueLocationKeys(
    result.evidence.confirmed.map(evidenceLocationKey),
  );
  const codegraphProvenanceLocationKeys = uniqueLocationKeys(
    evidence
      .filter((item) => item.provenance.discoveredBy.includes('codegraph'))
      .map(evidenceLocationKey),
  );
  const hitCount = (backend: 'codegraph' | 'ripgrep'): number =>
    result.evidence.coverage.backends.find(
      (attempt) => attempt.backend === backend,
    )?.hitCount ?? 0;
  return Object.freeze({
    orderedLocationKeys: Object.freeze(orderedLocationKeys),
    confirmedLocationKeys,
    codegraphProvenanceLocationKeys,
    codegraphHitCount: hitCount('codegraph'),
    ripgrepHitCount: hitCount('ripgrep'),
    fallbackChecked: result.evidence.coverage.fallbackChecked,
  });
}

function standaloneCodeGraphEvidenceView(
  hits: readonly Readonly<{
    file: string;
    lines?: readonly [number, number] | undefined;
    symbol?: string | undefined;
  }>[],
  topK: number = TOP_K,
): DifferentialEvidenceView {
  const keys = uniqueLocationKeys(
    hits.flatMap((hit) =>
      hit.lines === undefined
        ? []
        : [
            evidenceLocationKey({
              location: {
                file: hit.file,
                lines: hit.lines,
                ...(hit.symbol === undefined ? {} : { symbol: hit.symbol }),
              },
            }),
          ],
    ),
  ).slice(0, topK);
  return Object.freeze({
    orderedLocationKeys: Object.freeze(keys),
    confirmedLocationKeys: Object.freeze(keys),
    codegraphProvenanceLocationKeys: Object.freeze(keys),
    codegraphHitCount: keys.length,
    ripgrepHitCount: 0,
    fallbackChecked: false,
  });
}

export function evaluateCodeGraphDifferential(
  baseline: DifferentialEvidenceView,
  combined: DifferentialEvidenceView,
): CodeGraphDifferentialMetrics {
  const baselineKeys = uniqueLocationKeys(baseline.orderedLocationKeys);
  const combinedKeys = uniqueLocationKeys(combined.orderedLocationKeys);
  const combinedIndexes = new Map(
    combinedKeys.map((key, index) => [key, index]),
  );
  const retainedIndexes = baselineKeys.flatMap((key) => {
    const index = combinedIndexes.get(key);
    return index === undefined ? [] : [index];
  });
  let rankInversions = 0;
  for (let index = 1; index < retainedIndexes.length; index += 1) {
    if (retainedIndexes[index]! < retainedIndexes[index - 1]!) {
      rankInversions += 1;
    }
  }
  const baselineCount = baselineKeys.length;
  const membershipCount = (candidates: readonly string[]): number => {
    const candidateSet = new Set(candidates);
    return baselineKeys.filter((key) => candidateSet.has(key)).length;
  };
  const confirmedRetainedCount = membershipCount(
    combined.confirmedLocationKeys,
  );
  const codegraphProvenanceRetainedCount = membershipCount(
    combined.codegraphProvenanceLocationKeys,
  );
  const ratio = (count: number): number =>
    baselineCount === 0 ? 0 : count / baselineCount;
  const rankRegressions = retainedIndexes.map((combinedIndex, baselineIndex) =>
    Math.max(0, combinedIndex - baselineIndex),
  );
  const expectedPrefix = baselineKeys.slice(0, baselineCount);
  const actualPrefix = combinedKeys.slice(0, baselineCount);
  const baselineSet = new Set(baselineKeys);
  return Object.freeze({
    baselineCount,
    combinedCount: combinedKeys.length,
    retainedCount: retainedIndexes.length,
    retainedRatio: ratio(retainedIndexes.length),
    confirmedRetainedCount,
    confirmedRetainedRatio: ratio(confirmedRetainedCount),
    codegraphProvenanceRetainedCount,
    codegraphProvenanceRetainedRatio: ratio(codegraphProvenanceRetainedCount),
    rankInversions,
    maxRankRegression: Math.max(0, ...rankRegressions),
    exactPrefixPreserved:
      baselineCount > 0 &&
      expectedPrefix.every((key, index) => actualPrefix[index] === key),
    unexpectedPrefixCount: actualPrefix.filter((key) => !baselineSet.has(key))
      .length,
    topOnePreserved: baselineCount > 0 && baselineKeys[0] === combinedKeys[0],
    fallbackAmplification:
      combined.ripgrepHitCount / Math.max(1, combined.codegraphHitCount),
    fallbackChecked: combined.fallbackChecked,
  });
}

export function passesCodeGraphNonRegressionContract(
  metrics: CodeGraphDifferentialMetrics,
): boolean {
  return (
    metrics.baselineCount > 0 &&
    metrics.retainedRatio === 1 &&
    metrics.confirmedRetainedRatio === 1 &&
    metrics.codegraphProvenanceRetainedRatio === 1 &&
    metrics.rankInversions === 0 &&
    metrics.maxRankRegression === 0 &&
    metrics.exactPrefixPreserved &&
    metrics.unexpectedPrefixCount === 0 &&
    metrics.topOnePreserved &&
    metrics.fallbackAmplification === 0 &&
    !metrics.fallbackChecked
  );
}

async function runCase(
  root: string,
  entry: CodeGraphDifferentialCase,
): Promise<CodeGraphDifferentialCaseResult> {
  const repoPath = resolve(
    root,
    'testkit/fixtures/codegraph-differential',
    entry.path,
  );
  if (!existsSync(repoPath)) {
    return Object.freeze({
      id: entry.id,
      status: 'failed',
      ok: false,
      reason: 'fixture-missing',
    });
  }

  const runner = new NodeSafeProcessRunner();
  const codegraph = new CodeGraphBackend(runner);
  const health = await codegraph.probe(repoPath, AbortSignal.timeout(10_000));
  if (health.state !== 'available') {
    return Object.freeze({
      id: entry.id,
      status: 'skipped',
      ok: true,
      reason: health.reasonCode ?? health.state,
    });
  }

  if (health.version !== EXPECTED_CODEGRAPH_VERSION) {
    return Object.freeze({
      id: entry.id,
      status: 'failed',
      ok: false,
      reason: 'codegraph-version-mismatch',
      ...(health.version === undefined
        ? {}
        : { codegraphVersion: health.version }),
    });
  }

  const standaloneQuery = await runner.run(
    {
      ...createCodeGraphProcessInvocation([
        'query',
        '--json',
        '--path',
        repoPath,
        '--limit',
        String(TOP_K),
        entry.symbol,
      ]),
      cwd: repoPath,
      timeoutMs: 10_000,
      maxStdoutBytes: 8 * 1024 * 1024,
      maxStderrBytes: 1024 * 1024,
      terminateGraceMs: 500,
    },
    AbortSignal.timeout(10_000),
  );
  if (!standaloneQuery.ok) {
    return Object.freeze({
      id: entry.id,
      status: 'failed',
      ok: false,
      reason: 'standalone-codegraph-query-failed',
      codegraphVersion: health.version,
    });
  }
  const standaloneParsed = parseCodeGraphQuery(standaloneQuery.stdout, {
    value: entry.symbol,
    caseSensitive: true,
    source: entry.requestMode === 'symbol-anchor' ? 'symbol-anchor' : 'term',
  });
  if (standaloneParsed === undefined) {
    return Object.freeze({
      id: entry.id,
      status: 'failed',
      ok: false,
      reason: 'standalone-codegraph-json-invalid',
      codegraphVersion: health.version,
    });
  }

  const request = LocateRequestSchema.parse({
    repoPath,
    terms: [entry.symbol],
    termCase: 'sensitive',
    ...(entry.requestMode === 'symbol-anchor'
      ? { anchors: [{ kind: 'symbol' as const, value: entry.symbol }] }
      : {}),
    limits: {
      timeoutMs: 10_000,
      maxFiles: TOP_K,
      maxConfirmed: TOP_K,
      maxCandidates: TOP_K,
    },
  });
  const reader = new NodeRepositoryReader();
  const combinedHarness = createCanonicalLocateEngineHarnessV2(
    [codegraph, new RipgrepBackend(runner)],
    reader,
  );
  const combinedResult = await combinedHarness.service.locate(request, {
    signal: AbortSignal.timeout(10_000),
  });
  const baseline = standaloneCodeGraphEvidenceView(standaloneParsed.hits);
  const combined = differentialEvidenceView(combinedResult);
  if (combined === undefined) {
    return Object.freeze({
      id: entry.id,
      status: 'failed',
      ok: false,
      reason: 'locate-failed',
      codegraphVersion: health.version,
    });
  }
  const metrics = evaluateCodeGraphDifferential(baseline, combined);
  const ok = passesCodeGraphNonRegressionContract(metrics);
  return Object.freeze({
    id: entry.id,
    status: ok ? 'passed' : 'failed',
    ok,
    codegraphVersion: health.version,
    metrics,
    ...(ok ? {} : { reason: 'differential-regression' }),
  });
}

export async function runCodeGraphDifferentialQualityGate(
  root: string = repositoryRoot,
  requireExecution: boolean = process.env[
    'REPO_NAV_REQUIRE_CODEGRAPH_DIFFERENTIAL'
  ] === '1',
): Promise<CodeGraphDifferentialSummary> {
  const cases: CodeGraphDifferentialCaseResult[] = [];
  for (const entry of CODEGRAPH_DIFFERENTIAL_CASES) {
    cases.push(await runCase(root, entry));
  }
  const executed = cases.filter((entry) => entry.status !== 'skipped').length;
  const skipped = cases.length - executed;
  const failed = cases.filter((entry) => !entry.ok).length;
  return Object.freeze({
    ok: failed === 0 && (!requireExecution || executed === cases.length),
    status: executed === 0 ? 'skipped' : 'executed',
    executed,
    skipped,
    failed,
    cases: Object.freeze(cases),
  });
}

async function main(): Promise<void> {
  const summary = await runCodeGraphDifferentialQualityGate(
    repositoryRoot,
    true,
  );
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!summary.ok) {
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(entryPath)
) {
  await main();
}
