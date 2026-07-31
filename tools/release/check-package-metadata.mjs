/**
 * Verify package.json / shrinkwrap / runtime version authority parity.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

if (pkg.version !== '0.2.0-beta.1') fail('version must be 0.2.0-beta.1');
if (pkg.private !== false) fail('private must be false for public beta');
if (pkg.engines?.node !== '^22.0.0 || ^24.0.0') fail('engines.node mismatch');
if (pkg.packageManager !== 'npm@11.12.1') fail('packageManager mismatch');
if (pkg.license !== 'MIT') fail('license SPDX must be MIT');
if (existsSync(join(root, 'package-lock.json'))) {
  fail('package-lock.json must not coexist with npm-shrinkwrap.json');
}
if (!existsSync(join(root, 'npm-shrinkwrap.json'))) {
  fail('npm-shrinkwrap.json required');
}
const wrap = JSON.parse(
  readFileSync(join(root, 'npm-shrinkwrap.json'), 'utf8'),
);
if (wrap.version !== pkg.version) fail('shrinkwrap root version mismatch');
if (wrap.name !== pkg.name) fail('shrinkwrap root name mismatch');
if (wrap.lockfileVersion == null) fail('shrinkwrap lockfileVersion missing');

const bins = pkg.bin ?? {};
if (bins['repo-nav-mcp'] !== 'dist/main.js') fail('bin repo-nav-mcp mismatch');
if (bins['repo-nav'] !== 'dist/cli/main.js') fail('bin repo-nav mismatch');

if (!existsSync(join(root, 'dist/runtime/package-metadata.js'))) {
  fail(
    'build dist before package:metadata:check (missing package-metadata.js)',
  );
}

const probe = spawnSync(
  process.execPath,
  [
    '-e',
    "import('./dist/runtime/package-metadata.js').then(m=>process.stdout.write(m.readPackageMetadata().version))",
  ],
  { cwd: root, encoding: 'utf8' },
);
if (probe.status !== 0 || probe.stdout.trim() !== pkg.version) {
  fail(`runtime version probe mismatch: ${probe.stdout} / ${probe.stderr}`);
}

process.stdout.write(
  `${JSON.stringify({ ok: true, version: pkg.version, private: false }, null, 2)}\n`,
);
