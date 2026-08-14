import type { LocateResultV2 } from '../../src/contracts/v2/locate-result-v2.js';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { cpus, arch, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { z } from 'zod';
import { parse } from 'yaml';

import {
  LimitReasonCodeSchema,
  LocateRequestSchema,
  LocateStatusSchema,
  type RepositoryEvidenceService,
} from '../../src/contracts/index.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import { createStableGoldenProjection } from '../contracts/golden-projection.js';

const GeneratorConfigSchema = z
  .strictObject({
    seed: z.int().nonnegative(),
    sourceFiles: z.literal(1000),
    modules: z.literal(50),
    directMappings: z.literal(10),
    namedDecoys: z.literal(200),
    fileSizeDistribution: z.strictObject({
      small: z.literal(500),
      medium: z.literal(350),
      large: z.literal(150),
    }),
  })
  .readonly();

export const LargeSyntheticManifestSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0'),
    id: z.literal('large-synthetic-repository-v1'),
    generator: GeneratorConfigSchema,
    request: LocateRequestSchema,
    expected: z
      .strictObject({
        status: LocateStatusSchema,
        confirmedCount: z.int().nonnegative(),
        candidateCount: z.int().nonnegative(),
        limitsReached: z.array(LimitReasonCodeSchema).readonly(),
      })
      .readonly(),
    warmupRuns: z.literal(1),
    measuredRuns: z.literal(5),
  })
  .readonly();
export type LargeSyntheticManifest = z.infer<
  typeof LargeSyntheticManifestSchema
>;

const PerformanceRunSchema = z
  .strictObject({
    index: z.int().positive(),
    elapsedMs: z.number().nonnegative(),
    peakRssBytes: z.int().positive(),
    projectionHash: z.string().regex(/^[a-f0-9]{64}$/u),
    status: LocateStatusSchema,
    confirmedCount: z.int().nonnegative(),
    candidateCount: z.int().nonnegative(),
    limitsReached: z.array(LimitReasonCodeSchema).readonly(),
  })
  .readonly();

export const SyntheticPerformanceReportSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0'),
    caseId: z.literal('large-synthetic-repository-v1'),
    generator: GeneratorConfigSchema,
    generatorConfigHash: z.string().regex(/^[a-f0-9]{64}$/u),
    corpusHash: z.string().regex(/^[a-f0-9]{64}$/u),
    gitCommit: z.string().min(7),
    environment: z
      .strictObject({
        node: z.string().min(1),
        platform: z.string().min(1),
        release: z.string().min(1),
        arch: z.string().min(1),
        cpu: z.string().min(1),
        dependencies: z.record(z.string(), z.string()),
      })
      .readonly(),
    warmupRuns: z.literal(1),
    measuredRuns: z.literal(5),
    runs: z.array(PerformanceRunSchema).length(5).readonly(),
    summary: z
      .strictObject({
        medianElapsedMs: z.number().nonnegative(),
        p95ElapsedMs: z.number().nonnegative(),
        peakRssBytes: z.int().positive(),
      })
      .readonly(),
    correctness: z
      .strictObject({
        stableProjectionHash: z.string().regex(/^[a-f0-9]{64}$/u),
        status: LocateStatusSchema,
        confirmedCount: z.int().nonnegative(),
        candidateCount: z.int().nonnegative(),
        limitsReached: z.array(LimitReasonCodeSchema).readonly(),
      })
      .readonly(),
    cleanup: z
      .strictObject({
        attempted: z.literal(true),
        succeeded: z.boolean(),
        fixtureRemoved: z.boolean(),
      })
      .readonly(),
    trend: z
      .strictObject({
        baselineAvailable: z.boolean(),
        timingIsBlocking: z.literal(false),
        medianDeltaPercent: z.number().nullable(),
        p95DeltaPercent: z.number().nullable(),
        peakRssDeltaPercent: z.number().nullable(),
      })
      .readonly(),
  })
  .readonly();
export type SyntheticPerformanceReport = z.infer<
  typeof SyntheticPerformanceReportSchema
