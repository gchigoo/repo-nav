import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstatSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  closeSync,
  fstatSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const GIT_ENV_KEYS = new Set([
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_CONFIG',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_NOSYSTEM',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_SYSTEM',
  'GIT_CONFIG_VALUE_0',
  'GIT_DIR',
  'GIT_INDEX_FILE',
  'GIT_NAMESPACE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_WORK_TREE',
]);

function toPosix(value) {
  return value.split(sep).join('/');
}

function hashBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function runGit(repositoryRoot, args, env = gitEnv()) {
  const result = spawnSync('git', ['-C', repositoryRoot, ...args], {
    encoding: 'utf8',
    env,
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error('real-consumer git authority probe failed');
  }
  return result.stdout.trim();
}

function readPinnedRegularFile(path) {
  const handle = openSync(path, 'r');
  try {
    const stat = fstatSync(handle);
    if (!stat.isFile()) {
      throw new Error('real-consumer authority is not a regular file');
    }
    return readFileSync(handle);
  } finally {
    closeSync(handle);
  }
}

function walkWorktree(root, directory, gitDir, entries) {
  for (const name of readdirSync(directory).sort()) {
    const absolute = join(directory, name);
    const resolved = resolve(absolute);
    if (resolved === gitDir || resolved.startsWith(`${gitDir}${sep}`)) {
      continue;
    }
    const stat = lstatSync(absolute, { bigint: true });
    const path = toPosix(relative(root, absolute));
    const mode = Number(stat.mode & 0o7777n);
    if (stat.isDirectory()) {
      entries.push({ path, type: 'directory', mode });
      walkWorktree(root, absolute, gitDir, entries);
      continue;
    }
    if (stat.isFile()) {
      entries.push({
        path,
        type: 'file',
        mode,
        size: Number(stat.size),
        sha256: hashBytes(readPinnedRegularFile(absolute)),
      });
      continue;
    }
    if (stat.isSymbolicLink()) {
      const target = readlinkSync(absolute);
      entries.push({
        path,
        type: 'symlink',
        mode,
        size: Buffer.byteLength(target),
        sha256: hashBytes(target),
      });
      continue;
    }
    throw new Error('real-consumer worktree contains unsupported node type');
  }
}

export function gitEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) =>
        value !== undefined && !GIT_ENV_KEYS.has(key.toUpperCase()),
    ),
  );
}

export function resolveGitIndexAbsolute(repositoryRoot, env = gitEnv()) {
  return resolve(
    runGit(
      repositoryRoot,
      ['rev-parse', '--path-format=absolute', '--git-path', 'index'],
      env,
    ),
  );
}

export function captureWorktreeSnapshot(repositoryRoot) {
  const root = resolve(repositoryRoot);
  const gitDir = resolve(
    runGit(root, ['rev-parse', '--path-format=absolute', '--absolute-git-dir']),
  );
  const entries = [];
  walkWorktree(root, root, gitDir, entries);
  return {
    entries,
    treeSha256: hashBytes(JSON.stringify(entries)),
  };
}

export function captureGitState(repositoryRoot) {
  const root = resolve(repositoryRoot);
  const indexPath = resolveGitIndexAbsolute(root);
  return {
    branch: runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    headSha: runGit(root, ['rev-parse', 'HEAD']),
    indexPath,
    indexSha256: hashBytes(readPinnedRegularFile(indexPath)),
  };
}

export function captureRepositoryState(repositoryRoot) {
  const git = captureGitState(repositoryRoot);
  const worktree = captureWorktreeSnapshot(repositoryRoot);
  return {
    ...git,
    worktreeTreeSha256: worktree.treeSha256,
    worktreeEntryCount: worktree.entries.length,
  };
}

export function assertRepositoryStateUnchanged(before, after) {
  if (!isPlainObject(before) || !isPlainObject(after)) {
    throw new Error('repository state changed');
  }
  const keys = [
    'branch',
    'headSha',
    'indexPath',
    'indexSha256',
    'worktreeTreeSha256',
    'worktreeEntryCount',
  ];
  if (
    Object.keys(before).length !== keys.length ||
    Object.keys(after).length !== keys.length ||
    keys.some((key) => before[key] !== after[key])
  ) {
    throw new Error('repository state changed');
  }
}

export async function runWithRepositoryStateGuard(
  repositoryRoot,
  before,
  operation,
) {
  let value;
  let operationError;
  let operationFailed = false;
  try {
    value = await operation();
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }

  let after;
  try {
    after = captureRepositoryState(repositoryRoot);
    assertRepositoryStateUnchanged(before, after);
  } catch (error) {
    if (error?.message === 'repository state changed') {
      throw new Error('owner-confirmed repository changed during execution');
    }
    throw new Error('owner repository after-state could not be measured');
  }

  if (operationFailed) {
    throw operationError;
  }
  return { value, after };
}

export function assertSnapshotUnchanged(before, after) {
  if (before?.treeSha256 !== after?.treeSha256) {
    throw new Error('worktree before/after snapshot mismatch');
  }
}
