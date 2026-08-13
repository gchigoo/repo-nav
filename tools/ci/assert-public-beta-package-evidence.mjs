/**
 * Validate PublicBetaSixCellEvidenceV1 from safe platform reports (local or CI).
 * Requires six-cell reports under artifacts/platform when present; otherwise
 * validates schema helpers and fails closed if --require-six-cell is set.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const requireSix = process.argv.includes('--require-six-cell');

const REQUIRED_CASE_ID = 'F9-PACK-001';
const REQUIRED_MARKERS = Object.freeze([
  'tarball-allowlist-exact',
  'package-bins-executable',
  'node-engine-range-declared',
  'mcp-v2-installed-parity',
  'package-runtime-closure',
]);
const REQUIRED_HASH_IDS = Object.freeze([
  'candidate-id',
  'semantic-manifest',
  'production-closure',
]);
const REQUIRED_CELL_IDS = Object.freeze([
  'linux-node22',
  'linux-node24',
  'windows-node22',
  'windows-node24',
  'macos-intel-node22',
  'macos-intel-node24',
]);

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function f9AssertionIds(markers) {
  return (markers ?? [])
    .filter(
      (marker) =>
        marker &&
        typeof marker === 'object' &&
        marker.contractId === REQUIRED_CASE_ID &&
        typeof marker.assertionId === 'string',
    )
    .map((marker) => marker.assertionId)
    .sort();
}

function f9EvidenceHashes(entries) {
  const out = {};
  for (const entry of entries ?? []) {
    if (
      entry &&
      typeof entry === 'object' &&
      entry.contractId === REQUIRED_CASE_ID &&
      typeof entry.evidenceId === 'string' &&
      typeof entry.sha256 === 'string'
    ) {
      out[entry.evidenceId] = entry.sha256;
    }
  }
  return out;
}

const reportDir = join(root, 'artifacts/platform');
const hasReports = existsSync(reportDir);

if (!hasReports) {
  if (requireSix) {
    fail('artifacts/platform missing and --require-six-cell set');
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        mode: 'local-schema-only',
        requiredCaseId: REQUIRED_CASE_ID,
        requiredMarkers: REQUIRED_MARKERS,
        requiredHashIds: REQUIRED_HASH_IDS,
        residual: 'remote-six-cell-safe-reports-absent',
      },
      null,
      2,
    )}\n`,
  );
  process.exit(0);
}

const files = readdirSync(reportDir).filter((n) => n.endsWith('.json'));
if (files.length < 6 && requireSix) {
  fail(`expected >=6 safe reports, got ${files.length}`);
}

const cells = [];
for (const name of files) {
  const report = JSON.parse(readFileSync(join(reportDir, name), 'utf8'));
  cells.push(report);
}

if (cells.length === 0) {
  if (requireSix) {
    fail('no platform reports loaded');
  }
  process.exit(0);
}

const runId = cells[0]?.run?.workflowRunId;
const attempt = cells[0]?.run?.runAttempt;
const revision = cells[0]?.revision;
const cellIds = cells.map((cell) => cell.cellId).sort();
if (
  requireSix &&
  JSON.stringify(cellIds) !== JSON.stringify([...REQUIRED_CELL_IDS].sort())
) {
  fail(
    `cellId set mismatch: got ${cellIds.join(',')} expected ${REQUIRED_CELL_IDS.join(',')}`,
  );
}

for (const cell of cells) {
  if (cell.run?.workflowRunId !== runId || cell.run?.runAttempt !== attempt) {
    fail('six-cell workflowRunId/runAttempt mismatch');
  }
  if (
    cell.revision?.workflowSha !== revision?.workflowSha ||
    cell.revision?.sourceSha !== revision?.sourceSha ||
    cell.revision?.eventName !== revision?.eventName
  ) {
    fail(`revision mismatch in ${cell.cellId ?? 'unknown'}`);
  }
  const commands = cell.commands ?? [];
  for (const command of commands) {
    if (command.outcome !== 'success') {
      fail(`command ${command.id} not success in ${cell.cellId}`);
    }
  }
  const requiredCaseIds = cell.requiredCaseIds ?? [];
  if (!requiredCaseIds.includes(REQUIRED_CASE_ID)) {
    fail(`missing ${REQUIRED_CASE_ID} in requiredCaseIds for ${cell.cellId}`);
  }
  const markers = f9AssertionIds(cell.passedAssertionMarkers);
  if (
    JSON.stringify(markers) !== JSON.stringify([...REQUIRED_MARKERS].sort())
  ) {
    fail(
      `F9 marker set mismatch in ${cell.cellId ?? 'unknown'}: got ${markers.join(',')}`,
    );
  }
  const hashes = f9EvidenceHashes(cell.contractEvidenceHashes);
  for (const id of REQUIRED_HASH_IDS) {
    const value = hashes[id];
    if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) {
      fail(`missing/invalid evidence hash ${id} in ${cell.cellId}`);
    }
  }
}

const evidence = {
  schemaVersion: 1,
  run: {
    workflowRunId: runId,
    runAttempt: attempt,
    revision,
  },
  cells: [...cells]
    .sort((left, right) =>
      String(left.cellId).localeCompare(String(right.cellId)),
    )
    .map((cell) => {
      const hashes = f9EvidenceHashes(cell.contractEvidenceHashes);
      return {
        cellId: cell.cellId,
        requiredCaseId: REQUIRED_CASE_ID,
        passedAssertionIds: f9AssertionIds(cell.passedAssertionMarkers),
        candidateIdSha256: hashes['candidate-id'],
        semanticManifestSha256: hashes['semantic-manifest'],
        productionClosureSha256: hashes['production-closure'],
      };
    }),
};
const sixCellEvidenceSha256 = createHash('sha256')
  .update(JSON.stringify(evidence))
  .digest('hex');

process.stdout.write(
  `${JSON.stringify({ ok: true, ...evidence, sixCellEvidenceSha256 }, null, 2)}\n`,
);
