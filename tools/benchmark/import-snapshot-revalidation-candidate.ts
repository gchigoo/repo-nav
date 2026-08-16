import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, type PathLike } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { format as formatWithPrettier } from 'prettier';
import { z } from 'zod';

import type {
  SnapshotBenchmarkPolicyV2,
  SnapshotRevalidationPolicyV2,
} from '../../src/evidence/request-snapshot/snapshot-revalidation-policy-v2.js';
import {
  SnapshotRevalidationBenchmarkV1Schema,
  type SnapshotRevalidationBenchmarkV1,
} from './snapshot-revalidation-benchmark.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRootDefault = resolve(moduleDirectory, '..', '..');
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/u;
const MINIMUM_P95_IMPROVEMENT_BASIS_POINTS = 1_500;
const EXPECTED_REPOSITORY = 'gchigoo/repo-nav';
const EXPECTED_WORKFLOW = 'package-release-ci';
const EXPECTED_WORKFLOW_PATH = '.github/workflows/package-release-ci.yml';
const EXPECTED_JOB = 'snapshot-revalidation-benchmark';
const EXPECTED_ARTIFACT = 'snapshot-revalidation-candidate-v1';
const CATALOG_RELATIVE_PATH = 'testkit/fixtures/benchmark-repos/catalog.json';

const GitHubRunV1Schema = z
  .object({
    id: z.number().int().positive(),
    name: z.literal(EXPECTED_WORKFLOW),
    head_branch: z.literal('main'),
    head_sha: z.string().regex(HEX40),
    path: z.literal(EXPECTED_WORKFLOW_PATH),
    event: z.literal('push'),
    status: z.literal('completed'),
    conclusion: z.literal('success'),
    run_attempt: z.number().int().positive(),
    repository: z
      .object({
        full_name: z.literal(EXPECTED_REPOSITORY),
      })
      .passthrough(),
  })
  .passthrough()
  .readonly();

const GitHubArtifactV1Schema = z
  .object({
    id: z.number().int().positive(),
    name: z.literal(EXPECTED_ARTIFACT),
    expired: z.literal(false),
    digest: z.string().regex(SHA256_DIGEST),
    created_at: z.string().min(1),
    expires_at: z.string().min(1),
    workflow_run: z
      .object({
        id: z.number().int().positive(),
        head_branch: z.literal('main'),
        head_sha: z.string().regex(HEX40),
      })
      .passthrough(),
  })
  .passthrough()
  .readonly();

const SnapshotRevalidationProvenanceV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    repository: z.literal(EXPECTED_REPOSITORY),
    workflow: z.literal(EXPECTED_WORKFLOW),
    job: z.literal(EXPECTED_JOB),
    artifactName: z.literal(EXPECTED_ARTIFACT),
    headSha: z.string().regex(HEX40),
    runId: z.number().int().positive(),
    runAttempt: z.number().int().positive(),
    catalogSha256: z.string().regex(HEX64),
    reportSha256: z.string().regex(HEX64),
  })
  .readonly();

const SnapshotRevalidationSelectionSourceV1Schema = z
  .strictObject({
    repository: z.literal(EXPECTED_REPOSITORY),
    workflow: z.literal(EXPECTED_WORKFLOW),
    workflowPath: z.literal(EXPECTED_WORKFLOW_PATH),
    job: z.literal(EXPECTED_JOB),
    headSha: z.string().regex(HEX40),
    runId: z.number().int().positive(),
    runAttempt: z.number().int().positive(),
    artifactName: z.literal(EXPECTED_ARTIFACT),
    artifactId: z.number().int().positive(),
    artifactDigest: z.string().regex(SHA256_DIGEST),
    artifactCreatedAt: z.string().min(1),
    artifactExpiresAt: z.string().min(1),
    catalogSha256: z.string().regex(HEX64),
    reportSha256: z.string().regex(HEX64),
  })
  .readonly();

const SnapshotRevalidationSelectionDecisionV1Schema = z
  .strictObject({
    minimumP95ImprovementBasisPoints: z.literal(
      MINIMUM_P95_IMPROVEMENT_BASIS_POINTS,
    ),
    tieBreakPolicy: z.literal('conditional-digest'),
    correctnessSafePolicies: z
      .array(
        z.enum([
          'all-loaded-baseline',
          'retained-digest',
          'conditional-digest',
        ]),
      )
      .readonly(),
    baselineP95Microseconds: z.number().int().nonnegative(),
    selectedP95Microseconds: z.number().int().nonnegative(),
    selectedImprovementBasisPoints: z.number().int().nonnegative(),
  })
  .readonly();

