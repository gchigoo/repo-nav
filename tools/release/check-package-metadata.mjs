/**
 * Verify package.json / shrinkwrap / runtime version authority parity and
 * release documentation metadata for the supported 1.x corrective line.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const REQUIRED_INSTALL_LINE = 'npm i -g repo-nav@1.1.0';
const REQUIRED_MCP_SDK_VERSION = '1.30.0';
const REQUIRED_PACKAGE_VERSION = '1.1.0';
const REQUIRED_EXPORTS = Object.freeze({
  '.': { types: './dist/index.d.ts', import: './dist/index.js' },
  './legacy-v1': {
    types: './dist/legacy-v1.d.ts',
    import: './dist/legacy-v1.js',
  },
  './backends': {
    types: './dist/backends.d.ts',
    import: './dist/backends.js',
  },
  './node': { types: './dist/node.d.ts', import: './dist/node.js' },
  './advanced': {
    types: './dist/advanced.d.ts',
    import: './dist/advanced.js',
  },
  './package.json': './package.json',
});

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function readText(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

if (
  typeof pkg.version !== 'string' ||
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(pkg.version)
) {
  fail('version must be a semver release or prerelease');
}
if (pkg.version !== REQUIRED_PACKAGE_VERSION) {
  fail(`package version must remain ${REQUIRED_PACKAGE_VERSION}`);
}
if (pkg.private !== false) fail('private must be false for public beta');
if (pkg.engines?.node !== '^22.0.0 || ^24.0.0') fail('engines.node mismatch');
if (pkg.packageManager !== 'npm@11.12.1') fail('packageManager mismatch');
if (pkg.license !== 'MIT') fail('license SPDX must be MIT');
if (
  pkg.dependencies?.['@modelcontextprotocol/sdk'] !== REQUIRED_MCP_SDK_VERSION
) {
  fail('MCP SDK dependency must be exact 1.30.0');
}
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
if (wrap.packages?.['']?.version !== pkg.version) {
  fail('shrinkwrap workspace root version mismatch');
}
if (wrap.lockfileVersion == null) fail('shrinkwrap lockfileVersion missing');
if (
  wrap.packages?.['']?.dependencies?.['@modelcontextprotocol/sdk'] !==
  REQUIRED_MCP_SDK_VERSION
) {
  fail('shrinkwrap root MCP SDK dependency must be exact 1.30.0');
}
const sdkNode = wrap.packages?.['node_modules/@modelcontextprotocol/sdk'];
if (sdkNode?.version !== REQUIRED_MCP_SDK_VERSION) {
  fail('shrinkwrap MCP SDK package version must be 1.30.0');
}
if (
  sdkNode?.resolved !==
  'https://registry.npmjs.org/@modelcontextprotocol/sdk/-/sdk-1.30.0.tgz'
) {
  fail('shrinkwrap MCP SDK resolved tarball mismatch');
}
if (
  typeof sdkNode?.integrity !== 'string' ||
  !sdkNode.integrity.startsWith('sha512-')
) {
  fail('shrinkwrap MCP SDK integrity missing');
}

const bins = pkg.bin ?? {};
if (bins['repo-nav-mcp'] !== 'dist/main.js') fail('bin repo-nav-mcp mismatch');
if (bins['repo-nav'] !== 'dist/cli/main.js') fail('bin repo-nav mismatch');
if (JSON.stringify(pkg.exports) !== JSON.stringify(REQUIRED_EXPORTS)) {
  fail('package exports must preserve the 1.1.0 compatibility surface');
}

for (const relativePath of [
  'README.md',
  'docs/getting-started-mcp.md',
  'docs/migration-v1-to-v2.md',
]) {
  const text = readText(relativePath);
  if (!text.includes(REQUIRED_INSTALL_LINE)) {
    fail(`${relativePath} missing exact ${REQUIRED_INSTALL_LINE} install text`);
  }
  if (text.includes('repo-nav@beta')) {
    fail(`${relativePath} must not reference repo-nav@beta`);
  }
  if (/npm (?:i|install) -g repo-nav@(?!1\.1\.0\b)\S+/u.test(text)) {
    fail(`${relativePath} contains a conflicting versioned install command`);
  }
  if (/npm (?:i|install) -g repo-nav(?:\s|`|$)/u.test(text)) {
    fail(`${relativePath} contains an unpinned install command`);
  }
}
const security = readText('SECURITY.md');
if (!/\|\s*1\.x\s*\|\s*supported\s*\|/u.test(security)) {
  fail('SECURITY.md must list 1.x as supported');
}
if (!/\|\s*<1\.0\s*\|\s*unsupported\s*\|/u.test(security)) {
  fail('SECURITY.md must list <1.0 as unsupported');
}
if (security.includes('0.2.0-beta.x') || security.includes('< 0.2.0')) {
  fail('SECURITY.md must not reference obsolete beta support range');
}
const supportRows =
  security.match(/^\|\s*[^|]+\|\s*(?:supported|unsupported)\s*\|$/gmu) ?? [];
if (
  supportRows.length !== 2 ||
  !supportRows.some((row) => /\|\s*1\.x\s*\|\s*supported\s*\|/u.test(row)) ||
  !supportRows.some((row) => /\|\s*<1\.0\s*\|\s*unsupported\s*\|/u.test(row))
) {
  fail('SECURITY.md contains conflicting support rows');
}

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
