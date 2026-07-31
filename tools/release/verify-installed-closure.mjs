/**
 * Production dependency closure check from npm-shrinkwrap + npm ls topology.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELEASE_BOUNDARIES_V1 } from './release-boundaries-v1.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.private !== false) fail('private must be false for public beta');
if (!existsSync(join(root, 'npm-shrinkwrap.json'))) {
  fail('npm-shrinkwrap.json required');
}
if (existsSync(join(root, 'package-lock.json'))) {
  fail('package-lock.json must not coexist with shrinkwrap');
}

const wrap = JSON.parse(
  readFileSync(join(root, 'npm-shrinkwrap.json'), 'utf8'),
);
if (wrap.name !== pkg.name || wrap.version !== pkg.version) {
  fail('shrinkwrap root identity must match package.json');
}

const packages = wrap.packages ?? {};
const nodeIds = Object.keys(packages).filter((key) => {
  if (key === '') return true;
  const entry = packages[key];
  return entry && entry.dev !== true && entry.optional !== true;
});
if (nodeIds.length === 0) fail('shrinkwrap production projection empty');
if (nodeIds.length > RELEASE_BOUNDARIES_V1.productionGraphNodes) {
  fail(
    `production nodes ${nodeIds.length} exceed budget ${RELEASE_BOUNDARIES_V1.productionGraphNodes}`,
  );
}

let edgeCount = 0;
for (const key of nodeIds) {
  const deps = packages[key]?.dependencies ?? {};
  edgeCount += Object.keys(deps).length;
  if (
    key !== '' &&
    packages[key]?.integrity == null &&
    packages[key]?.link !== true
  ) {
    // Root may omit integrity; linked packages may omit; others need identity.
    if (packages[key]?.version == null && packages[key]?.resolved == null) {
      fail(`shrinkwrap node missing identity: ${key}`);
    }
  }
}
if (edgeCount > RELEASE_BOUNDARIES_V1.productionGraphEdges) {
  fail(
    `production edges ${edgeCount} exceed budget ${RELEASE_BOUNDARIES_V1.productionGraphEdges}`,
  );
}

const ls = spawnSync(
  process.execPath,
  [npmCli, 'ls', '--omit=dev', '--all', '--json'],
  { cwd: root, encoding: 'utf8', shell: false },
);
let lsReport;
try {
  lsReport = JSON.parse(ls.stdout || '{}');
} catch {
  fail('npm ls json parse failed');
}
if (lsReport.name !== pkg.name || lsReport.version !== pkg.version) {
  fail('npm ls root identity mismatch');
}
if (lsReport.problems && lsReport.problems.length > 0) {
  const blocking = lsReport.problems.filter(
    (p) => typeof p === 'string' && !p.includes('extraneous'),
  );
  if (blocking.length > 0) {
    fail(`npm ls problems: ${blocking.slice(0, 3).join('; ')}`);
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      name: pkg.name,
      version: pkg.version,
      nodeCount: nodeIds.length,
      edgeCount,
      authority: 'npm-shrinkwrap+npm-ls-topology',
    },
    null,
    2,
  )}\n`,
);
