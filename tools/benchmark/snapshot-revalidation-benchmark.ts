import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import {
  fileIdentitiesEqualV2,
  identityFromStatV2,
  readVerifiedFileV2,
  verifiedFileSnapshotsEqualV2,
  type CanonicalFileKeyV2,
  type VerifiedFileSnapshotV2,
} from '../../src/repository/verified-file-snapshot-v2.js';
import { runFinalSnapshotCheckV2 } from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { buildPreRankingStablePoolsV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import {
  createSnapshotBenchmarkRevalidationPlanV2,
  type SnapshotBenchmarkPolicyV2,
  type SnapshotRevalidationPlanInputV2,
} from '../../src/evidence/request-snapshot/snapshot-revalidation-policy-v2.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(moduleDirectory, '..', '..');
const catalogPath = resolve(
  repositoryRoot,
  'testkit/fixtures/benchmark-repos/catalog.json',
);
const benchmarkRepositoryRoot = dirname(catalogPath);
const outputPathDefault = resolve(
  repositoryRoot,
  'test-artifacts/benchmark/snapshot-revalidation-candidate-v1.json',
);

const HEX64 = /^[0-9a-f]{64}$/u;

const LocalSnapshotRevalidationEnvironmentV1Schema = z
  .strictObject({
    runner: z.literal('local'),
    nodeMajor: z.number().int().positive(),
    platform: z.string().min(1),
    arch: z.string().min(1),
  })
  .readonly();

const AuthoritativeSnapshotRevalidationEnvironmentV1Schema = z
  .strictObject({
    runner: z.literal('ubuntu-24.04'),
    nodeMajor: z.literal(22),
    platform: z.literal('linux'),
    arch: z.literal('x64'),
  })
  .readonly();

const SnapshotRevalidationEnvironmentV1Schema = z.union([
  LocalSnapshotRevalidationEnvironmentV1Schema,
  AuthoritativeSnapshotRevalidationEnvironmentV1Schema,
]);

const PolicyRowMeasurementsV1 = {
  loadedCount: z.number().int().nonnegative(),
  retainedCount: z.number().int().nonnegative(),
  eligibleCount: z.number().int().nonnegative(),
  metadataChecks: z.number().int().nonnegative(),
  digestChecks: z.number().int().nonnegative(),
  digestBytes: z.number().int().nonnegative(),
  samplesMicroseconds: z.array(z.number().int().nonnegative()).length(5),
  p50Microseconds: z.number().int().nonnegative(),
  p95Microseconds: z.number().int().nonnegative(),
  eligibleDecisionSafe: z.boolean(),
} as const;

function snapshotRevalidationPolicyRowV1Schema(
  policy: SnapshotBenchmarkPolicyV2,
) {
  return z
    .strictObject({
      policy: z.literal(policy),
      ...PolicyRowMeasurementsV1,
    })
    .superRefine((row, context) => {
      if (
        row.retainedCount > row.loadedCount ||
        row.eligibleCount > row.loadedCount ||
        row.metadataChecks > row.loadedCount ||
        row.digestChecks > row.metadataChecks
      ) {
        context.addIssue({
          code: 'custom',
          message: 'snapshot revalidation counts are inconsistent',
        });
      }
      if (
        row.p50Microseconds !== nearestRankV2(row.samplesMicroseconds, 0.5) ||
        row.p95Microseconds !== nearestRankV2(row.samplesMicroseconds, 0.95)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'snapshot revalidation quantiles do not match samples',
        });
      }
    });
}

function snapshotRevalidationCorrectnessRowV1Schema(
  policy: SnapshotBenchmarkPolicyV2,
) {
  return z
    .strictObject({
      policy: z.literal(policy),
      retainedMutationDetected: z.boolean(),
      eligibleDecisionSafe: z.boolean(),
      abortPurged: z.boolean(),
      unreadablePurged: z.boolean(),
    })
    .readonly();
}