export const SnapshotRevalidationSelectionBaselineV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    source: SnapshotRevalidationSelectionSourceV1Schema,
    report: SnapshotRevalidationBenchmarkV1Schema,
    selected: z.enum([
      'all-loaded-baseline',
      'retained-digest',
      'conditional-digest',
    ]),
    decision: SnapshotRevalidationSelectionDecisionV1Schema,
  })
  .superRefine((baseline, context) => {
    if (
      baseline.report.catalogSha256 !== baseline.source.catalogSha256 ||
      baseline.report.selected !== null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'selection baseline report binding is inconsistent',
      });
    }
    const selectedRow = baseline.report.policies.find(
      ({ policy }) => policy === baseline.selected,
    );
    const baselineRow = baseline.report.policies[0];
    if (
      selectedRow === undefined ||
      baseline.decision.baselineP95Microseconds !==
        baselineRow.p95Microseconds ||
      baseline.decision.selectedP95Microseconds !==
        selectedRow.p95Microseconds ||
      baseline.decision.selectedImprovementBasisPoints !==
        improvementBasisPointsV2(
          baselineRow.p95Microseconds,
          selectedRow.p95Microseconds,
        )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'selection baseline decision metrics are inconsistent',
      });
    }
  })
  .readonly();

export type SnapshotRevalidationSelectionBaselineV1 = z.infer<
  typeof SnapshotRevalidationSelectionBaselineV1Schema
>;

type ParsedRunV1 = z.infer<typeof GitHubRunV1Schema>;
type ParsedArtifactV1 = z.infer<typeof GitHubArtifactV1Schema>;
type ParsedProvenanceV1 = z.infer<
  typeof SnapshotRevalidationProvenanceV1Schema
>;

export interface SnapshotRevalidationImportInputV1 {
  readonly repositoryRoot: string;
  readonly run: unknown;
  readonly artifact: unknown;
  readonly reportBytes: Uint8Array;
  readonly provenance: unknown;
}