>;

function hashJson(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value), 'utf8')
    .digest('hex');
}

function paddingFor(index: number, seed: number): string {
  const lineCount = index < 500 ? 2 : index < 850 ? 20 : 80;
  return Array.from(
    { length: lineCount },
    (_, line) =>
      `export const filler_${seed}_${index}_${line} = ${seed + index + line};`,
  ).join('\n');
}

function moduleName(index: number, manifest: LargeSyntheticManifest): string {
  if (index < manifest.generator.directMappings) {
    return 'module-000';
  }
  if (
    index <
    manifest.generator.directMappings + manifest.generator.namedDecoys
  ) {
    return `module-${String(
      1 + ((index - manifest.generator.directMappings) % 10),
    ).padStart(3, '0')}`;
  }
  return `module-${String(index % manifest.generator.modules).padStart(3, '0')}`;
}

function fileName(index: number, manifest: LargeSyntheticManifest): string {
  if (index < manifest.generator.directMappings) {
    return `${String(index).padStart(4, '0')}-mapping.ts`;
  }
  if (
    index <
    manifest.generator.directMappings + manifest.generator.namedDecoys
  ) {
    return `1000-decoy-${String(
      index - manifest.generator.directMappings,
    ).padStart(4, '0')}.ts`;
  }
  return `2000-file-${String(index).padStart(4, '0')}.ts`;
}

function sourceFor(index: number, manifest: LargeSyntheticManifest): string {
  const padding = paddingFor(index, manifest.generator.seed);
  if (index < manifest.generator.directMappings) {
    return `export const syntheticTarget = row.synthetic_source;\n${padding}\n`;
  }
  if (
    index <
    manifest.generator.directMappings + manifest.generator.namedDecoys
  ) {
    const suffix = String(index - manifest.generator.directMappings).padStart(
      3,
      '0',
    );
    return `export const namedDecoy${suffix} = "syntheticTarget and row.synthetic_source";\n${padding}\n`;
  }
  return `${padding}\n`;
}

export interface GeneratedSyntheticRepository {
  readonly root: string;
  readonly corpusHash: string;
  readonly sourceFileCount: number;
}

export function generateLargeSyntheticRepository(
  root: string,
  manifest: LargeSyntheticManifest,
): GeneratedSyntheticRepository {
  const corpusHasher = createHash('sha256');
  for (let index = 0; index < manifest.generator.sourceFiles; index += 1) {
    const relativePath = `${moduleName(index, manifest)}/${fileName(index, manifest)}`;
    const source = sourceFor(index, manifest);
    const path = resolve(root, relativePath);
    mkdirSync(resolve(path, '..'), { recursive: true });
    writeFileSync(path, source, 'utf8');
    corpusHasher.update(relativePath.replaceAll('\\', '/'), 'utf8');
    corpusHasher.update('\0', 'utf8');
    corpusHasher.update(source, 'utf8');
    corpusHasher.update('\0', 'utf8');
  }
  const moduleDirectories = readdirSync(root, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory(),
  );
  const generatedFiles = moduleDirectories.flatMap((entry) =>
    readdirSync(resolve(root, entry.name)),
  );
  const mappingCount = generatedFiles.filter((name) =>
    name.endsWith('-mapping.ts'),
  ).length;
  const decoyCount = generatedFiles.filter((name) =>
    name.includes('-decoy-'),
  ).length;
  if (
    moduleDirectories.length !== manifest.generator.modules ||
    generatedFiles.length !== manifest.generator.sourceFiles ||
    mappingCount !== manifest.generator.directMappings ||
    decoyCount !== manifest.generator.namedDecoys
  ) {
    throw new Error(
      'Synthetic generator output does not match its fixed config.',
    );
  }
  return {
    root,
    corpusHash: corpusHasher.digest('hex'),
    sourceFileCount: manifest.generator.sourceFiles,
  };
}

