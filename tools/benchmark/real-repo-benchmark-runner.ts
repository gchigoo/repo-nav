/**
 * Fixture-scenario acceptance + single-run elapsed smoke gate.
 * Not a multi-sample p95 / real open-source repo benchmark.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import {
  AnchorKindSchema,
  LocateRequestSchema,
  RepoLayerSchema,
} from '../../src/contracts/index.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(moduleDirectory, '..', '..');
const catalogPath = resolve(
  repositoryRoot,
  'testkit/fixtures/benchmark-repos/catalog.json',
);

const LanguageFamilySchema = z.enum([
  'ts',
  'js',
  'sql',
  'mixed',
  'unsupported',
]);

const BenchmarkExpectationsSchema = z
  .strictObject({
    minConfirmed: z.number().int().nonnegative(),
    mustIncludeFile: z.string().min(1).optional(),
    mustIncludeSymbol: z.string().min(1).optional(),
    mustNotIncludeLiteral: z.string().min(1).optional(),
    maxElapsedMs: z.number().positive(),
    forbidPublicAbsolutePath: z.literal(true),
  })
  .readonly();

const BenchmarkRequestSchema = z
  .strictObject({
    question: z.string().optional(),
    terms: z.array(z.string().min(1)).min(1).readonly(),
    termCase: z.enum(['sensitive', 'insensitive', 'smart']).optional(),
    anchors: z
      .array(
        z
          .strictObject({
            kind: AnchorKindSchema,
            value: z.string().min(1),
          })
          .readonly(),
      )
      .max(16)
      .readonly()
      .optional(),
    layers: z.array(RepoLayerSchema).max(7).readonly().optional(),
    negativeTerms: z.array(z.string().min(1)).readonly().optional(),
    limits: z
      .strictObject({
        timeoutMs: z.number().int().positive(),
        maxFiles: z.number().int().nonnegative(),
        maxConfirmed: z.number().int().nonnegative(),
        maxCandidates: z.number().int().nonnegative(),
      })
      .readonly()
      .optional(),
  })
  .readonly();

const BenchmarkCatalogEntrySchema = z
  .strictObject({
    id: z.string().min(1),
    path: z.string().min(1),
    languageFamily: LanguageFamilySchema,
    request: BenchmarkRequestSchema,
    expectations: BenchmarkExpectationsSchema,
  })
  .readonly();

export const RealRepoBenchmarkCatalogSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0'),
    repos: z.array(BenchmarkCatalogEntrySchema).min(10),
  })
  .readonly();

export type RealRepoBenchmarkCatalog = z.infer<
  typeof RealRepoBenchmarkCatalogSchema
>;
export type RealRepoBenchmarkCatalogEntry = z.infer<
  typeof BenchmarkCatalogEntrySchema
>;

export function computeRealRepoBenchmarkCatalogSha256(
  path: string = catalogPath,
): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export interface RealRepoBenchmarkCaseResult {
  readonly id: string;
  readonly ok: boolean;
  readonly status: string;
  readonly confirmedCount: number;
  readonly elapsedMs: number;
  readonly failures: readonly string[];
}

export interface RealRepoBenchmarkSummary {
  readonly ok: boolean;
  readonly catalogPath: string;
  readonly repoCount: number;
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly RealRepoBenchmarkCaseResult[];
}

function loadCatalog(path: string = catalogPath): RealRepoBenchmarkCatalog {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return RealRepoBenchmarkCatalogSchema.parse(raw);
}

function evidenceLocations(result: {
  readonly ok: true;
  readonly evidence: {
    readonly confirmed: ReadonlyArray<{
      readonly location: {
        readonly file: string;
        readonly symbol?: string | undefined;
      };
    }>;
    readonly candidates: ReadonlyArray<{
      readonly location: {
        readonly file: string;
        readonly symbol?: string | undefined;
      };
    }>;
  };
}): ReadonlyArray<{
  readonly file: string;
  readonly symbol?: string | undefined;
}> {
  return Object.freeze([
    ...result.evidence.confirmed.map((item) => item.location),
    ...result.evidence.candidates.map((item) => item.location),
  ]);
}

function absolutePathVariants(absolutePath: string): readonly string[] {
  const normalized = absolutePath.replaceAll('\\', '/');
  const variants = new Set<string>([
    absolutePath,
    normalized,
    absolutePath.toLowerCase(),
    normalized.toLowerCase(),
  ]);
  if (process.platform === 'win32') {
    variants.add(absolutePath.replaceAll('/', '\\'));
    variants.add(absolutePath.replaceAll('/', '\\').toLowerCase());
  }
  return Object.freeze([...variants]);
}

function publicOutputContainsAbsolutePath(
  serialized: string,
  absolutePath: string,
): boolean {
  return absolutePathVariants(absolutePath).some((variant) =>
    serialized.includes(variant),
  );
}

function evaluateCase(
  entry: RealRepoBenchmarkCatalogEntry,
  repoAbsolutePath: string,
  locateResult: Awaited<
    ReturnType<
      ReturnType<
        typeof createCanonicalLocateEngineHarnessV2
      >['service']['locate']
    >
  >,
  elapsedMs: number,
): RealRepoBenchmarkCaseResult {
  const failures: string[] = [];
  const expectations = entry.expectations;

  if (!locateResult.ok) {
    failures.push(
      `locate failed: ${locateResult.error.code} ${locateResult.error.message}`,
    );
    return Object.freeze({
      id: entry.id,
      ok: false,
      status: 'error',
      confirmedCount: 0,
      elapsedMs,
      failures: Object.freeze(failures),
    });
  }

  const confirmedCount = locateResult.evidence.confirmed.length;
  const status = locateResult.evidence.status;
  const locations = evidenceLocations(locateResult);
  const serialized = JSON.stringify(locateResult);

  if (confirmedCount < expectations.minConfirmed) {
    failures.push(
      `confirmed ${confirmedCount} < minConfirmed ${expectations.minConfirmed}`,
    );
  }
  if (elapsedMs > expectations.maxElapsedMs) {
    failures.push(
      `elapsed ${elapsedMs}ms > maxElapsedMs ${expectations.maxElapsedMs}`,
    );
  }
  if (expectations.mustIncludeFile !== undefined) {
    const hasFile = locations.some(
      (location) => location.file === expectations.mustIncludeFile,
    );
    if (!hasFile) {
      failures.push(`missing mustIncludeFile ${expectations.mustIncludeFile}`);
    }
  }
  if (expectations.mustIncludeSymbol !== undefined) {
    const hasSymbol = locations.some(
      (location) => location.symbol === expectations.mustIncludeSymbol,
    );
    if (!hasSymbol) {
      failures.push(
        `missing mustIncludeSymbol ${expectations.mustIncludeSymbol}`,
      );
    }
  }
  if (expectations.mustNotIncludeLiteral !== undefined) {
    if (serialized.includes(expectations.mustNotIncludeLiteral)) {
      failures.push(
        `public output leaked literal ${expectations.mustNotIncludeLiteral}`,
      );
    }
  }
  if (
    expectations.forbidPublicAbsolutePath &&
    publicOutputContainsAbsolutePath(serialized, repoAbsolutePath)
  ) {
    failures.push('public output contained absolute repository path');
  }

  return Object.freeze({
    id: entry.id,
    ok: failures.length === 0,
    status,
    confirmedCount,
    elapsedMs,
    failures: Object.freeze(failures),
  });
}

/**
 * Run all catalog entries against the canonical locate harness.
 */
