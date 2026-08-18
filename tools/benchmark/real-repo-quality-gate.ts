/**
 * Quality gate over fixture catalog plus optional extra local repositories.
 * Extra paths come from REPO_NAV_REAL_REPOS (path-separated). No remotes are cloned.
 */

import { existsSync } from 'node:fs';
import { delimiter, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LocateRequestSchema } from '../../src/contracts/index.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import {
  runRealRepoBenchmark,
  type RealRepoBenchmarkSummary,
} from './real-repo-benchmark-runner.js';
import {
  runCodeGraphDifferentialQualityGate,
  type CodeGraphDifferentialSummary,
} from './codegraph-differential-quality-gate.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(moduleDirectory, '..', '..');

export interface RealRepoQualityMetrics {
  readonly sampleCount: number;
  readonly passed: number;
  readonly failed: number;
  readonly timeoutRate: number;
  readonly noResultRate: number;
  readonly partialRate: number;
  readonly medianElapsedMs: number;
  readonly p90ElapsedMs: number;
}

export interface RealRepoQualityGateSummary {
  readonly ok: boolean;
  readonly fixture: RealRepoBenchmarkSummary;
  readonly codegraphDifferential: CodeGraphDifferentialSummary;
  readonly extraRepoCount: number;
  readonly extraFailures: readonly string[];
  readonly metrics: RealRepoQualityMetrics;
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index] ?? 0;
}

function extraRepoPaths(): readonly string[] {
  const raw = process.env.REPO_NAV_REAL_REPOS;
  if (raw === undefined || raw.trim().length === 0) {
    return Object.freeze([]);
  }
  return Object.freeze(
    raw
      .split(delimiter)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

/**
 * Run fixture quality plus optional extra local repositories.
 */
export async function runRealRepoQualityGate(
  root: string = repositoryRoot,
): Promise<RealRepoQualityGateSummary> {
  const fixture = await runRealRepoBenchmark(root);
  const codegraphDifferential = await runCodeGraphDifferentialQualityGate(root);
  const extraFailures: string[] = [];
  const extraRepos = extraRepoPaths();
  const languageFixtures = Object.freeze([
    Object.freeze({
      repoPath: resolve(
        root,
        'testkit/fixtures/benchmark-repos/bench-13-python-mapping',
      ),
      terms: ['target_field', 'row.source_field'],
      mustIncludeFile: 'server/mapping.py',
    }),
    Object.freeze({
      repoPath: resolve(
        root,
        'testkit/fixtures/benchmark-repos/bench-14-go-mapping',
      ),
      terms: ['targetField', 'row.SourceField'],
      mustIncludeFile: 'server/mapping.go',
    }),
  ]);
  const harness = createCanonicalLocateEngineHarnessV2(
    [new RipgrepBackend(new NodeSafeProcessRunner())],
    new NodeRepositoryReader(),
  );
  for (const languageFixture of languageFixtures) {
    if (!existsSync(languageFixture.repoPath)) {
      extraFailures.push(
        `missing language fixture ${languageFixture.repoPath}`,
      );
      continue;
    }
    const request = LocateRequestSchema.parse({
      repoPath: languageFixture.repoPath,
      terms: languageFixture.terms,
      limits: {
        timeoutMs: 10_000,
        maxFiles: 8,
        maxConfirmed: 8,
        maxCandidates: 8,
      },
    });
    const result = await harness.service.locate(request, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!result.ok) {
      extraFailures.push(`${languageFixture.repoPath}: ${result.error.code}`);
      continue;
    }
    const hasFile = [
      ...result.evidence.confirmed,
      ...result.evidence.candidates,
    ].some((item) => item.location.file === languageFixture.mustIncludeFile);
    if (!hasFile) {
      extraFailures.push(
        `${languageFixture.repoPath}: missing ${languageFixture.mustIncludeFile}`,
      );
    }
  }
  for (const repoPath of extraRepos) {
    const resolved = resolve(repoPath);
    if (!existsSync(resolved)) {
      extraFailures.push(`missing extra repo ${resolved}`);
      continue;
    }
    const request = LocateRequestSchema.parse({
      repoPath: resolved,
      terms: ['main'],
      limits: {
        timeoutMs: 10_000,
        maxFiles: 8,
        maxConfirmed: 8,
        maxCandidates: 8,
      },
    });
    const result = await harness.service.locate(request, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!result.ok) {
      extraFailures.push(`${resolved}: ${result.error.code}`);
    }
  }

  const elapsed = fixture.results.map((result) => result.elapsedMs);
  const timeoutCount = fixture.results.filter(
    (result) => result.status === 'timeout',
  ).length;
  const noResultCount = fixture.results.filter(
    (result) => result.status === 'no_result',
  ).length;
  const partialCount = fixture.results.filter(
    (result) => result.status === 'partial',
  ).length;
  const metrics: RealRepoQualityMetrics = Object.freeze({
    sampleCount: fixture.results.length,
    passed: fixture.passed,
    failed: fixture.failed,
    timeoutRate:
      fixture.results.length === 0 ? 0 : timeoutCount / fixture.results.length,
    noResultRate:
      fixture.results.length === 0 ? 0 : noResultCount / fixture.results.length,
    partialRate:
      fixture.results.length === 0 ? 0 : partialCount / fixture.results.length,
    medianElapsedMs: percentile(elapsed, 0.5),
    p90ElapsedMs: percentile(elapsed, 0.9),
  });
  const ok =
    fixture.ok &&
    codegraphDifferential.ok &&
    extraFailures.length === 0 &&
    metrics.timeoutRate === 0;
  return Object.freeze({
    ok,
    fixture,
    codegraphDifferential,
    extraRepoCount: extraRepos.length,
    extraFailures: Object.freeze(extraFailures),
    metrics,
  });
}

async function main(): Promise<void> {
  const summary = await runRealRepoQualityGate();
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
