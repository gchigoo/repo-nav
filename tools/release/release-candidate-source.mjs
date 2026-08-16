import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';

import { strictCompact } from './design-revision.mjs';

export const RELEASE_CANDIDATE_SOURCE_PATHS_V1 =
  'testkit/manifests/release-v2/release-candidate-source-paths-v1.json';

function compareOrdinalV1(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertStrictKeys(value, expected, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (actual.join(',') !== required.join(',')) {
    throw new Error(`${label} keys mismatch`);
  }
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} JSON parse failed`);
  }
}

function normalizeSourcePathV1(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\\') ||
    posix.isAbsolute(value) ||
    value
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error('release candidate source path invalid');
  }
  return value;
}

function collectSourceFileEntriesV1(root, authorityPath) {
  const authorityBytes = readFileSync(authorityPath);
  const manifest = parseJson(
    authorityBytes.toString('utf8'),
    'release candidate source paths',
  );
  assertStrictKeys(manifest, ['schemaVersion', 'paths'], 'source paths');
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.paths)) {
    throw new Error('release candidate source paths schema invalid');
  }
  const paths = manifest.paths.map(normalizeSourcePathV1);
  if (new Set(paths).size !== paths.length) {
    throw new Error('release candidate source paths contain duplicates');
  }
  const sortedPaths = [...paths].sort();
  for (let index = 1; index < sortedPaths.length; index += 1) {
    const parent = sortedPaths[index - 1];
    const child = sortedPaths[index];
    if (child.startsWith(`${parent}/`)) {
      throw new Error('release candidate source paths overlap');
    }
  }
  const entries = [];
  const visit = (absolute, relativePath) => {
    const status = lstatSync(absolute);
    if (status.isSymbolicLink()) {
      throw new Error(
        `release candidate source path is a symlink: ${relativePath}`,
      );
    }
    if (status.isDirectory()) {
      for (const name of readdirSync(absolute).sort()) {
        visit(join(absolute, name), posix.join(relativePath, name));
      }
      return;
    }
    if (!status.isFile()) {
      throw new Error(
        `release candidate source path is not regular: ${relativePath}`,
      );
    }
    const bytes = readFileSync(absolute);
    entries.push(
      Object.freeze({
        path: relativePath,
        byteLength: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      }),
    );
  };
  for (const relativePath of paths) {
    visit(join(root, ...relativePath.split('/')), relativePath);
  }
  entries.sort((left, right) => compareOrdinalV1(left.path, right.path));
  return Object.freeze(entries);
}

export function computeReleaseCandidateSourceDigestV1(root) {
  const rootReal = realpathSync.native(resolve(root));
  const authorityPath = join(
    rootReal,
    ...RELEASE_CANDIDATE_SOURCE_PATHS_V1.split('/'),
  );
  const authorityStatus = lstatSync(authorityPath);
  if (authorityStatus.isSymbolicLink() || !authorityStatus.isFile()) {
    throw new Error(
      'release candidate source paths manifest must be a regular file',
    );
  }
  const entries = collectSourceFileEntriesV1(rootReal, authorityPath);
  const body = Object.freeze({
    schemaVersion: 1,
    algorithm: 'sha256-path-length-bytes-v1',
    entries,
  });
  const sourceSha256 = createHash('sha256')
    .update(Buffer.from(strictCompact(body), 'utf8'))
    .digest('hex');
  return Object.freeze({ ...body, sourceSha256 });
}