export function loadLargeSyntheticManifest(
  repositoryRoot: string,
): LargeSyntheticManifest {
  const input: unknown = parse(
    readFileSync(
      resolve(
        repositoryRoot,
        'testkit',
        'manifests',
        'performance',
        'large-synthetic-repository-v1.yaml',
      ),
      'utf8',
    ),
  );
  return LargeSyntheticManifestSchema.parse(input);
}

interface MeasuredObservation {
  readonly result: Extract<LocateResultV2, { readonly ok: true }>;
  readonly elapsedMs: number;
  readonly peakRssBytes: number;
  readonly projectionHash: string;
}

async function measureLocate(
  service: RepositoryEvidenceService,
  request: z.infer<typeof LocateRequestSchema>,
): Promise<MeasuredObservation> {
  let peakRssBytes = process.memoryUsage().rss;
  const sampler = setInterval(() => {
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  }, 5);
  const startedAt = performance.now();
  try {
    const result = await service.locate(request, {
      signal: new AbortController().signal,
    });
    const elapsedMs = performance.now() - startedAt;
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
    if (!result.ok) {
      throw new Error(
        `Synthetic repository locate failed: ${result.error.code}.`,
      );
    }
    return {
      result: result,
      elapsedMs,
      peakRssBytes,
      projectionHash: hashJson(createStableGoldenProjection(result)),
    };
  } finally {
    clearInterval(sampler);
  }
}

function percentile(values: readonly number[], ratio: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(ordered.length * ratio) - 1);
  const value = ordered[index];
  if (value === undefined) {
    throw new Error('Cannot calculate percentile for an empty sample.');
  }
  return value;
}

function deltaPercent(current: number, baseline: number): number {
  return baseline === 0 ? 0 : ((current - baseline) / baseline) * 100;
}

function packageDependencies(
  repositoryRoot: string,
): Readonly<Record<string, string>> {
  const input: unknown = JSON.parse(
    readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
  );
  return z
    .object({
      dependencies: z.record(z.string(), z.string()),
      devDependencies: z.record(z.string(), z.string()),
    })
    .transform(({ dependencies, devDependencies }) => ({
      ...dependencies,
      ...devDependencies,
    }))
    .parse(input);
}

