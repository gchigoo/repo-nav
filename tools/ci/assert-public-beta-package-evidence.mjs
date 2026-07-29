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

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
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

if (cells.length > 0) {
  const runId = cells[0]?.run?.workflowRunId;
  const attempt = cells[0]?.run?.runAttempt;
  for (const cell of cells) {
    if (cell.run?.workflowRunId !== runId || cell.run?.runAttempt !== attempt) {
      fail('six-cell workflowRunId/runAttempt mismatch');
    }
    const markers = cell.passedAssertionMarkers ?? [];
    if (JSON.stringify(markers) !== JSON.stringify([...REQUIRED_MARKERS])) {
      fail(`marker set mismatch in ${cell.cellId ?? 'unknown'}`);
    }
  }
}

const evidence = {
  schemaVersion: 1,
  run: cells[0]?.run ?? null,
  cells: cells.map((c) => ({
    cellId: c.cellId,
    markers: c.passedAssertionMarkers,
    hashes: Object.fromEntries(
      REQUIRED_HASH_IDS.map((id) => [id, c.contractEvidenceHashes?.[id] ?? null]),
    ),
  })),
};
const sixCellEvidenceSha256 = createHash('sha256')
  .update(JSON.stringify(evidence))
  .digest('hex');

process.stdout.write(
  `${JSON.stringify({ ok: true, ...evidence, sixCellEvidenceSha256 }, null, 2)}\n`,
);