export interface SnapshotRevalidationRenderedArtifactsV1 {
  readonly baselineJson: string;
  readonly selectedPolicySource: string;
  readonly evidenceMarkdown: string;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJson(path: PathLike): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function runGit(repositoryRoot: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', repositoryRoot, ...args], {
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed`);
  }
  return result.stdout;
}

function assertSourceRevisionV1(
  repositoryRoot: string,
  headSha: string,
  catalogSha256: string,
): void {
  const ancestor = spawnSync(
    'git',
    ['-C', repositoryRoot, 'merge-base', '--is-ancestor', headSha, 'HEAD'],
    { encoding: 'utf8', shell: false },
  );
  if (ancestor.status !== 0) {
    throw new Error('authoritative benchmark head must be an ancestor of HEAD');
  }
  const sourceCatalog = runGit(repositoryRoot, [
    'show',
    `${headSha}:${CATALOG_RELATIVE_PATH}`,
  ]);
  if (sha256(Buffer.from(sourceCatalog, 'utf8')) !== catalogSha256) {
    throw new Error('source revision benchmark catalog digest mismatch');
  }
  const currentCatalog = readFileSync(
    resolve(repositoryRoot, CATALOG_RELATIVE_PATH),
  );
  if (sha256(currentCatalog) !== catalogSha256) {
    throw new Error('current benchmark catalog digest mismatch');
  }
}

function assertBindingsV1(input: {
  readonly run: ParsedRunV1;
  readonly artifact: ParsedArtifactV1;
  readonly provenance: ParsedProvenanceV1;
  readonly report: SnapshotRevalidationBenchmarkV1;
  readonly reportSha256: string;
}): void {
  const { run, artifact, provenance, report, reportSha256 } = input;
  if (
    artifact.workflow_run.id !== run.id ||
    artifact.workflow_run.head_sha !== run.head_sha ||
    provenance.runId !== run.id ||
    provenance.runAttempt !== run.run_attempt ||
    provenance.headSha !== run.head_sha ||
    provenance.artifactName !== artifact.name ||
    provenance.catalogSha256 !== report.catalogSha256 ||
    provenance.reportSha256 !== reportSha256
  ) {
    throw new Error('snapshot revalidation evidence binding mismatch');
  }
}

function correctnessSafePoliciesV1(
  report: SnapshotRevalidationBenchmarkV1,
): readonly SnapshotBenchmarkPolicyV2[] {
  const correctnessByPolicy = new Map(
    report.correctness.map((row) => [row.policy, row]),
  );
  return Object.freeze(
    report.policies
      .filter((row) => {
        const correctness = correctnessByPolicy.get(row.policy);
        return (
          row.eligibleDecisionSafe &&
          correctness?.eligibleDecisionSafe === true &&
          correctness.retainedMutationDetected &&
          correctness.abortPurged &&
          correctness.unreadablePurged
        );
      })
      .map(({ policy }) => policy),
  );
}

function improvementBasisPointsV2(
  baselineP95Microseconds: number,
  candidateP95Microseconds: number,
): number {
  if (baselineP95Microseconds === 0) {
    return candidateP95Microseconds === 0 ? 0 : 0;
  }
  return Math.max(
    0,
    Math.floor(
      ((baselineP95Microseconds - candidateP95Microseconds) * 10_000) /
        baselineP95Microseconds,
    ),
  );
}

export function selectSnapshotRevalidationPolicyV1(
  report: SnapshotRevalidationBenchmarkV1,
): {
  readonly selected: SnapshotBenchmarkPolicyV2;
  readonly correctnessSafePolicies: readonly SnapshotBenchmarkPolicyV2[];
  readonly improvementBasisPoints: number;
} {
  const parsed = SnapshotRevalidationBenchmarkV1Schema.parse(report);
  const baseline = parsed.policies[0];
  const correctnessSafePolicies = correctnessSafePoliciesV1(parsed);
  const safe = new Set(correctnessSafePolicies);
  const optimized = parsed.policies
    .filter(
      (row) =>
        row.policy !== 'all-loaded-baseline' &&
        safe.has(row.policy) &&
        row.p95Microseconds * 10_000 <=
          baseline.p95Microseconds *
            (10_000 - MINIMUM_P95_IMPROVEMENT_BASIS_POINTS),
    )
    .sort((left, right) => {
      const latency = left.p95Microseconds - right.p95Microseconds;
      if (latency !== 0) {
        return latency;
      }
      return left.policy === 'conditional-digest' ? -1 : 1;
    });
  const selected = optimized[0]?.policy ?? 'all-loaded-baseline';
  const selectedRow = parsed.policies.find(({ policy }) => policy === selected);
  if (selectedRow === undefined) {
    throw new Error('selected snapshot policy row is missing');
  }
  return Object.freeze({
    selected,
    correctnessSafePolicies,
    improvementBasisPoints: improvementBasisPointsV2(
      baseline.p95Microseconds,
      selectedRow.p95Microseconds,
    ),
  });
}

export function importSnapshotRevalidationCandidateV1(
  input: SnapshotRevalidationImportInputV1,
): SnapshotRevalidationSelectionBaselineV1 {
  const run = GitHubRunV1Schema.parse(input.run);
  const artifact = GitHubArtifactV1Schema.parse(input.artifact);
  const provenance = SnapshotRevalidationProvenanceV1Schema.parse(
    input.provenance,
  );
  const report = SnapshotRevalidationBenchmarkV1Schema.parse(
    JSON.parse(Buffer.from(input.reportBytes).toString('utf8')),
  );
  const reportSha256 = sha256(input.reportBytes);
  assertBindingsV1({ run, artifact, provenance, report, reportSha256 });
  assertSourceRevisionV1(
    input.repositoryRoot,
    run.head_sha,
    report.catalogSha256,
  );
  const selection = selectSnapshotRevalidationPolicyV1(report);
  const selectedRow = report.policies.find(
    ({ policy }) => policy === selection.selected,
  );
  if (selectedRow === undefined) {
    throw new Error('selected snapshot policy row is missing');
  }
  return SnapshotRevalidationSelectionBaselineV1Schema.parse({
    schemaVersion: 1,
    source: {
      repository: EXPECTED_REPOSITORY,
      workflow: EXPECTED_WORKFLOW,
      workflowPath: EXPECTED_WORKFLOW_PATH,
      job: EXPECTED_JOB,
      headSha: run.head_sha,
      runId: run.id,
      runAttempt: run.run_attempt,
      artifactName: artifact.name,
      artifactId: artifact.id,
      artifactDigest: artifact.digest,
      artifactCreatedAt: artifact.created_at,
      artifactExpiresAt: artifact.expires_at,
      catalogSha256: report.catalogSha256,
      reportSha256,
    },
    report,
    selected: selection.selected,
    decision: {
      minimumP95ImprovementBasisPoints: MINIMUM_P95_IMPROVEMENT_BASIS_POINTS,
      tieBreakPolicy: 'conditional-digest',
      correctnessSafePolicies: selection.correctnessSafePolicies,
      baselineP95Microseconds: report.policies[0].p95Microseconds,
      selectedP95Microseconds: selectedRow.p95Microseconds,
      selectedImprovementBasisPoints: selection.improvementBasisPoints,
    },
  });
}

function requireProductionPolicyV1(
  selected: SnapshotBenchmarkPolicyV2,
): SnapshotRevalidationPolicyV2 {
  if (selected === 'all-loaded-baseline') {
    throw new Error(
      'authoritative evidence did not select an optimized production policy',
    );
  }
  return selected;
}

export async function renderSnapshotRevalidationSelectionArtifactsV1(
  input: SnapshotRevalidationSelectionBaselineV1,
): Promise<SnapshotRevalidationRenderedArtifactsV1> {
  const baseline = SnapshotRevalidationSelectionBaselineV1Schema.parse(input);
  const selected = requireProductionPolicyV1(baseline.selected);
  const source = baseline.source;
  const baselineJson = await formatWithPrettier(JSON.stringify(baseline), {
    parser: 'json',
  });
  const selectedPolicySource = await formatWithPrettier(
    `import type { SnapshotRevalidationPolicyV2 } from './snapshot-revalidation-policy-v2.js';\n\nexport const SELECTED_SNAPSHOT_REVALIDATION_POLICY_V2 =\n  '${selected}' satisfies SnapshotRevalidationPolicyV2;\n\nexport const SNAPSHOT_REVALIDATION_SELECTION_EVIDENCE_V2 = Object.freeze({\n  schemaVersion: 1,\n  headSha: '${source.headSha}',\n  runId: ${source.runId},\n  runAttempt: ${source.runAttempt},\n  artifactId: ${source.artifactId},\n  catalogSha256:\n    '${source.catalogSha256}',\n  reportSha256:\n    '${source.reportSha256}',\n} as const);\n`,
    {
      parser: 'typescript',
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 80,
      endOfLine: 'lf',
    },
  );
  const baselineRow = baseline.report.policies[0];
  const retainedRow = baseline.report.policies[1];
  const conditionalRow = baseline.report.policies[2];
  const evidenceMarkdown = await formatWithPrettier(
    `# Snapshot revalidation policy selection v1\n\n## Decision\n\nProduction uses \`${selected}\`. Runtime policy is fixed by the generated TypeScript constant and is not selected from host-local timing.\n\n## Authoritative source\n\n- Repository: \`${source.repository}\`\n- Workflow/job: \`${source.workflow}\` / \`${source.job}\`\n- Head SHA: \`${source.headSha}\`\n- Run: \`${source.runId}\`, attempt \`${source.runAttempt}\`\n- Artifact: \`${source.artifactName}\` (ID \`${source.artifactId}\`)\n- Artifact digest: \`${source.artifactDigest}\`\n- Catalog SHA-256: \`${source.catalogSha256}\`\n- Report SHA-256: \`${source.reportSha256}\`\n- Artifact retention window recorded by GitHub: \`${source.artifactCreatedAt}\` to \`${source.artifactExpiresAt}\`\n\n## Measurements\n\n| Policy | p50 µs | p95 µs | Metadata checks | Digest checks | Digest bytes | Decision-safe |\n| --- | ---: | ---: | ---: | ---: | ---: | --- |\n| \`${baselineRow.policy}\` | ${baselineRow.p50Microseconds} | ${baselineRow.p95Microseconds} | ${baselineRow.metadataChecks} | ${baselineRow.digestChecks} | ${baselineRow.digestBytes} | yes |\n| \`${retainedRow.policy}\` | ${retainedRow.p50Microseconds} | ${retainedRow.p95Microseconds} | ${retainedRow.metadataChecks} | ${retainedRow.digestChecks} | ${retainedRow.digestBytes} | no |\n| \`${conditionalRow.policy}\` | ${conditionalRow.p50Microseconds} | ${conditionalRow.p95Microseconds} | ${conditionalRow.metadataChecks} | ${conditionalRow.digestChecks} | ${conditionalRow.digestBytes} | yes |\n\nThe selector rejects \`retained-digest\` because it is not safe for decision-relevant eligible files. \`conditional-digest\` is correctness-safe and improves p95 by ${baseline.decision.selectedImprovementBasisPoints} basis points against the all-loaded baseline, exceeding the committed ${baseline.decision.minimumP95ImprovementBasisPoints}-basis-point threshold. Exact optimized-policy timing ties prefer \`conditional-digest\`.\n\n## Supplemental clean-branch correctness\n\nThe source-bound evidence in \`snapshot-revalidation-clean-branch-v1.md\` exercises the selected policy through the production final snapshot check. It confirms that a clean eligible-only file uses the real filesystem metadata verifier, performs no final-check digest read, remains in the trusted eligible pool, and reports stable consistency. This supplemental check does not modify the imported authoritative timing report or its hash.\n\n## Reproduction\n\nThe committed baseline at \`testkit/baselines/performance/snapshot-revalidation-v1.json\` contains the strict parsed report, source binding, and deterministic decision. The importer regenerates this document and \`selected-snapshot-revalidation-policy-v2.ts\` byte-for-byte.\n`,
    { parser: 'markdown' },
  );
  return Object.freeze({
    baselineJson,
    selectedPolicySource,
    evidenceMarkdown,
  });
}