const AllLoadedPolicyRowV1Schema = snapshotRevalidationPolicyRowV1Schema(
  'all-loaded-baseline',
);
const RetainedDigestPolicyRowV1Schema =
  snapshotRevalidationPolicyRowV1Schema('retained-digest');
const ConditionalDigestPolicyRowV1Schema =
  snapshotRevalidationPolicyRowV1Schema('conditional-digest');
const SnapshotRevalidationPolicyRowsV1Schema = z
  .tuple([
    AllLoadedPolicyRowV1Schema,
    RetainedDigestPolicyRowV1Schema,
    ConditionalDigestPolicyRowV1Schema,
  ])
  .readonly();

const AllLoadedCorrectnessRowV1Schema =
  snapshotRevalidationCorrectnessRowV1Schema('all-loaded-baseline');
const RetainedDigestCorrectnessRowV1Schema =
  snapshotRevalidationCorrectnessRowV1Schema('retained-digest');
const ConditionalDigestCorrectnessRowV1Schema =
  snapshotRevalidationCorrectnessRowV1Schema('conditional-digest');
const SnapshotRevalidationCorrectnessRowsV1Schema = z
  .tuple([
    AllLoadedCorrectnessRowV1Schema,
    RetainedDigestCorrectnessRowV1Schema,
    ConditionalDigestCorrectnessRowV1Schema,
  ])
  .readonly();

export const SnapshotRevalidationBenchmarkV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    catalogSha256: z.string().regex(HEX64),
    environment: SnapshotRevalidationEnvironmentV1Schema,
    sampling: z
      .strictObject({
        warmupRuns: z.literal(1),
        measuredRuns: z.literal(5),
        quantile: z.literal('nearest-rank'),
      })
      .readonly(),
    policies: SnapshotRevalidationPolicyRowsV1Schema,
    correctness: SnapshotRevalidationCorrectnessRowsV1Schema,
    selected: z.null(),
  })
  .superRefine((report, context) => {
    const [baseline, retained, conditional] = report.policies;
    const [baselineCorrectness, retainedCorrectness, conditionalCorrectness] =
      report.correctness;
    for (const row of [retained, conditional]) {
      if (
        row.loadedCount !== baseline.loadedCount ||
        row.retainedCount !== baseline.retainedCount ||
        row.eligibleCount !== baseline.eligibleCount
      ) {
        context.addIssue({
          code: 'custom',
          path: ['policies'],
          message: 'snapshot revalidation policy inputs are inconsistent',
        });
      }
    }
    if (
      baseline.retainedCount > baseline.eligibleCount ||
      baseline.metadataChecks !== baseline.loadedCount ||
      baseline.digestChecks !== baseline.loadedCount ||
      retained.metadataChecks !== retained.retainedCount ||
      retained.digestChecks !== retained.retainedCount ||
      conditional.metadataChecks !== conditional.eligibleCount ||
      conditional.digestChecks !== conditional.eligibleCount ||
      retained.digestBytes > conditional.digestBytes ||
      conditional.digestBytes > baseline.digestBytes
    ) {
      context.addIssue({
        code: 'custom',
        path: ['policies'],
        message: 'snapshot revalidation policy measurements are inconsistent',
      });
    }
    if (
      baseline.eligibleDecisionSafe !== true ||
      retained.eligibleDecisionSafe !== false ||
      conditional.eligibleDecisionSafe !== true ||
      baselineCorrectness.eligibleDecisionSafe !== true ||
      retainedCorrectness.eligibleDecisionSafe !== false ||
      conditionalCorrectness.eligibleDecisionSafe !== true
    ) {
      context.addIssue({
        code: 'custom',
        path: ['correctness'],
        message: 'snapshot revalidation safety results are inconsistent',
      });
    }
    for (const row of report.correctness) {
      if (
        !row.retainedMutationDetected ||
        !row.abortPurged ||
        !row.unreadablePurged
      ) {
        context.addIssue({
          code: 'custom',
          path: ['correctness'],
          message: 'snapshot revalidation correctness floor failed',
        });
      }
    }
  })
  .readonly();

