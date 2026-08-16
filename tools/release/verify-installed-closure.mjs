/**
 * Production dependency closure check from one exact packed candidate installed
 * into a fresh consumer.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureReleaseCandidateV1,
  installReleaseCandidateV1,
} from './release-candidate.mjs';
import { releaseEvidenceCandidateV1 } from './release-evidence-schema.mjs';
import { loadInstalledPackageLockGraphV1 } from './sbom-from-shrinkwrap.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const tempParent = join(root, 'test-artifacts');
const evidencePath = join(
  root,
  'test-artifacts/release-evidence/installed-closure-v1.json',
);

function fail(message) {
  throw new Error(message);
}

let workDir;
try {
  const candidate = ensureReleaseCandidateV1(root, npmCli);
  mkdirSync(tempParent, { recursive: true });
  workDir = mkdtempSync(join(tempParent, 'installed-closure-'));
  const installed = installReleaseCandidateV1({
    root,
    npmCli,
    candidate,
    consumerRoot: join(workDir, 'consumer'),
    consumerName: 'repo-nav-closure-consumer',
  });
  const graph = loadInstalledPackageLockGraphV1(installed.consumerRoot, {
    packageName: candidate.name,
    packageVersion: candidate.version,
    packIntegrity: candidate.packIntegrity,
  });

  const ls = spawnSync(
    process.execPath,
    [npmCli, 'ls', '--omit=dev', '--all', '--json'],
    {
      cwd: installed.consumerRoot,
      encoding: 'utf8',
      shell: false,
    },
  );
  let lsReport;
  try {
    lsReport = JSON.parse(ls.stdout || '{}');
  } catch {
    fail('fresh consumer npm ls JSON parse failed');
  }
  const installedRoot = lsReport.dependencies?.[candidate.name];
  if (installedRoot?.version !== candidate.version) {
    fail('fresh consumer npm ls candidate identity mismatch');
  }
  const blockingProblems = (lsReport.problems ?? []).filter(
    (problem) =>
      typeof problem === 'string' &&
      !problem.toLowerCase().includes('extraneous'),
  );
  if (ls.error !== undefined) fail('fresh consumer npm ls spawn failed');
  if (ls.signal !== null) fail('fresh consumer npm ls terminated by signal');
  if (ls.status !== 0) fail('fresh consumer npm ls failed');
  if (blockingProblems.length > 0) {
    fail(
      `fresh consumer npm ls problems: ${blockingProblems.slice(0, 3).join('; ')}`,
    );
  }

  const report = {
    schemaVersion: 1,
    ok: true,
    generatedAt: new Date().toISOString(),
    candidate: releaseEvidenceCandidateV1(installed.candidate),
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    npmLsExitStatus: ls.status,
    problems: Object.freeze([]),
    failures: Object.freeze([]),
    authority:
      'exact-packed-candidate+immutable-copy+fresh-consumer-package-lock+npm-ls',
  };
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
} finally {
  if (workDir !== undefined) {
    rmSync(workDir, { recursive: true, force: true });
  }
}
