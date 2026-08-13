#!/usr/bin/env node
/**
 * Install pinned host tools required by the full unit/MCP suite on CI.
 * Does not rely on runner image preinstalls.
 * Set GITHUB_TOKEN so @vscode/ripgrep postinstall can authenticate GitHub API downloads.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RIPGREP_SPEC = '@vscode/ripgrep@1.15.9';
const CODEGRAPH_SPEC = '@colbymchenry/codegraph@1.1.6';
const toolsRoot = resolve(
  process.env.RUNNER_TEMP ?? resolve(homedir(), '.repo-nav-ci-tools'),
  'repo-nav-host-tools',
);

/**
 * Locate npm-cli.js next to the current Node installation.
 * @returns {string}
 */
function resolveNpmCli() {
  const candidates = [
    resolve(fileURLToPath(import.meta.url), '../../../../'),
    resolve(process.execPath, '..'),
    resolve(process.execPath, '../..'),
    resolve(process.execPath, '../lib'),
    resolve(process.execPath, '../../lib'),
  ];
  for (const root of candidates) {
    const npmCli = resolve(root, 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (existsSync(npmCli)) {
      return npmCli;
    }
  }
  // setup-node / official Node layouts
  const fallback = [
    resolve(process.execPath, '../node_modules/npm/bin/npm-cli.js'),
    resolve(process.execPath, '../../lib/node_modules/npm/bin/npm-cli.js'),
  ];
  for (const candidate of fallback) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'unable to resolve npm-cli.js from current Node installation',
  );
}

/**
 * Run node+npm-cli and fail closed on nonzero exit.
 * @param {readonly string[]} args
 * @param {NodeJS.ProcessEnv} [env]
 */
function runNpm(args, env = process.env) {
  const result = spawnSync(process.execPath, [resolveNpmCli(), ...args], {
    cwd: toolsRoot,
    env,
    encoding: 'utf8',
    shell: false,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`npm ${args.join(' ')} failed with ${result.status}`);
  }
}

mkdirSync(toolsRoot, { recursive: true });
runNpm([
  'install',
  '--no-save',
  '--no-package-lock',
  '--no-fund',
  '--no-audit',
  RIPGREP_SPEC,
  CODEGRAPH_SPEC,
]);

const binDir = resolve(toolsRoot, 'node_modules', '.bin');
const ripgrepBin = resolve(
  toolsRoot,
  'node_modules',
  '@vscode',
  'ripgrep',
  'bin',
);
const pathParts = [binDir, ripgrepBin, process.env.PATH ?? ''].filter(
  (part) => part.length > 0,
);
const nextPath = pathParts.join(delimiter);

if (
  typeof process.env.GITHUB_PATH === 'string' &&
  process.env.GITHUB_PATH.length > 0
) {
  appendFileSync(process.env.GITHUB_PATH, `${binDir}\n${ripgrepBin}\n`, 'utf8');
}

process.env.PATH = nextPath;

const rgName = process.platform === 'win32' ? 'rg.exe' : 'rg';
const rgPath = resolve(ripgrepBin, rgName);
if (!existsSync(rgPath)) {
  throw new Error(`ripgrep binary missing at ${rgPath}`);
}

const rgProbe = spawnSync(rgPath, ['--version'], {
  encoding: 'utf8',
  shell: false,
});
if (rgProbe.status !== 0) {
  throw new Error(`rg --version failed: ${rgProbe.stderr || rgProbe.stdout}`);
}
process.stdout.write(
  `installed ripgrep: ${(rgProbe.stdout || '').split(/\r?\n/u)[0]}\n`,
);

const codegraphShim = resolve(
  toolsRoot,
  'node_modules',
  '@colbymchenry',
  'codegraph',
  'npm-shim.js',
);
if (!existsSync(codegraphShim)) {
  throw new Error(`codegraph shim missing at ${codegraphShim}`);
}
const codegraphProbe = spawnSync(
  process.execPath,
  [codegraphShim, '--version'],
  {
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, PATH: nextPath },
  },
);
if (codegraphProbe.status !== 0) {
  throw new Error(
    `codegraph --version failed: ${codegraphProbe.stderr || codegraphProbe.stdout}`,
  );
}
process.stdout.write(
  `installed codegraph: ${(codegraphProbe.stdout || '').trim()}\n`,
);