function parseCliV1(argv: readonly string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === undefined || value === undefined || !flag.startsWith('--')) {
      throw new Error(
        'snapshot revalidation importer arguments are incomplete',
      );
    }
    values.set(flag, value);
  }
  const required = (flag: string): string => {
    const value = values.get(flag);
    if (value === undefined || value.length === 0) {
      throw new Error(`${flag} is required`);
    }
    return resolve(value);
  };
  const repositoryRoot = values.has('--repository-root')
    ? required('--repository-root')
    : repositoryRootDefault;
  return Object.freeze({
    repositoryRoot,
    runPath: required('--run'),
    artifactPath: required('--artifact'),
    reportPath: required('--report'),
    provenancePath: required('--provenance'),
    baselinePath: values.has('--baseline')
      ? required('--baseline')
      : resolve(
          repositoryRoot,
          'testkit/baselines/performance/snapshot-revalidation-v1.json',
        ),
    selectedPolicyPath: values.has('--selected-policy-source')
      ? required('--selected-policy-source')
      : resolve(
          repositoryRoot,
          'src/evidence/request-snapshot/selected-snapshot-revalidation-policy-v2.ts',
        ),
    evidencePath: values.has('--evidence')
      ? required('--evidence')
      : resolve(
          repositoryRoot,
          'docs/superpowers/evidence/repository-hardening-v2/snapshot-revalidation-selection-v1.md',
        ),
  });
}

function writeGenerated(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

async function main(): Promise<void> {
  const paths = parseCliV1(process.argv.slice(2));
  const baseline = importSnapshotRevalidationCandidateV1({
    repositoryRoot: paths.repositoryRoot,
    run: readJson(paths.runPath),
    artifact: readJson(paths.artifactPath),
    reportBytes: readFileSync(paths.reportPath),
    provenance: readJson(paths.provenancePath),
  });
  const rendered =
    await renderSnapshotRevalidationSelectionArtifactsV1(baseline);
  writeGenerated(paths.baselinePath, rendered.baselineJson);
  writeGenerated(paths.selectedPolicyPath, rendered.selectedPolicySource);
  writeGenerated(paths.evidencePath, rendered.evidenceMarkdown);
  process.stdout.write(
    `${JSON.stringify({ selected: baseline.selected, source: baseline.source })}\n`,
  );
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(entryPath)
) {
  await main();
}
