/**
 * Validate six strict platform reports against one current packed candidate.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

if (process.env['REPO_NAV_PLATFORM_TSX_ACTIVE'] !== '1') {
  const relaunch = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      fileURLToPath(import.meta.url),
      ...process.argv.slice(2),
    ],
    {
      cwd: root,
      env: { ...process.env, REPO_NAV_PLATFORM_TSX_ACTIVE: '1' },
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  process.exit(relaunch.status ?? 1);
}

const {
  PLATFORM_CELLS_V1,
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  applicableBindingsForOs,
  createFilesystemPlatformContractRepository,
  validateProductionPlatformContractSnapshotV1,
} = await import(
  pathToFileURL(resolve(root, 'testkit/contracts/platform-contract.ts')).href
);
const { validatePlatformCoreCommandReportV1 } = await import(
  pathToFileURL(resolve(root, 'testkit/contracts/platform-evidence-report.ts'))
    .href
);
const { loadReleaseCandidateV1 } = await import(
  pathToFileURL(resolve(root, 'tools/release/release-candidate.mjs')).href
);

const npmCli = resolve(root, 'node_modules/npm/bin/npm-cli.js');
const REQUIRED_CASE_ID = 'F9-PACK-001';
const REQUIRED_HASH_IDS = Object.freeze([
  'candidate-id',
  'semantic-manifest',
  'production-closure',
]);
const REQUIRED_CELL_IDS = Object.freeze(
  PLATFORM_CELLS_V1.map((cell) => cell.id).sort(),
);
const MAX_REPORT_AGE_MS = 24 * 60 * 60 * 1000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const args = {
    requireSix: false,
    reportDir: resolve(root, 'artifacts/platform'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--require-six-cell') {
      args.requireSix = true;
      continue;
    }
    if (flag === '--report-dir') {
      const value = argv[++index];
      if (value === undefined) fail('--report-dir requires a value');
      args.reportDir = resolve(root, value);
      continue;
    }
    fail(`unsupported argument: ${flag}`);
  }
  return args;
}

function currentGitSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  const sha = result.stdout.trim();
  if (
    result.status !== 0 ||
    result.signal !== null ||
    result.error !== undefined ||
    !GIT_SHA_PATTERN.test(sha)
  ) {
    fail('current Git source revision unavailable');
  }
  return sha;
}

function evidenceHashes(report) {
  const hashes = new Map();
  for (const entry of report.contractEvidenceHashes ?? []) {
    if (entry?.contractId !== REQUIRED_CASE_ID) continue;
    if (
      typeof entry.evidenceId !== 'string' ||
      typeof entry.sha256 !== 'string' ||
      hashes.has(entry.evidenceId)
    ) {
      fail(`invalid duplicate F9 evidence in ${report.cellId ?? 'unknown'}`);
    }
    hashes.set(entry.evidenceId, entry.sha256);
  }
  return hashes;
}

function expectationsForCell(cellId, hashes, snapshot) {
  const cell = PLATFORM_CELLS_V1.find((entry) => entry.id === cellId);
  if (cell === undefined) fail(`unknown platform cell ${cellId}`);
  const applicable = applicableBindingsForOs(snapshot, cell.os);
  const expectedMarkers = applicable.flatMap((binding) =>
    binding.requiredAssertionIds.map((assertionId) => ({
      contractId: binding.contractId,
      assertionId,
    })),
  );
  const expectedEvidence = applicable.flatMap((binding) =>
    binding.requiredEvidenceHashIds.map((evidenceId) => {
      const sha256 = hashes.get(evidenceId);
      if (sha256 === undefined) {
        fail(`missing expected evidence ${binding.contractId}/${evidenceId}`);
      }
      return { contractId: binding.contractId, evidenceId, sha256 };
    }),
  );
  return {
    expectedMarkers,
    expectedEvidence,
    expectedCaseIds: applicable.map((binding) => binding.contractId).sort(),
  };
}

function validateFreshTimestamp(timestamp, now, cellId) {
  if (typeof timestamp !== 'string') {
    fail(`completedAt missing in ${cellId}`);
  }
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) fail(`completedAt invalid in ${cellId}`);
  const age = now - parsed;
  if (age < -60_000 || age > MAX_REPORT_AGE_MS) {
    fail(`platform report stale in ${cellId}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.reportDir)) {
    if (args.requireSix) {
      fail('platform report directory missing and --require-six-cell set');
    }
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          mode: 'local-schema-only',
          requiredCaseId: REQUIRED_CASE_ID,
          requiredHashIds: REQUIRED_HASH_IDS,
          residual: 'remote-six-cell-safe-reports-absent',
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const files = readdirSync(args.reportDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (files.length !== REQUIRED_CELL_IDS.length) {
    fail(`expected exactly six safe reports, got ${files.length}`);
  }
  const cells = files.map((name) =>
    JSON.parse(readFileSync(resolve(args.reportDir, name), 'utf8')),
  );
  const cellIds = cells.map((cell) => cell?.cellId).sort();
  if (JSON.stringify(cellIds) !== JSON.stringify(REQUIRED_CELL_IDS)) {
    fail(`cellId set mismatch: got ${cellIds.join(',')}`);
  }

  const candidate = loadReleaseCandidateV1(root, npmCli);
  const sourceSha = currentGitSha();
  const first = cells[0];
  if (first === undefined) fail('platform reports unavailable');
  const firstHashes = evidenceHashes(first);
  const productionClosureSha256 = firstHashes.get('production-closure');
  if (
    typeof productionClosureSha256 !== 'string' ||
    !SHA256_PATTERN.test(productionClosureSha256)
  ) {
    fail('production closure evidence hash invalid');
  }
  const expectedHashes = new Map([
    ['candidate-id', candidate.tarballSha256],
    ['semantic-manifest', candidate.sourceSha256],
    ['production-closure', productionClosureSha256],
  ]);
  const repository = createFilesystemPlatformContractRepository(root);
  const snapshot = validateProductionPlatformContractSnapshotV1(
    PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
    repository,
  ).snapshot;
  const runId = first.run?.workflowRunId;
  const attempt = first.run?.runAttempt;
  const workflowSha = first.revision?.workflowSha;
  const eventName = first.revision?.eventName;
  const now = Date.now();

  for (const cell of cells) {
    const expectations = expectationsForCell(
      cell.cellId,
      expectedHashes,
      snapshot,
    );
    validatePlatformCoreCommandReportV1(cell, {
      ...expectations,
      requireAllCommandsSuccess: true,
    });
    if (cell.run.workflowRunId !== runId || cell.run.runAttempt !== attempt) {
      fail('six-cell workflowRunId/runAttempt mismatch');
    }
    if (
      cell.revision.workflowSha !== workflowSha ||
      cell.revision.eventName !== eventName ||
      cell.revision.sourceSha !== sourceSha
    ) {
      fail(`revision mismatch in ${cell.cellId}`);
    }
    validateFreshTimestamp(cell.completedAt, now, cell.cellId);
  }

  const evidence = {
    schemaVersion: 1,
    run: {
      workflowRunId: runId,
      runAttempt: attempt,
      workflowSha,
      sourceSha,
      eventName,
    },
    candidate: {
      name: candidate.name,
      version: candidate.version,
      tarballSha256: candidate.tarballSha256,
      sourceSha256: candidate.sourceSha256,
      designRevisionSha256: candidate.designRevisionSha256,
    },
    productionClosureSha256,
    cells: cells.map((cell) => ({
      cellId: cell.cellId,
      completedAt: cell.completedAt,
    })),
  };
  const sixCellEvidenceSha256 = createHash('sha256')
    .update(JSON.stringify(evidence))
    .digest('hex');
  process.stdout.write(
    `${JSON.stringify(
      { ok: true, ...evidence, sixCellEvidenceSha256 },
      null,
      2,
    )}\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