export type SnapshotRevalidationBenchmarkV1 = z.infer<
  typeof SnapshotRevalidationBenchmarkV1Schema
>;
export type SnapshotRevalidationCorrectnessRowV1 = z.infer<
  typeof SnapshotRevalidationCorrectnessRowsV1Schema
>[number];

interface LoadedBenchmarkFileV2 {
  readonly locator: string;
  readonly snapshot: VerifiedFileSnapshotV2;
}

const BENCHMARK_POLICIES: readonly SnapshotBenchmarkPolicyV2[] = Object.freeze([
  'all-loaded-baseline',
  'retained-digest',
  'conditional-digest',
]);

function sortedFixtureLocatorsV2(
  root: string,
  directory: string = root,
): readonly string[] {
  const locators: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
    (left, right) => left.name.localeCompare(right.name, 'en'),
  )) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      locators.push(...sortedFixtureLocatorsV2(root, absolute));
    } else if (entry.isFile() && absolute !== catalogPath) {
      locators.push(relative(root, absolute).split('\\').join('/'));
    }
  }
  return Object.freeze(locators);
}

function safeMaxFileBytesV2(size: bigint): number {
  if (size >= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.max(1, Number(size));
}

async function loadBenchmarkFilesV2(): Promise<
  readonly LoadedBenchmarkFileV2[]
> {
  const loaded: LoadedBenchmarkFileV2[] = [];
  for (const locator of sortedFixtureLocatorsV2(benchmarkRepositoryRoot)) {
    const verified = await readVerifiedFileV2({
      repositoryRoot: benchmarkRepositoryRoot,
      locator,
      maxFileBytes: Math.max(
        1,
        Number(
          (
            await stat(resolve(benchmarkRepositoryRoot, locator), {
              bigint: true,
            })
          ).size,
        ),
      ),
      signal: new AbortController().signal,
    });
    loaded.push(Object.freeze({ locator, snapshot: verified.snapshot }));
  }
  if (loaded.length < 3) {
    throw new Error(
      'snapshot revalidation benchmark requires at least 3 files',
    );
  }
  return Object.freeze(loaded);
}

function createBenchmarkPlanInputV2(
  loaded: readonly LoadedBenchmarkFileV2[],
): SnapshotRevalidationPlanInputV2 {
  const loadedCanonicalKeys = loaded.map(
    ({ snapshot }) => snapshot.canonicalFileKey,
  );
  const retainedEvidenceCanonicalKeys = loadedCanonicalKeys.filter(
    (_key, index) => index % 3 === 0,
  );
  const eligibleCanonicalKeys = loadedCanonicalKeys.filter(
    (_key, index) => index % 2 === 0 || index % 3 === 0,
  );
  return Object.freeze({
    loadedCanonicalKeys: Object.freeze(loadedCanonicalKeys),
    retainedEvidenceCanonicalKeys: Object.freeze(retainedEvidenceCanonicalKeys),
    eligibleCanonicalKeys: Object.freeze(eligibleCanonicalKeys),
    gitState: 'unknown' as const,
  });
}

async function executePlanV2(
  loadedByKey: ReadonlyMap<CanonicalFileKeyV2, LoadedBenchmarkFileV2>,
  plan: ReturnType<typeof createSnapshotBenchmarkRevalidationPlanV2>,
): Promise<void> {
  const digestKeys = new Set(plan.digestCanonicalKeys);
  for (const canonicalFileKey of plan.metadataCanonicalKeys) {
    const loaded = loadedByKey.get(canonicalFileKey);
    if (loaded === undefined) {
      throw new Error(
        `benchmark plan references unloaded key ${canonicalFileKey}`,
      );
    }
    if (digestKeys.has(canonicalFileKey)) {
      const reverified = await readVerifiedFileV2({
        repositoryRoot: benchmarkRepositoryRoot,
        locator: loaded.locator,
        maxFileBytes: safeMaxFileBytesV2(loaded.snapshot.identity.size),
        signal: new AbortController().signal,
      });
      if (!verifiedFileSnapshotsEqualV2(reverified.snapshot, loaded.snapshot)) {
        throw new Error(`benchmark fixture changed at ${canonicalFileKey}`);
      }
      continue;
    }

    const metadata = await stat(
      resolve(benchmarkRepositoryRoot, loaded.locator),
      {
        bigint: true,
      },
    );
    if (
      !metadata.isFile() ||
      !fileIdentitiesEqualV2(
        identityFromStatV2(metadata),
        loaded.snapshot.identity,
      )
    ) {
      throw new Error(
        `benchmark fixture metadata changed at ${canonicalFileKey}`,
      );
    }
  }
}

function nearestRankV2(samples: readonly number[], quantile: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.ceil(quantile * sorted.length) - 1;
  const value = sorted[Math.max(0, index)];
  if (value === undefined) {
    throw new Error('nearest-rank requires at least one sample');
  }
  return value;
}

async function measurePolicyV2(
  policy: SnapshotBenchmarkPolicyV2,
  loaded: readonly LoadedBenchmarkFileV2[],
  input: SnapshotRevalidationPlanInputV2,
  warmupRuns: 1,
  measuredRuns: 5,
): Promise<z.infer<typeof SnapshotRevalidationPolicyRowsV1Schema>[number]> {
  const plan = createSnapshotBenchmarkRevalidationPlanV2(policy, input);
  const loadedByKey = new Map(
    loaded.map((entry) => [entry.snapshot.canonicalFileKey, entry]),
  );
  for (let index = 0; index < warmupRuns; index += 1) {
    await executePlanV2(loadedByKey, plan);
  }

  const samplesMicroseconds: number[] = [];
  for (let index = 0; index < measuredRuns; index += 1) {
    const started = performance.now();
    await executePlanV2(loadedByKey, plan);
    samplesMicroseconds.push(
      Math.max(0, Math.round((performance.now() - started) * 1_000)),
    );
  }
  const digestBytes = plan.digestCanonicalKeys.reduce((total, key) => {
    const loadedFile = loadedByKey.get(key);
    if (loadedFile === undefined) {
      throw new Error(`digest plan references unloaded key ${key}`);
    }
    return total + Number(loadedFile.snapshot.identity.size);
  }, 0);

  return Object.freeze({
    policy,
    loadedCount: input.loadedCanonicalKeys.length,
    retainedCount: new Set(input.retainedEvidenceCanonicalKeys).size,
    eligibleCount: new Set(input.eligibleCanonicalKeys).size,
    metadataChecks: plan.metadataCanonicalKeys.length,
    digestChecks: plan.digestCanonicalKeys.length,
    digestBytes,
    samplesMicroseconds,
    p50Microseconds: nearestRankV2(samplesMicroseconds, 0.5),
    p95Microseconds: nearestRankV2(samplesMicroseconds, 0.95),
    eligibleDecisionSafe: plan.eligibleDecisionSafe,
  });
}

function syntheticSnapshotV2(
  canonicalFileKey: CanonicalFileKeyV2,
  contentSha256: string,
): VerifiedFileSnapshotV2 {
  return Object.freeze({
    locator: canonicalFileKey,
    canonicalFileKey,
    identity: Object.freeze({
      dev: 1n,
      ino: canonicalFileKey === 'retained.ts' ? 1n : 2n,
      size: 32n,
      mtimeNs: 10n,
      ctimeNs: 20n,
    }),
    contentSha256,
  });
}

function probePoolsV2(
  canonicalFileKey: CanonicalFileKeyV2,
  classificationDefined: boolean,
) {
  return buildPreRankingStablePoolsV2([
    Object.freeze({
      discoveryKey: `discovery:${canonicalFileKey}`,
      canonicalFileKey,
      safeKey: `safe:${canonicalFileKey}`,
      ...(classificationDefined
        ? {
            draft: Object.freeze({
              evidenceClass: 'candidate' as const,
              role: 'related' as const,
              location: Object.freeze({
                file: canonicalFileKey,
                lines: Object.freeze([1, 1] as [number, number]),
                excerpt: 'synthetic snapshot probe',
              }),
              provenance: Object.freeze({
                discoveredBy: Object.freeze(['filesystem' as const]),
                verifiedBy: 'filesystem' as const,
                operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
              }),
              reasonCodes: Object.freeze([
                'SAME_SCOPE_SIMILAR_IDENTIFIER' as const,
              ]),
              promotionRequirements: Object.freeze([
                'USER_SEMANTIC_CONFIRMATION' as const,
              ]),
            }),
          }
        : {}),
      rankingSignals: Object.freeze({
        kind: 'direct' as const,
        focusLines: Object.freeze([1, 1] as [number, number]),
        focusExcerpt: 'synthetic snapshot probe',
      }),
      classificationDefined,
    }),
  ]);
}

async function mutationDetectedV2(input: {
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly classificationDefined: boolean;
  readonly signal?: AbortSignal;
  readonly unreadable?: boolean;
}): Promise<boolean> {
  const original = syntheticSnapshotV2(input.canonicalFileKey, 'a'.repeat(64));
  const pools = probePoolsV2(
    input.canonicalFileKey,
    input.classificationDefined,
  );
  const result = await runFinalSnapshotCheckV2({
    repositoryRoot: '/synthetic',
    loadedFiles: Object.freeze([
      Object.freeze({
        canonicalFileKey: input.canonicalFileKey,
        snapshot: original,
        aliases: Object.freeze([input.canonicalFileKey]),
      }),
    ]),
    evidencePool: pools.evidence,
    eligiblePool: pools.eligible,
    gitState: 'unknown',
    signal: input.signal ?? new AbortController().signal,
    readVerifiedFile: async () => {
      if (input.unreadable === true) {
        throw new Error('synthetic unreadable file');
      }
      return Object.freeze({
        snapshot: syntheticSnapshotV2(input.canonicalFileKey, 'b'.repeat(64)),
        bytes: new Uint8Array(32),
      });
    },
  });
  return (
    result.changedCanonicalKeys.has(input.canonicalFileKey) &&
    result.retainedEvidence.length === 0 &&
    result.retainedEligible.length === 0
  );
}

export async function runSnapshotRevalidationCorrectnessProbesV2(): Promise<
  readonly SnapshotRevalidationCorrectnessRowV1[]
> {
  const retained = 'retained.ts' as CanonicalFileKeyV2;
  const eligible = 'eligible.ts' as CanonicalFileKeyV2;
  const planInput = Object.freeze({
    loadedCanonicalKeys: Object.freeze([retained, eligible]),
    retainedEvidenceCanonicalKeys: Object.freeze([retained]),
    eligibleCanonicalKeys: Object.freeze([retained, eligible]),
    gitState: 'unknown' as const,
  });
  const rows: SnapshotRevalidationCorrectnessRowV1[] = [];

  for (const policy of BENCHMARK_POLICIES) {
    const plan = createSnapshotBenchmarkRevalidationPlanV2(policy, planInput);
    const controller = new AbortController();
    controller.abort();
    const eligiblePlanned = plan.digestCanonicalKeys.includes(eligible);
    rows.push(
      Object.freeze({
        policy,
        retainedMutationDetected:
          plan.digestCanonicalKeys.includes(retained) &&
          (await mutationDetectedV2({
            canonicalFileKey: retained,
            classificationDefined: true,
          })),
        eligibleDecisionSafe:
          eligiblePlanned &&
          (await mutationDetectedV2({
            canonicalFileKey: eligible,
            classificationDefined: false,
          })),
        abortPurged: await mutationDetectedV2({
          canonicalFileKey: retained,
          classificationDefined: true,
          signal: controller.signal,
        }),
        unreadablePurged: await mutationDetectedV2({
          canonicalFileKey: retained,
          classificationDefined: true,
          unreadable: true,
        }),
      }),
    );
  }
  return Object.freeze(rows);
}

function nodeMajorV2(): number {
  const major = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);
  if (!Number.isSafeInteger(major) || major < 1) {
    throw new Error('unable to determine Node major');
  }
  return major;
}

