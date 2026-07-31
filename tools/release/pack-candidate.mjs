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
  '.codestable/',
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
  const help = spawnSync(
    process.execPath,
    [join(temp, 'node_modules/repo-nav/dist/cli/main.js'), '--help'],
    { encoding: 'utf8', shell: false, cwd: temp },
  );
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
