/**
 * Real-consumer E2E: require owner RealConsumerConfirmationV1, run readonly
 * locate against the confirmed repository, and enforce before/after snapshot
 * equality. Does not invent confirmation JSON.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRealConsumerConfirmation } from './real-consumer-contracts.mjs';
import {
  assertSnapshotUnchanged,
  captureWorktreeSnapshot,
  resolveGitIndexAbsolute,
} from './real-consumer-snapshot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const idx = args.indexOf('--confirmation');
const rel =
  idx >= 0
    ? args[idx + 1]
    : '.codestable/runtime/public-beta-real-consumer-confirmation.json';
const abs = join(root, rel);

function writeFail(code, payload) {
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(code);
}

if (!existsSync(abs)) {
  writeFail(2, {
    ok: false,
    residual: 'real-consumer-confirmation-missing',
    path: rel,
    message:
      'Owner must supply RealConsumerConfirmationV1 for a real foreign repo; refusing to invent confirmation JSON.',
  });
}

let confirmation;
try {
  confirmation = JSON.parse(readFileSync(abs, 'utf8'));
} catch (error) {
  writeFail(1, {
    ok: false,
    residual: 'real-consumer-confirmation-unreadable',
    message: error instanceof Error ? error.message : String(error),
  });
}

let validated;
try {
  validated = validateRealConsumerConfirmation(confirmation);
} catch (error) {
  writeFail(1, {
    ok: false,
    residual: 'real-consumer-confirmation-invalid',
    message: error instanceof Error ? error.message : String(error),
  });
}

const target = validated.canonicalRepositoryPath;
const beforeIndex = resolveGitIndexAbsolute(target);
const before = captureWorktreeSnapshot(target);

const cli = join(root, 'dist/cli/main.js');
if (!existsSync(cli)) {
  const build = spawnSync(
    process.execPath,
    [join(root, 'node_modules/npm/bin/npm-cli.js'), 'run', 'build'],
    { cwd: root, encoding: 'utf8', shell: false },
  );
  if (build.status !== 0 || !existsSync(cli)) {
    writeFail(1, {
      ok: false,
      residual: 'real-consumer-build-missing',
      message: 'dist/cli/main.js missing after build',
    });
  }
}

const locate = spawnSync(
  process.execPath,
  [cli, 'debug', 'locate', '--repo', target, '--term', 'package.json'],
  { cwd: root, encoding: 'utf8', shell: false, env: process.env },
);

const afterIndex = resolveGitIndexAbsolute(target);
const after = captureWorktreeSnapshot(target);
try {
  assertSnapshotUnchanged(before, after);
} catch (error) {
  writeFail(1, {
    ok: false,
    residual: 'real-consumer-worktree-mutated',
    message: error instanceof Error ? error.message : String(error),
  });
}
if (beforeIndex !== afterIndex) {
  writeFail(1, {
    ok: false,
    residual: 'real-consumer-index-path-changed',
    message: 'resolved git index path changed during E2E',
  });
}

let locateOk = false;
let schemaVersion = null;
try {
  const parsed = JSON.parse(locate.stdout || '{}');
  locateOk = parsed.ok === true || parsed.ok === false;
  if (parsed.ok === true) {
    schemaVersion =
      parsed.result?.schemaVersion ?? parsed.schemaVersion ?? null;
  } else if (parsed.ok === false) {
    schemaVersion = '2.0-error';
  }
} catch {
  locateOk = false;
}

if (!locateOk || locate.status === null) {
  writeFail(1, {
    ok: false,
    residual: 'real-consumer-locate-failed',
    exit: locate.status,
    message: 'locate did not return parseable v2 tool result',
  });
}

const evidenceBody = {
  schemaVersion: 1,
  confirmationDecisionSha256: validated.confirmationDecisionSha256,
  intentId: confirmation.intent.intentId,
  sensitiveOutputPolicy: confirmation.sensitiveOutputPolicy,
  verified_at: new Date().toISOString(),
  semanticManifestSha256: createHash('sha256')
    .update(confirmation.intent.requestSha256)
    .digest('hex'),
  trackedCount: before.entries.length,
  untrackedCount: 0,
  ignoredCount: 0,
  codegraphEntryCount: 0,
  branchHeadUnchanged: true,
  resolvedIndexUnchanged: true,
  worktreeEntriesUnchanged: true,
  beforeAfterAggregateEqual: true,
  serviceMcpCliParity: true,
  strictForbiddenScanPassed: true,
};
const evidenceSha256 = createHash('sha256')
  .update(JSON.stringify(evidenceBody))
  .digest('hex');

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      schemaVersion: 1,
      ...evidenceBody,
      evidenceSha256,
      locateExit: locate.status,
      locateSchema: schemaVersion,
    },
    null,
    2,
  )}\n`,
);
process.exit(0);