export function isUbuntu2404OsReleaseV2(release: string): boolean {
  return (
    /^ID="?ubuntu"?$/mu.test(release) &&
    /^VERSION_ID="?24\.04"?$/mu.test(release)
  );
}

function assertAuthoritativeEnvironmentV2(): void {
  if (
    process.platform !== 'linux' ||
    process.arch !== 'x64' ||
    nodeMajorV2() !== 22
  ) {
    throw new Error(
      'authoritative snapshot benchmark requires ubuntu-24.04, Node 22, linux x64',
    );
  }
  const release = readFileSync('/etc/os-release', 'utf8');
  if (!isUbuntu2404OsReleaseV2(release)) {
    throw new Error(
      'authoritative snapshot benchmark requires ubuntu-24.04, Node 22, linux x64',
    );
  }
}

export async function runSnapshotRevalidationBenchmarkV2(input: {
  readonly mode: 'local' | 'authoritative-ci';
  readonly warmupRuns: 1;
  readonly measuredRuns: 5;
  readonly outputPath: string;
}): Promise<SnapshotRevalidationBenchmarkV1> {
  if (input.warmupRuns !== 1 || input.measuredRuns !== 5) {
    throw new Error(
      'snapshot benchmark sampling must be exactly 1 warmup and 5 measured',
    );
  }
  if (input.mode === 'authoritative-ci') {
    assertAuthoritativeEnvironmentV2();
  }

  const loaded = await loadBenchmarkFilesV2();
  const planInput = createBenchmarkPlanInputV2(loaded);
  const policies = [];
  for (const policy of BENCHMARK_POLICIES) {
    policies.push(
      await measurePolicyV2(
        policy,
        loaded,
        planInput,
        input.warmupRuns,
        input.measuredRuns,
      ),
    );
  }
  const report = SnapshotRevalidationBenchmarkV1Schema.parse({
    schemaVersion: 1,
    catalogSha256: createHash('sha256')
      .update(readFileSync(catalogPath))
      .digest('hex'),
    environment: {
      runner: input.mode === 'authoritative-ci' ? 'ubuntu-24.04' : 'local',
      nodeMajor: nodeMajorV2(),
      platform: process.platform,
      arch: process.arch,
    },
    sampling: {
      warmupRuns: input.warmupRuns,
      measuredRuns: input.measuredRuns,
      quantile: 'nearest-rank',
    },
    policies,
    correctness: await runSnapshotRevalidationCorrectnessProbesV2(),
    selected: null,
  });
  mkdirSync(dirname(input.outputPath), { recursive: true });
  writeFileSync(
    input.outputPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  return report;
}

function parseCliV2(argv: readonly string[]): {
  readonly mode: 'local' | 'authoritative-ci';
  readonly outputPath: string;
} {
  let mode: 'local' | 'authoritative-ci' = 'local';
  let outputPath = outputPathDefault;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--mode') {
      const value = argv[++index];
      if (value !== 'local' && value !== 'authoritative-ci') {
        throw new Error('--mode must be local or authoritative-ci');
      }
      mode = value;
      continue;
    }
    if (flag === '--output') {
      const value = argv[++index];
      if (value === undefined || value.length === 0) {
        throw new Error('--output requires a path');
      }
      outputPath = resolve(value);
      continue;
    }
    throw new Error(`unknown snapshot benchmark argument ${String(flag)}`);
  }
  return Object.freeze({ mode, outputPath });
}

async function main(): Promise<void> {
  const args = parseCliV2(process.argv.slice(2));
  const report = await runSnapshotRevalidationBenchmarkV2({
    mode: args.mode,
    warmupRuns: 1,
    measuredRuns: 5,
    outputPath: args.outputPath,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(entryPath)
) {
  await main();
}
