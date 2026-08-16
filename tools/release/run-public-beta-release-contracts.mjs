/**
 * Aggregate runner for public-beta release Stable IDs.
 * Loads release-case-manifest-v2, validates the exact 21-ID set and owned paths,
 * checks fixture-ownership.yaml coverage, then executes each case once.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = join(
  root,
  'testkit/manifests/release-v2/release-case-manifest-v2.json',
);
const ownershipPath = join(
  root,
  'testkit/manifests/coverage/fixture-ownership.yaml',
);
const tsxCli = join(root, 'node_modules/tsx/dist/cli.mjs');

const REQUIRED_IDS = Object.freeze([
  'F9-CUTOVER-001',
  'F9-TRANSPORT-001',
  'F9-SINGLE-EXEC-001',
  'F9-FAIL-CLOSED-001',
  'F9-NO-V1-001',
  'F9-VERSION-001',
  'F9-NODE-001',
  'F9-CLI-CLOSURE-001',
  'F9-PACKAGE-API-001',
  'F9-METADATA-001',
  'F9-QUALITY-001',
  'F9-PACK-001',
  'F9-PACK-REPRO-001',
  'F9-INSTALL-001',
  'F9-AUDIT-001',
  'F9-SBOM-001',
  'F9-SECURITY-001',
  'F9-MIGRATION-001',
  'F9-REAL-MCP-001',
  'F9-LARGE-001',
  'F9-RELEASE-001',
]);

const REQUIRED_FIELDS = Object.freeze([
  'id',
  'group',
  'case',
  'surface',
  'commandId',
  'fixture',
  'assertion',
  'runner',
  'contractOwners',
]);

const PATH_ARRAY_FIELDS = Object.freeze([
  'fixture',
  'assertion',
  'runner',
  'contractOwners',
]);

const SURFACE_RUNNERS = Object.freeze({
  unit: 'testkit/runners/unit-runner.ts',
  docs: 'testkit/runners/unit-runner.ts',
  golden: 'testkit/runners/golden-runner.ts',
  mcp: 'testkit/runners/mcp-runner.ts',
});

const SURFACE_COMMAND = Object.freeze({
  unit: 'CMD-F9-UNIT',
  docs: 'CMD-DOCS',
  golden: 'CMD-LARGE',
  mcp: 'CMD-MCP-ALL',
});

/**
 * Write stderr and exit with status 1.
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/**
 * Assert every relative path exists under repo root.
 * @param {string} caseId
 * @param {string} field
 * @param {unknown} paths
 */
function assertPathsExist(caseId, field, paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    fail(`${caseId}: ${field} must be a nonempty string[]`);
  }
  for (const rel of paths) {
    if (typeof rel !== 'string' || rel.length === 0) {
      fail(`${caseId}: ${field} entry must be a nonempty string`);
    }
    const abs = join(root, rel);
    if (!existsSync(abs)) {
      fail(`${caseId}: missing ${field} path: ${rel}`);
    }
  }
}

if (!existsSync(manifestPath)) {
  fail('release-case-manifest-v2.json missing');
}
if (!existsSync(ownershipPath)) {
  fail('fixture-ownership.yaml missing');
}
if (!existsSync(tsxCli)) {
  fail('tsx CLI missing; run npm install');
}

const args = process.argv.slice(2);
if (!args.includes('--all')) {
  fail('usage: node tools/release/run-public-beta-release-contracts.mjs --all');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
  fail('manifest.cases must be a nonempty array');
}

const seenIds = new Set();
const seenCaseKeys = new Set();
/** @type {Array<{id:string,group:string,case:string,surface:string,commandId:string}>} */
const validated = [];

for (const entry of manifest.cases) {
  if (typeof entry !== 'object' || entry === null) {
    fail('manifest case entry must be an object');
  }
  for (const field of REQUIRED_FIELDS) {
    if (!(field in entry)) {
      fail(`manifest case missing required field: ${field}`);
    }
  }
  if (
    typeof entry.id !== 'string' ||
    typeof entry.group !== 'string' ||
    typeof entry.case !== 'string' ||
    typeof entry.surface !== 'string' ||
    typeof entry.commandId !== 'string'
  ) {
    fail('manifest case scalar fields must be strings');
  }
  if (seenIds.has(entry.id)) {
    fail(`duplicate Stable ID: ${entry.id}`);
  }
  seenIds.add(entry.id);

  const caseKey = `${entry.surface}/${entry.group}/${entry.case}`;
  if (seenCaseKeys.has(caseKey)) {
    fail(`duplicate surface/group/case: ${caseKey}`);
  }
  seenCaseKeys.add(caseKey);

  const expectedCommand = SURFACE_COMMAND[entry.surface];
  if (expectedCommand === undefined) {
    fail(`unsupported surface for ${entry.id}: ${entry.surface}`);
  }
  if (entry.commandId !== expectedCommand) {
    fail(
      `${entry.id}: commandId ${entry.commandId} does not match surface ${entry.surface} (expected ${expectedCommand})`,
    );
  }

  for (const field of PATH_ARRAY_FIELDS) {
    assertPathsExist(entry.id, field, entry[field]);
  }

  validated.push({
    id: entry.id,
    group: entry.group,
    case: entry.case,
    surface: entry.surface,
    commandId: entry.commandId,
  });
}

const got = [...seenIds].sort();
const expected = [...REQUIRED_IDS].sort();
if (JSON.stringify(got) !== JSON.stringify(expected)) {
  fail(
    `manifest ID set mismatch\nexpected ${expected.join(',')}\ngot ${got.join(',')}`,
  );
}

const ownershipDoc = parseYaml(readFileSync(ownershipPath, 'utf8'));
const publicBeta = ownershipDoc?.publicBetaRelease;
if (
  typeof publicBeta !== 'object' ||
  publicBeta === null ||
  Array.isArray(publicBeta)
) {
  fail('fixture-ownership.yaml missing publicBetaRelease map');
}
for (const id of REQUIRED_IDS) {
  const slug = publicBeta[id];
  if (typeof slug !== 'string' || slug.length === 0) {
    fail(`fixture-ownership.yaml publicBetaRelease missing ID: ${id}`);
  }
}
const ownershipKeys = Object.keys(publicBeta).sort();
if (JSON.stringify(ownershipKeys) !== JSON.stringify(expected)) {
  fail(
    `fixture-ownership.yaml publicBetaRelease ID set mismatch\nexpected ${expected.join(',')}\ngot ${ownershipKeys.join(',')}`,
  );
}

const results = [];
for (const entry of validated) {
  const runnerRel = SURFACE_RUNNERS[entry.surface];
  const run = spawnSync(
    process.execPath,
    [tsxCli, runnerRel, '--group', entry.group, '--case', entry.case],
    { cwd: root, encoding: 'utf8', shell: false },
  );
  if (run.status !== 0) {
    process.stderr.write(run.stdout || '');
    process.stderr.write(run.stderr || '');
    fail(
      `Stable ID ${entry.id} failed on surface=${entry.surface} group=${entry.group} case=${entry.case} exit=${run.status}`,
    );
  }
  results.push({
    id: entry.id,
    surface: entry.surface,
    group: entry.group,
    case: entry.case,
    commandId: entry.commandId,
    exit: 0,
  });
}

if (results.length !== REQUIRED_IDS.length) {
  fail(`executed count ${results.length} !== ${REQUIRED_IDS.length}`);
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      executed: results.length,
      ids: got,
      results,
    },
    null,
    2,
  )}\n`,
);
process.exit(0);