export async function runRealRepoBenchmark(
  root: string = repositoryRoot,
): Promise<RealRepoBenchmarkSummary> {
  const catalog = loadCatalog(
    resolve(root, 'testkit/fixtures/benchmark-repos/catalog.json'),
  );
  const harness = createCanonicalLocateEngineHarnessV2(
    [new RipgrepBackend(new NodeSafeProcessRunner())],
    new NodeRepositoryReader(),
  );
  const results: RealRepoBenchmarkCaseResult[] = [];

  for (const entry of catalog.repos) {
    const repoPath = resolve(
      root,
      'testkit/fixtures/benchmark-repos',
      entry.path,
    );
    const request = LocateRequestSchema.parse({
      ...entry.request,
      repoPath,
    });
    const started = performance.now();
    const locateResult = await harness.service.locate(request, {
      signal: AbortSignal.timeout(request.limits?.timeoutMs ?? 30_000),
    });
    const elapsedMs = performance.now() - started;
    results.push(evaluateCase(entry, repoPath, locateResult, elapsedMs));
  }

  const failed = results.filter((result) => !result.ok).length;
  return Object.freeze({
    ok: failed === 0,
    catalogPath: resolve(root, 'testkit/fixtures/benchmark-repos/catalog.json'),
    repoCount: catalog.repos.length,
    passed: results.length - failed,
    failed,
    results: Object.freeze(results),
  });
}

async function main(): Promise<void> {
  const summary = await runRealRepoBenchmark();
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