export async function runLargeSyntheticPerformance(
  repositoryRoot: string,
  fixtureRoot: string,
): Promise<SyntheticPerformanceReport> {
  const manifest = loadLargeSyntheticManifest(repositoryRoot);
  let report: SyntheticPerformanceReport | undefined;
  let failure: { readonly error: unknown } | undefined;
  try {
    const generated = generateLargeSyntheticRepository(fixtureRoot, manifest);
    const request = LocateRequestSchema.parse({
      ...manifest.request,
      repoPath: generated.root,
    });
    const service = createCanonicalLocateEngineHarnessV2(
      [new RipgrepBackend(new NodeSafeProcessRunner())],
      new NodeRepositoryReader(),
    ).service;
    await measureLocate(service, request);

    const observations: MeasuredObservation[] = [];
    for (let index = 0; index < manifest.measuredRuns; index += 1) {
      observations.push(await measureLocate(service, request));
    }

    const projectionHashes = new Set(
      observations.map((observation) => observation.projectionHash),
    );
    if (projectionHashes.size !== 1) {
      throw new Error(
        'Synthetic repository stable projection changed between runs.',
      );
    }
    const first = observations[0];
    if (first === undefined) {
      throw new Error(
        'Synthetic repository produced no measured observations.',
      );
    }
    const correctness = {
      stableProjectionHash: first.projectionHash,
      status: first.result.evidence.status,
      confirmedCount: first.result.evidence.confirmed.length,
      candidateCount: first.result.evidence.candidates.length,
      limitsReached: first.result.evidence.coverage.limitsReached,
    } as const;
    if (
      correctness.status !== manifest.expected.status ||
      correctness.confirmedCount !== manifest.expected.confirmedCount ||
      correctness.candidateCount !== manifest.expected.candidateCount ||
      JSON.stringify(correctness.limitsReached) !==
        JSON.stringify(manifest.expected.limitsReached)
    ) {
      throw new Error(
        `Synthetic correctness differs: ${JSON.stringify(correctness)}.`,
      );
    }

    const elapsedSamples = observations.map(
      (observation) => observation.elapsedMs,
    );
    const rssSamples = observations.map(
      (observation) => observation.peakRssBytes,
    );
    const summary = {
      medianElapsedMs: percentile(elapsedSamples, 0.5),
      p95ElapsedMs: percentile(elapsedSamples, 0.95),
      peakRssBytes: Math.max(...rssSamples),
    } as const;
    const baselinePath = resolve(
      repositoryRoot,
      'testkit',
      'baselines',
      'performance',
      'large-synthetic-repository-v1.json',
    );
    const baseline = existsSync(baselinePath)
      ? SyntheticPerformanceReportSchema.parse(
          JSON.parse(readFileSync(baselinePath, 'utf8')) as unknown,
        )
      : undefined;
    const generatorConfigHash = hashJson(manifest.generator);
    if (
      baseline !== undefined &&
      (baseline.generatorConfigHash !== generatorConfigHash ||
        baseline.corpusHash !== generated.corpusHash ||
        baseline.correctness.stableProjectionHash !==
          correctness.stableProjectionHash)
    ) {
      throw new Error(
        'Synthetic correctness/config differs from committed baseline.',
      );
    }

    report = SyntheticPerformanceReportSchema.parse({
      schemaVersion: '1.0',
      caseId: manifest.id,
      generator: manifest.generator,
      generatorConfigHash,
      corpusHash: generated.corpusHash,
      gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repositoryRoot,
        encoding: 'utf8',
      }).trim(),
      environment: {
        node: process.version,
        platform: platform(),
        release: release(),
        arch: arch(),
        cpu: cpus()[0]?.model ?? 'unknown-cpu',
        dependencies: packageDependencies(repositoryRoot),
      },
      warmupRuns: manifest.warmupRuns,
      measuredRuns: manifest.measuredRuns,
      runs: observations.map((observation, index) => ({
        index: index + 1,
        elapsedMs: observation.elapsedMs,
        peakRssBytes: observation.peakRssBytes,
        projectionHash: observation.projectionHash,
        status: observation.result.evidence.status,
        confirmedCount: observation.result.evidence.confirmed.length,
        candidateCount: observation.result.evidence.candidates.length,
        limitsReached: observation.result.evidence.coverage.limitsReached,
      })),
      summary,
      correctness,
      cleanup: {
        attempted: true,
        succeeded: true,
        fixtureRemoved: true,
      },
      trend: {
        baselineAvailable: baseline !== undefined,
        timingIsBlocking: false,
        medianDeltaPercent:
          baseline === undefined
            ? null
            : deltaPercent(
                summary.medianElapsedMs,
                baseline.summary.medianElapsedMs,
              ),
        p95DeltaPercent:
          baseline === undefined
            ? null
            : deltaPercent(summary.p95ElapsedMs, baseline.summary.p95ElapsedMs),
        peakRssDeltaPercent:
          baseline === undefined
            ? null
            : deltaPercent(summary.peakRssBytes, baseline.summary.peakRssBytes),
      },
    });
  } catch (error: unknown) {
    failure = { error };
  }
  rmSync(fixtureRoot, { recursive: true, force: true });
  if (existsSync(fixtureRoot)) {
    throw new Error('Synthetic repository fixture cleanup failed.');
  }
  if (failure !== undefined) {
    throw failure.error;
  }
  if (report === undefined) {
    throw new Error('Synthetic repository report was not produced.');
  }
  return report;
}

export function writeSyntheticPerformanceReport(
  repositoryRoot: string,
  report: SyntheticPerformanceReport,
): string {
  const outputDirectory = resolve(
    repositoryRoot,
    'test-artifacts',
    'performance',
  );
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = resolve(
    outputDirectory,
    'large-synthetic-repository-v1.json',
  );
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}
