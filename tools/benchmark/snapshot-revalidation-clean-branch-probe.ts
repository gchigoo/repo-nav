import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format as formatWithPrettier } from 'prettier';
import { z } from 'zod';

import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  requireTrustedStableEligibleDiscoveryRecordsV2,
  runFinalSnapshotCheckV2,
} from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { buildPreRankingStablePoolsV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { SELECTED_SNAPSHOT_REVALIDATION_POLICY_V2 } from '../../src/evidence/request-snapshot/selected-snapshot-revalidation-policy-v2.js';
import {
  readVerifiedFileV2,
  verifyVerifiedFileMetadataV2,
} from '../../src/repository/verified-file-snapshot-v2.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(moduleDirectory, '..', '..');
const evidencePathDefault = resolve(
  repositoryRoot,
  'testkit/baselines/performance/snapshot-revalidation-clean-branch-v1.json',
);
const documentationPathDefault = resolve(
  repositoryRoot,
  'docs/superpowers/evidence/repository-hardening-v2/snapshot-revalidation-clean-branch-v1.md',
);

export const SNAPSHOT_CLEAN_BRANCH_SOURCE_PATHS_V1 = Object.freeze([
  'src/evidence/request-snapshot/final-snapshot-check-v2.ts',
  'src/evidence/request-snapshot/snapshot-revalidation-policy-v2.ts',
  'src/evidence/request-snapshot/selected-snapshot-revalidation-policy-v2.ts',
  'tools/benchmark/snapshot-revalidation-clean-branch-probe.ts',
] as const);

export const SnapshotRevalidationCleanBranchEvidenceV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    authority: z.literal('source-bound-real-final-check+filesystem-metadata'),
    sourcePaths: z.tuple([
      z.literal(SNAPSHOT_CLEAN_BRANCH_SOURCE_PATHS_V1[0]),
      z.literal(SNAPSHOT_CLEAN_BRANCH_SOURCE_PATHS_V1[1]),
      z.literal(SNAPSHOT_CLEAN_BRANCH_SOURCE_PATHS_V1[2]),
      z.literal(SNAPSHOT_CLEAN_BRANCH_SOURCE_PATHS_V1[3]),
    ]),
    sourceSha256: z.string().regex(/^[0-9a-f]{64}$/u),
    policy: z.literal('conditional-digest'),
    gitState: z.literal('clean'),
    branch: z.literal('eligible-only-metadata'),
    metadataChecks: z.literal(1),
    digestChecks: z.literal(0),
    filesChecked: z.literal(1),
    changedCanonicalKeyCount: z.literal(0),
    retainedEvidenceCount: z.literal(0),
    retainedEligibleCount: z.literal(1),
    trustedEligibleCount: z.literal(1),
    consistency: z.literal('stable'),
    stableEligibleRetained: z.literal(true),
  })
  .readonly();

export type SnapshotRevalidationCleanBranchEvidenceV1 = z.infer<
  typeof SnapshotRevalidationCleanBranchEvidenceV1Schema
>;

export function snapshotCleanBranchSourceSha256V1(
  root: string = repositoryRoot,
): string {
  const hash = createHash('sha256');
  for (const path of SNAPSHOT_CLEAN_BRANCH_SOURCE_PATHS_V1) {
    hash.update(path, 'utf8');
    hash.update('\0', 'utf8');
    hash.update(readFileSync(resolve(root, path)));
    hash.update('\0', 'utf8');
  }
  return hash.digest('hex');
}

