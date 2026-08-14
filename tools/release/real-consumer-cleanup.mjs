import {
  lstatSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  rmdirSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

function identity(stat) {
  return `${stat.dev}:${stat.ino}`;
}

function typeOf(stat) {
  if (stat.isDirectory()) return 'directory';
  if (stat.isFile()) return 'file';
  if (stat.isSymbolicLink()) return 'symlink';
  throw new Error('controlled tree contains an unsupported node');
}

function captureNode(path, relativePath) {
  const stat = lstatSync(path, { bigint: true });
  const type = typeOf(stat);
  return {
    path: relativePath,
    type,
    identity: identity(stat),
    mode: Number(stat.mode & 0o7777n),
    nlink: type === 'file' ? stat.nlink.toString() : null,
    symlinkTarget: type === 'symlink' ? readlinkSync(path) : null,
  };
}

function captureEntries(root) {
  const entries = [];
  const walk = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const absolute = join(directory, name);
      const relativePath = relative(root, absolute).split(sep).join('/');
      const record = captureNode(absolute, relativePath);
      entries.push(record);
      if (record.type === 'directory') {
        walk(absolute);
        const after = captureNode(absolute, relativePath);
        if (after.identity !== record.identity || after.type !== 'directory') {
          throw new Error('controlled tree changed during capture');
        }
      }
    }
  };
  walk(root);
  return entries;
}

export function captureControlledTree(rootPath) {
  const root = resolve(rootPath);
  const rootRecord = captureNode(root, '');
  if (rootRecord.type !== 'directory' || realpathSync(root) !== root) {
    throw new Error('controlled tree root is not canonical');
  }
  return {
    root,
    rootRecord,
    entries: captureEntries(root),
  };
}

function assertRecordMatches(path, record) {
  const current = captureNode(path, record.path);
  if (
    current.type !== record.type ||
    current.identity !== record.identity ||
    current.mode !== record.mode ||
    current.nlink !== record.nlink ||
    current.symlinkTarget !== record.symlinkTarget
  ) {
    throw new Error('controlled tree identity changed');
  }
}

function assertTreeMatches(record) {
  assertRecordMatches(record.root, record.rootRecord);
  if (realpathSync(record.root) !== record.root) {
    throw new Error('controlled tree root changed');
  }
  const currentEntries = captureEntries(record.root);
  if (currentEntries.length !== record.entries.length) {
    throw new Error('controlled tree topology changed');
  }
  for (let index = 0; index < record.entries.length; index += 1) {
    const expected = record.entries[index];
    const current = currentEntries[index];
    if (JSON.stringify(current) !== JSON.stringify(expected)) {
      throw new Error('controlled tree topology changed');
    }
  }
}

export function removeControlledTree(record) {
  assertTreeMatches(record);
  const descending = [...record.entries].sort((left, right) => {
    const depth = (value) => value.path.split('/').length;
    return depth(right) - depth(left) || right.path.localeCompare(left.path);
  });
  for (const entry of descending) {
    const absolute = join(record.root, ...entry.path.split('/'));
    assertRecordMatches(absolute, entry);
    if (entry.type === 'directory') {
      rmdirSync(absolute);
    } else {
      rmSync(absolute);
    }
  }
  assertRecordMatches(record.root, record.rootRecord);
  rmdirSync(record.root);
  try {
    lstatSync(record.root);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  throw new Error('controlled tree removal could not be verified');
}
