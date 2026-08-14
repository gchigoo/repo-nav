/**
 * Package dry-run / smoke against positive allowlist and size budgets.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELEASE_BOUNDARIES_V1 } from './release-boundaries-v1.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const mode = process.argv.includes('--smoke') ? 'smoke' : 'dry-run';

function run(args, opts = {}) {
  const r = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, ...(opts.env ?? {}) },
  });
  if (r.status !== 0) {
    process.stderr.write(r.stderr || r.stdout || 'npm failed\n');
    process.exit(r.status ?? 1);
  }
  return r.stdout;
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.private !== false) {
  process.stderr.write('private must be false for public beta\n');
  process.exit(1);
}

const dry = run(['pack', '--dry-run', '--json']);
const parsed = JSON.parse(dry);
const info = Array.isArray(parsed) ? parsed[0] : parsed;
const entryCount = info.entryCount ?? info.files?.length ?? 0;
const packed = info.size ?? 0;
const unpacked = info.unpackedSize ?? 0;
if (entryCount > RELEASE_BOUNDARIES_V1.packageEntries) {
  process.stderr.write(`entryCount ${entryCount} exceeds budget\n`);
  process.exit(1);
}
if (packed > RELEASE_BOUNDARIES_V1.packedBytes) {
  process.stderr.write(`packed ${packed} exceeds budget\n`);
  process.exit(1);
}
if (unpacked > RELEASE_BOUNDARIES_V1.unpackedBytes) {
  process.stderr.write(`unpacked ${unpacked} exceeds budget\n`);
  process.exit(1);
}

const forbidden = [
  'docs/superpowers/archive/',
  'docs/superpowers/evidence/',
  'src/',
  'tools/',
  'test/',
  'testkit/',
  'node_modules/',
  '.github/',
  'package-lock.json',
];
const files = (info.files ?? []).map((f) => f.path ?? f);
for (const f of files) {
  const norm = String(f).replace(/\\/g, '/');
  if (forbidden.some((p) => norm === p.slice(0, -1) || norm.startsWith(p))) {
    process.stderr.write(`forbidden path in tarball: ${norm}\n`);
    process.exit(1);
  }
  if (norm.endsWith('.map')) {
    process.stderr.write(`map forbidden: ${norm}\n`);
    process.exit(1);
  }
}

if (mode === 'smoke') {
  const out = run(['pack', '--json']);
  const packInfo = JSON.parse(out);
  const tgzName = Array.isArray(packInfo)
    ? packInfo[0].filename
    : packInfo.filename;
  const tgz = join(root, tgzName);
  const temp = join(root, 'test-artifacts', 'release-smoke-consumer');
  rmSync(temp, { recursive: true, force: true });
  mkdirSync(temp, { recursive: true });
  writeFileSync(
    join(temp, 'package.json'),
    JSON.stringify({ name: 'smoke-consumer', private: true }, null, 2),
  );
  run(['install', '--ignore-scripts', '--no-audit', '--no-fund', tgz], {
    cwd: temp,
  });
  // Invoke via node + installed entry (Windows cannot exec the .bin shell shim).
  const installedCli = join(temp, 'node_modules/repo-nav/dist/cli/main.js');
  const help = spawnSync(process.execPath, [installedCli, '--help'], {
    encoding: 'utf8',
    shell: false,
    cwd: temp,
  });
  if (help.status !== 0) {
    process.stderr.write(
      help.stderr || help.stdout || 'repo-nav --help failed\n',
    );
    process.exit(1);
  }
  if (!String(help.stdout).includes('repo-nav debug')) {
    process.stderr.write('repo-nav --help missing expected banner\n');
    process.exit(1);
  }

  const fixtureRoot = join(temp, 'closed-stdin-fixture');
  mkdirSync(fixtureRoot, { recursive: true });
  writeFileSync(join(fixtureRoot, 'README.md'), 'closed stdin smoke fixture\n');
  const closedStdinOptions = {
    encoding: 'utf8',
    shell: false,
    cwd: temp,
    stdio: ['ignore', 'pipe', 'pipe'],
  };

  const probe = spawnSync(
    process.execPath,
    [installedCli, 'debug', 'probe', '--repo', fixtureRoot],
    closedStdinOptions,
  );
  if (probe.status !== 0) {
    process.stderr.write(
      probe.stderr || probe.stdout || 'repo-nav debug probe failed\n',
    );
    process.exit(1);
  }
  if (probe.stderr !== '') {
    process.stderr.write('repo-nav debug probe wrote to stderr\n');
    process.exit(1);
  }
  let probeOutput;
  try {
    probeOutput = JSON.parse(probe.stdout);
  } catch {
    process.stderr.write('repo-nav debug probe returned invalid JSON\n');
    process.exit(1);
  }
  if (
    probeOutput?.schemaVersion !== '1.0' ||
    probeOutput?.repositoryRootRedacted !== '<repository-root>' ||
    !Array.isArray(probeOutput?.backends)
  ) {
    process.stderr.write('repo-nav debug probe returned invalid output\n');
    process.exit(1);
  }

  const locate = spawnSync(
    process.execPath,
    [
      installedCli,
      'debug',
      'locate',
      '--repo',
      fixtureRoot,
      '--term',
      'repo_nav_closed_stdin_absent_marker_7f9c',
    ],
    closedStdinOptions,
  );
  if (locate.status !== 0) {
    process.stderr.write(
      locate.stderr || locate.stdout || 'repo-nav debug locate failed\n',
    );
    process.exit(1);
  }
  if (locate.stderr !== '') {
    process.stderr.write('repo-nav debug locate wrote to stderr\n');
    process.exit(1);
  }
  let locateOutput;
  try {
    locateOutput = JSON.parse(locate.stdout);
  } catch {
    process.stderr.write('repo-nav debug locate returned invalid JSON\n');
    process.exit(1);
  }
  const allowedLocateStatuses = new Set([
    'no_result',
    'partial',
    'backend_unavailable',
  ]);
  if (
    locateOutput?.ok !== true ||
    !allowedLocateStatuses.has(locateOutput?.evidence?.status) ||
    locateOutput?.evidence?.coverage?.abortSource !== 'none'
  ) {
    process.stderr.write(
      'repo-nav debug locate returned an invalid closed-stdin outcome\n',
    );
    process.exit(1);
  }

  rmSync(tgz, { force: true });
  rmSync(temp, { recursive: true, force: true });
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      mode,
      entryCount,
      packed,
      unpacked,
      version: pkg.version,
      private: false,
    },
    null,
    2,
  )}\n`,
);