export async function runSelectedSnapshotCleanBranchProbeV1(
  root: string = repositoryRoot,
): Promise<SnapshotRevalidationCleanBranchEvidenceV1> {
  const workspace = mkdtempSync(
    resolve(tmpdir(), 'repo-nav-snapshot-clean-branch-'),
  );
  try {
    const locator = 'eligible.ts';
    const bytes = Buffer.from('export const eligible = true;\n', 'utf8');
    writeFileSync(resolve(workspace, locator), bytes);
    const initial = await readVerifiedFileV2({
      repositoryRoot: workspace,
      locator,
      maxFileBytes: bytes.byteLength,
      signal: new AbortController().signal,
    });
    const pools = buildPreRankingStablePoolsV2([
      Object.freeze({
        discoveryKey: 'discovery:eligible.ts',
        canonicalFileKey: initial.snapshot.canonicalFileKey,
        safeKey: 'safe:eligible.ts',
        rankingSignals: Object.freeze({
          kind: 'direct' as const,
          focusLines: Object.freeze([1, 1] as [number, number]),
          focusExcerpt: 'export const eligible = true;',
        }),
        classificationDefined: false,
      }),
    ]);
    let metadataChecks = 0;
    let digestChecks = 0;
    const result = await runFinalSnapshotCheckV2({
      repositoryRoot: workspace,
      loadedFiles: Object.freeze([
        Object.freeze({
          canonicalFileKey: initial.snapshot.canonicalFileKey,
          snapshot: initial.snapshot,
          aliases: Object.freeze([locator]),
        }),
      ]),
      evidencePool: pools.evidence,
      eligiblePool: pools.eligible,
      gitState: 'clean',
      signal: new AbortController().signal,
      execution: executionToken(),
      readVerifiedFile: async (input) => {
        digestChecks += 1;
        return readVerifiedFileV2(input);
      },
      verifyVerifiedFileMetadata: async (input) => {
        metadataChecks += 1;
        return verifyVerifiedFileMetadataV2(input);
      },
    });
    const trustedEligible = requireTrustedStableEligibleDiscoveryRecordsV2(
      result.eligibleDiscovery,
      result.proof,
    );
    return SnapshotRevalidationCleanBranchEvidenceV1Schema.parse({
      schemaVersion: 1,
      authority: 'source-bound-real-final-check+filesystem-metadata',
      sourcePaths: SNAPSHOT_CLEAN_BRANCH_SOURCE_PATHS_V1,
      sourceSha256: snapshotCleanBranchSourceSha256V1(root),
      policy: SELECTED_SNAPSHOT_REVALIDATION_POLICY_V2,
      gitState: 'clean',
      branch: 'eligible-only-metadata',
      metadataChecks,
      digestChecks,
      filesChecked: result.facts.coverage.filesChecked,
      changedCanonicalKeyCount: result.changedCanonicalKeys.size,
      retainedEvidenceCount: result.retainedEvidence.length,
      retainedEligibleCount: result.retainedEligible.length,
      trustedEligibleCount: trustedEligible.length,
      consistency: result.facts.coverage.consistency,
      stableEligibleRetained:
        result.retainedEligible.length === 1 &&
        trustedEligible.length === 1 &&
        result.retainedEligible[0] === trustedEligible[0],
    });
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

export async function renderSnapshotCleanBranchEvidenceV1(
  evidence: SnapshotRevalidationCleanBranchEvidenceV1,
): Promise<{ readonly json: string; readonly markdown: string }> {
  const parsed =
    SnapshotRevalidationCleanBranchEvidenceV1Schema.parse(evidence);
  const json = await formatWithPrettier(JSON.stringify(parsed), {
    parser: 'json',
  });
  const markdown = await formatWithPrettier(
    `# Snapshot revalidation clean-branch evidence v1\n\n## Result\n\nThe selected \`${parsed.policy}\` policy retained one eligible-only file after the production final snapshot check used the real filesystem metadata verifier with repository Git state \`${parsed.gitState}\`. The final check performed ${parsed.metadataChecks} metadata check, ${parsed.digestChecks} digest checks, retained ${parsed.retainedEligibleCount} eligible record, and reported \`${parsed.consistency}\` consistency.\n\n## Authority and scope\n\n- Authority: \`${parsed.authority}\`\n- Source SHA-256: \`${parsed.sourceSha256}\`\n- Branch: \`${parsed.branch}\`\n- Files checked: ${parsed.filesChecked}\n- Changed canonical keys: ${parsed.changedCanonicalKeyCount}\n- Trusted eligible records: ${parsed.trustedEligibleCount}\n\nThe source digest binds this deterministic probe to the production final-check implementation, policy planner, selected policy constant, and probe source listed in \`testkit/baselines/performance/snapshot-revalidation-clean-branch-v1.json\`. This is supplemental source-bound correctness evidence. It does not alter or replace the imported authoritative GitHub timing artifact recorded in \`snapshot-revalidation-selection-v1.md\`.\n\n## Reproduction\n\nRun \`npm run benchmark:snapshot-revalidation:clean-branch\`. The command must regenerate this document and the committed JSON evidence byte-for-byte.\n`,
    { parser: 'markdown' },
  );
  return Object.freeze({ json, markdown });
}

async function main(): Promise<void> {
  const evidence = await runSelectedSnapshotCleanBranchProbeV1();
  const rendered = await renderSnapshotCleanBranchEvidenceV1(evidence);
  mkdirSync(dirname(evidencePathDefault), { recursive: true });
  mkdirSync(dirname(documentationPathDefault), { recursive: true });
  writeFileSync(evidencePathDefault, rendered.json, 'utf8');
  writeFileSync(documentationPathDefault, rendered.markdown, 'utf8');
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      evidence: relative(repositoryRoot, evidencePathDefault),
      documentation: relative(repositoryRoot, documentationPathDefault),
      sourceSha256: evidence.sourceSha256,
    })}\n`,
  );
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(entryPath)
) {
  await main();
}
