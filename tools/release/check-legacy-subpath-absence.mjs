import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultWorkspace = join(dirname(fileURLToPath(import.meta.url)), '../..');
const workspaceFlagIndex = process.argv.indexOf('--workspace');
const workspaceFlag = process.argv.find((value) =>
  value.startsWith('--workspace='),
);
const workspace = resolve(
  workspaceFlagIndex >= 0
    ? (process.argv[workspaceFlagIndex + 1] ?? '')
    : (workspaceFlag?.slice('--workspace='.length) ?? defaultWorkspace),
);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (workspaceFlagIndex >= 0 && process.argv[workspaceFlagIndex + 1] == null) {
  fail('--workspace requires a path');
}

const packagePath = join(workspace, 'package.json');
if (!existsSync(packagePath)) {
  fail(`package.json missing in workspace: ${workspace}`);
}
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const exportsMap = pkg.exports ?? {};
if (Object.hasOwn(exportsMap, './legacy-v1')) {
  fail('package export ./legacy-v1 must be absent');
}
for (const retained of [
  '.',
  './advanced',
  './backends',
  './node',
  './package.json',
]) {
  if (!Object.hasOwn(exportsMap, retained)) {
    fail(`retained package export missing: ${retained}`);
  }
}
for (const forbiddenPath of [
  'src/legacy-v1.ts',
  'dist/legacy-v1.js',
  'dist/legacy-v1.d.ts',
]) {
  if (existsSync(join(workspace, forbiddenPath))) {
    fail(`legacy subpath artifact must be absent: ${forbiddenPath}`);
  }
}

const runtimeProbe = spawnSync(
  process.execPath,
  [
    '--input-type=module',
    '--eval',
    "import('repo-nav/legacy-v1').then(()=>process.exit(1),error=>{if(error?.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED'){console.error(error);process.exit(2)}})",
  ],
  { cwd: workspace, encoding: 'utf8', shell: false },
);
if (runtimeProbe.status !== 0) {
  fail(
    runtimeProbe.stderr ||
      runtimeProbe.stdout ||
      'legacy subpath runtime probe did not fail closed',
  );
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      version: pkg.version,
      absent: 'repo-nav/legacy-v1',
      retained: ['.', './advanced', './backends', './node', './package.json'],
    },
    null,
    2,
  )}\n`,
);
