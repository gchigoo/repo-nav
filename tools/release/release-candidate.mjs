import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  copyFileSync,
  existsSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import {
  requireReleaseBuildCapabilityV1,
  requireReleaseBuildReceiptV1,
} from './build-receipt.mjs';
import {
  computeReleaseDesignRevisionV1,
  strictCompact,
} from './design-revision.mjs';
import { computeReleaseCandidateSourceDigestV1 } from './release-candidate-source.mjs';

export {
  RELEASE_CANDIDATE_SOURCE_PATHS_V1,
  computeReleaseCandidateSourceDigestV1,
} from './release-candidate-source.mjs';

const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const INTEGRITY = /^sha512-[A-Za-z0-9+/]+={0,2}$/u;
const SEMVER =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;
const LOCK_TOKEN = /^[0-9a-f]{32}$/u;
const CANONICAL_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export const RELEASE_CANDIDATE_DIRECTORY_V1 =
  'test-artifacts/release-candidate';
export const RELEASE_CANDIDATE_MANIFEST_V1 = `${RELEASE_CANDIDATE_DIRECTORY_V1}/candidate-v1.json`;
export const RELEASE_CANDIDATE_LOCK_V1 =
  'test-artifacts/release-candidate.lock';
export const RELEASE_CANDIDATE_BUILD_AUTHORITY_V1 =
  'single-process-clean-typescript-build+receipt+source-output-pack-digests-v1';

const RELEASE_CANDIDATE_LOCK_WAIT_MS_V1 = 300_000;
const RELEASE_CANDIDATE_LOCK_STALE_MS_V1 = 600_000;
const RELEASE_CANDIDATE_LOCK_POLL_MS_V1 = 50;
const releaseCandidateLockWaitV1 = new Int32Array(new SharedArrayBuffer(4));

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

function runNpm(root, npmCli, args, cwd = root) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd,
    encoding: 'utf8',
    shell: false,
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.signal !== null || result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || `npm ${args.join(' ')} failed`,
    );
  }
  return result.stdout;
}

function parsePackInfo(stdout, label) {
  const parsed = parseJson(stdout, label);
  const info = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!isPlainObject(info)) {
    throw new Error(`${label} must contain one pack record`);
  }
  for (const key of ['name', 'version', 'filename', 'shasum', 'integrity']) {
    if (typeof info[key] !== 'string' || info[key].length === 0) {
      throw new Error(`${label}.${key} must be nonempty string`);
    }
  }
  for (const key of ['size', 'unpackedSize', 'entryCount']) {
    if (!Number.isSafeInteger(info[key]) || info[key] < 0) {
      throw new Error(`${label}.${key} must be nonnegative integer`);
    }
  }
  if (!SEMVER.test(info.version)) {
    throw new Error(`${label}.version must be semver`);
  }
  if (!HEX40.test(info.shasum)) {
    throw new Error(`${label}.shasum must be lowercase SHA-1`);
  }
  if (!INTEGRITY.test(info.integrity)) {
    throw new Error(`${label}.integrity must be sha512 SRI`);
  }
  return info;
}

function fileDigestsV1(path) {
  const bytes = readFileSync(path);
  return Object.freeze({
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sha1: createHash('sha1').update(bytes).digest('hex'),
    integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    size: bytes.byteLength,
  });
}

function assertPathInside(parent, child) {
  const resolvedParent = resolve(parent);
  const resolvedChild = resolve(child);
  if (
    resolvedChild !== resolvedParent &&
    !resolvedChild.startsWith(`${resolvedParent}${sep}`)
  ) {
    throw new Error('release candidate path escaped candidate directory');
  }
}

function trustedArtifactsDirectoryV1(root) {
  const rootReal = realpathSync.native(resolve(root));
  const artifacts = join(rootReal, 'test-artifacts');
  if (existsSync(artifacts)) {
    const status = lstatSync(artifacts);
    if (status.isSymbolicLink() || !status.isDirectory()) {
      throw new Error('release artifacts directory is not a trusted directory');
    }
  } else {
    mkdirSync(artifacts, { recursive: false, mode: 0o700 });
  }
  const artifactsReal = realpathSync.native(artifacts);
  assertPathInside(rootReal, artifactsReal);
  return artifactsReal;
}

function trustedDirectoryV1(path, parent, label) {
  let status;
  try {
    status = lstatSync(path);
  } catch {
    throw new Error(`${label} is missing`);
  }
  if (status.isSymbolicLink() || !status.isDirectory()) {
    throw new Error(`${label} is not a trusted directory`);
  }
  const real = realpathSync.native(path);
  assertPathInside(parent, real);
  return real;
}

function trustedRegularFileV1(path, parent, label) {
  let status;
  try {
    status = lstatSync(path);
  } catch {
    throw new Error(`${label} is missing`);
  }
  if (status.isSymbolicLink() || !status.isFile()) {
    throw new Error(`${label} must be a regular file`);
  }
  const real = realpathSync.native(path);
  assertPathInside(parent, real);
  return Object.freeze({ path: real, status });
}

function requireUnchangedRegularFileV1(file, label) {
  const current = lstatSync(file.path);
  if (
    current.isSymbolicLink() ||
    !current.isFile() ||
    current.dev !== file.status.dev ||
    current.ino !== file.status.ino ||
    current.size !== file.status.size ||
    current.mtimeMs !== file.status.mtimeMs ||
    current.ctimeMs !== file.status.ctimeMs
  ) {
    throw new Error(`${label} changed during validation`);
  }
  return Object.freeze({
    dev: current.dev,
    ino: current.ino,
    size: current.size,
    mtimeMs: current.mtimeMs,
    ctimeMs: current.ctimeMs,
  });
}

function candidateDirectory(root) {
  return join(resolve(root), RELEASE_CANDIDATE_DIRECTORY_V1);
}

function candidateManifestPath(root) {
  return join(resolve(root), RELEASE_CANDIDATE_MANIFEST_V1);
}

function currentPackInfo(root, npmCli) {
  return parsePackInfo(
    runNpm(root, npmCli, ['pack', '--dry-run', '--json']),
    'npm pack dry-run',
  );
}

function processIsAliveV1(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Reflect.get(error, 'code') === 'EPERM';
  }
}

function parseLockRecordV1(path) {
  const value = parseJson(readFileSync(path, 'utf8'), 'release candidate lock');
  assertStrictKeys(
    value,
    ['pid', 'token', 'acquiredAt'],
    'release candidate lock',
  );
  if (
    !Number.isSafeInteger(value.pid) ||
    value.pid < 1 ||
    typeof value.token !== 'string' ||
    !LOCK_TOKEN.test(value.token) ||
    typeof value.acquiredAt !== 'string' ||
    !CANONICAL_TIMESTAMP.test(value.acquiredAt) ||
    Number.isNaN(Date.parse(value.acquiredAt)) ||
    new Date(value.acquiredAt).toISOString() !== value.acquiredAt
  ) {
    throw new Error('release candidate lock record invalid');
  }
  return value;
}

function claimObservedReleaseCandidateLockForRecoveryV1(
  lockPath,
  observedStatus,
  observedToken,
) {
  const recoveryPath = `${lockPath}.recovery-${observedStatus.dev}-${observedStatus.ino}`;
  try {
    mkdirSync(recoveryPath, { mode: 0o700 });
  } catch (error) {
    if (Reflect.get(error, 'code') === 'EEXIST') {
      return false;
    }
    throw error;
  }
  try {
    let currentStatus;
    try {
      currentStatus = lstatSync(lockPath);
    } catch {
      return true;
    }
    if (
      currentStatus.dev !== observedStatus.dev ||
      currentStatus.ino !== observedStatus.ino
    ) {
      return false;
    }
    if (observedToken !== undefined) {
      let currentRecord;
      try {
        currentRecord = parseLockRecordV1(lockPath);
      } catch {
        return false;
      }
      if (currentRecord.token !== observedToken) {
        return false;
      }
    }
    const quarantine = `${lockPath}.stale-${randomBytes(8).toString('hex')}`;
    renameSync(lockPath, quarantine);
    const quarantinedStatus = lstatSync(quarantine);
    if (
      quarantinedStatus.dev !== observedStatus.dev ||
      quarantinedStatus.ino !== observedStatus.ino
    ) {
      throw new Error('release candidate stale lock identity changed');
    }
    rmSync(quarantine, { recursive: true, force: true });
    return true;
  } finally {
    rmSync(recoveryPath, { recursive: true, force: true });
  }
}

function recoverStaleReleaseCandidateLockV1(lockPath) {
  let status;
  try {
    status = lstatSync(lockPath);
  } catch {
    return true;
  }
  if (status.isSymbolicLink() || !status.isFile()) {
    return claimObservedReleaseCandidateLockForRecoveryV1(
      lockPath,
      status,
      undefined,
    );
  }
  let record;
  try {
    record = parseLockRecordV1(lockPath);
  } catch {
    return claimObservedReleaseCandidateLockForRecoveryV1(
      lockPath,
      status,
      undefined,
    );
  }
  const age = Date.now() - Date.parse(record.acquiredAt);
  if (
    age <= RELEASE_CANDIDATE_LOCK_STALE_MS_V1 ||
    processIsAliveV1(record.pid)
  ) {
    return false;
  }
  return claimObservedReleaseCandidateLockForRecoveryV1(
    lockPath,
    status,
    record.token,
  );
}

function tryAcquireReleaseCandidateLockV1(root) {
  const artifacts = trustedArtifactsDirectoryV1(root);
  const lockPath = join(artifacts, 'release-candidate.lock');
  const token = randomBytes(16).toString('hex');
  const pendingPath = join(
    artifacts,
    `.release-candidate.lock-${process.pid}-${token}.tmp`,
  );
  let fd;
  let status;
  let published = false;
  try {
    fd = openSync(pendingPath, 'wx', 0o600);
    const acquiredAt = new Date().toISOString();
    writeFileSync(
      fd,
      `${JSON.stringify({ pid: process.pid, token, acquiredAt })}\n`,
      'utf8',
    );
    fsyncSync(fd);
    status = fstatSync(fd);
    try {
      linkSync(pendingPath, lockPath);
      published = true;
    } catch (error) {
      if (Reflect.get(error, 'code') === 'EEXIST') {
        closeSync(fd);
        fd = undefined;
        unlinkSync(pendingPath);
        recoverStaleReleaseCandidateLockV1(lockPath);
        return null;
      }
      throw error;
    }
    unlinkSync(pendingPath);
    return Object.freeze({
      lockPath,
      token,
      fd,
      dev: status.dev,
      ino: status.ino,
    });
  } catch (error) {
    if (published && status !== undefined) {
      try {
        const lockStatus = lstatSync(lockPath);
        if (lockStatus.dev === status.dev && lockStatus.ino === status.ino) {
          unlinkSync(lockPath);
        }
      } catch {
        // Best-effort cleanup after a failed atomic lock publish.
      }
    }
    rmSync(pendingPath, { force: true });
    if (fd !== undefined) closeSync(fd);
    throw error;
  }
}

function releaseReleaseCandidateLockV1(lock) {
  try {
    const status = lstatSync(lock.lockPath);
    const record = parseLockRecordV1(lock.lockPath);
    if (
      status.isSymbolicLink() ||
      !status.isFile() ||
      status.dev !== lock.dev ||
      status.ino !== lock.ino ||
      record.token !== lock.token
    ) {
      return;
    }
    unlinkSync(lock.lockPath);
  } finally {
    closeSync(lock.fd);
  }
}

function assertOwnedReleaseCandidateLockV1(lock) {
  if (!isPlainObject(lock) || typeof lock.token !== 'string') {
    throw new Error('release candidate writer lock missing');
  }
  const status = lstatSync(lock.lockPath);
  const record = parseLockRecordV1(lock.lockPath);
  if (
    status.isSymbolicLink() ||
    !status.isFile() ||
    status.dev !== lock.dev ||
    status.ino !== lock.ino ||
    record.token !== lock.token
  ) {
    throw new Error('release candidate writer lock ownership mismatch');
  }
}

export function withReleaseCandidateLockV1(root, operation) {
  const deadline = Date.now() + RELEASE_CANDIDATE_LOCK_WAIT_MS_V1;
  while (Date.now() <= deadline) {
    const lock = tryAcquireReleaseCandidateLockV1(root);
    if (lock === null) {
      Atomics.wait(
        releaseCandidateLockWaitV1,
        0,
        0,
        RELEASE_CANDIDATE_LOCK_POLL_MS_V1,
      );
      continue;
    }
    try {
      const result = operation(lock);
      if (result !== null && typeof result === 'object' && 'then' in result) {
        throw new Error('release candidate lock operation must be synchronous');
      }
      return result;
    } finally {
      releaseReleaseCandidateLockV1(lock);
    }
  }
  throw new Error('timed out waiting for release candidate lock');
}

function writeReleaseCandidateManifestUnlockedV1(input) {
  assertOwnedReleaseCandidateLockV1(input.lock);
  const root = realpathSync.native(resolve(input.root));
  const build = requireReleaseBuildCapabilityV1(input.buildCapability, root);
  const allowedDirectory = trustedDirectoryV1(
    resolve(input.allowedDirectory ?? candidateDirectory(root)),
    trustedArtifactsDirectoryV1(root),
    'release candidate write directory',
  );
  const tarball = trustedRegularFileV1(
    resolve(input.tarballPath),
    allowedDirectory,
    'release candidate tarball',
  );
  const publishedTarballPath =
    input.publishedTarballPath === undefined
      ? tarball.path
      : resolve(input.publishedTarballPath);
  const publishedDirectory = candidateDirectory(root);
  assertPathInside(publishedDirectory, publishedTarballPath);
  const pkg = parseJson(
    readFileSync(join(root, 'package.json'), 'utf8'),
    'package.json',
  );
  const pack = parsePackInfo(JSON.stringify(input.packInfo), 'npm pack');
  if (pack.name !== pkg.name || pack.version !== pkg.version) {
    throw new Error('packed candidate identity mismatch');
  }
  if (pack.filename !== publishedTarballPath.split(sep).at(-1)) {
    throw new Error('packed candidate filename mismatch');
  }
  const actual = fileDigestsV1(tarball.path);
  if (
    actual.sha1 !== pack.shasum ||
    actual.integrity !== pack.integrity ||
    actual.size !== pack.size
  ) {
    throw new Error('packed candidate digest or size mismatch');
  }
  const source = computeReleaseCandidateSourceDigestV1(root);
  if (source.sourceSha256 !== build.sourceSha256) {
    throw new Error('release candidate source changed during pack');
  }
  const design = computeReleaseDesignRevisionV1({ root, requireClean: false });
  const manifest = {
    schemaVersion: 1,
    candidate: {
      name: pack.name,
      version: pack.version,
      filename: pack.filename,
      tarballPath: relative(root, publishedTarballPath).split(sep).join('/'),
      tarballSha256: actual.sha256,
      packShasum: actual.sha1,
      packIntegrity: actual.integrity,
      entryCount: pack.entryCount,
      packedBytes: actual.size,
      unpackedBytes: pack.unpackedSize,
      sourceSha256: source.sourceSha256,
      buildSourceSha256: build.sourceSha256,
      buildOutputSha256: build.outputSha256,
      buildReceiptSha256: build.receiptSha256,
      designRevisionSha256: design.designRevisionSha256,
      buildAuthority: RELEASE_CANDIDATE_BUILD_AUTHORITY_V1,
    },
  };
  const manifestPath = resolve(
    input.manifestPath ?? candidateManifestPath(root),
  );
  assertPathInside(allowedDirectory, manifestPath);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
  return Object.freeze({
    ...manifest.candidate,
    absoluteTarballPath: tarball.path,
    manifestPath,
  });
}

export function writeReleaseCandidateManifestV1(input) {
  if (input.lock !== undefined) {
    return writeReleaseCandidateManifestUnlockedV1(input);
  }
  return withReleaseCandidateLockV1(input.root, (lock) =>
    writeReleaseCandidateManifestUnlockedV1({ ...input, lock }),
  );
}

export function createReleaseCandidateStageV1(root, lock) {
  assertOwnedReleaseCandidateLockV1(lock);
  const artifacts = trustedArtifactsDirectoryV1(root);
  return mkdtempSync(join(artifacts, '.release-candidate-stage-'));
}

export function publishReleaseCandidateStageV1(root, stageDirectory, lock) {
  assertOwnedReleaseCandidateLockV1(lock);
  const artifacts = trustedArtifactsDirectoryV1(root);
  const stage = trustedDirectoryV1(
    resolve(stageDirectory),
    artifacts,
    'release candidate stage',
  );
  const entries = readdirSync(stage).sort();
  if (
    entries.length !== 2 ||
    !entries.includes('candidate-v1.json') ||
    entries.filter((entry) => entry.endsWith('.tgz')).length !== 1
  ) {
    throw new Error('release candidate stage contents invalid');
  }
  const destination = join(artifacts, 'release-candidate');
  if (existsSync(destination)) {
    trustedDirectoryV1(destination, artifacts, 'release candidate directory');
  }
  const backup = join(
    artifacts,
    `.release-candidate-previous-${randomBytes(8).toString('hex')}`,
  );
  let movedPrevious = false;
  try {
    if (existsSync(destination)) {
      renameSync(destination, backup);
      movedPrevious = true;
    }
    renameSync(stage, destination);
  } catch (error) {
    if (movedPrevious && !existsSync(destination) && existsSync(backup)) {
      renameSync(backup, destination);
    }
    throw error;
  }
  if (movedPrevious) {
    rmSync(backup, { recursive: true, force: true });
  }
}

function validateCandidateDescriptorV1(candidate) {
  assertStrictKeys(
    candidate,
    [
      'name',
      'version',
      'filename',
      'tarballPath',
      'tarballSha256',
      'packShasum',
      'packIntegrity',
      'entryCount',
      'packedBytes',
      'unpackedBytes',
      'sourceSha256',
      'buildSourceSha256',
      'buildOutputSha256',
      'buildReceiptSha256',
      'designRevisionSha256',
      'buildAuthority',
    ],
    'manifest.candidate',
  );
  if (candidate.name !== 'repo-nav' || !SEMVER.test(candidate.version)) {
    throw new Error('release candidate package identity invalid');
  }
  for (const key of [
    'tarballSha256',
    'sourceSha256',
    'buildSourceSha256',
    'buildOutputSha256',
    'buildReceiptSha256',
    'designRevisionSha256',
  ]) {
    if (typeof candidate[key] !== 'string' || !HEX64.test(candidate[key])) {
      throw new Error(`release candidate ${key} invalid`);
    }
  }
  if (!HEX40.test(candidate.packShasum)) {
    throw new Error('release candidate packShasum invalid');
  }
  if (!INTEGRITY.test(candidate.packIntegrity)) {
    throw new Error('release candidate packIntegrity invalid');
  }
  if (candidate.buildAuthority !== RELEASE_CANDIDATE_BUILD_AUTHORITY_V1) {
    throw new Error('release candidate build authority invalid');
  }
  if (candidate.sourceSha256 !== candidate.buildSourceSha256) {
    throw new Error('release candidate build source digest mismatch');
  }
  for (const key of ['entryCount', 'packedBytes', 'unpackedBytes']) {
    if (!Number.isSafeInteger(candidate[key]) || candidate[key] < 0) {
      throw new Error(`release candidate ${key} invalid`);
    }
  }
}

function captureReleaseCandidateStateV1(rootReal, lock) {
  assertOwnedReleaseCandidateLockV1(lock);
  const artifacts = trustedArtifactsDirectoryV1(rootReal);
  const directory = trustedDirectoryV1(
    candidateDirectory(rootReal),
    artifacts,
    'release candidate directory',
  );
  const manifestFile = trustedRegularFileV1(
    candidateManifestPath(rootReal),
    directory,
    'release candidate manifest',
  );
  const manifestBytes = readFileSync(manifestFile.path);
  const manifestIdentity = requireUnchangedRegularFileV1(
    manifestFile,
    'release candidate manifest',
  );
  const manifest = parseJson(
    manifestBytes.toString('utf8'),
    'release candidate manifest',
  );
  assertStrictKeys(manifest, ['schemaVersion', 'candidate'], 'manifest');
  if (manifest.schemaVersion !== 1) {
    throw new Error('release candidate schemaVersion must be 1');
  }
  const candidate = manifest.candidate;
  validateCandidateDescriptorV1(candidate);
  const pkg = parseJson(
    readFileSync(join(rootReal, 'package.json'), 'utf8'),
    'package.json',
  );
  if (candidate.name !== pkg.name || candidate.version !== pkg.version) {
    throw new Error('release candidate does not match package.json');
  }
  const expectedTarballPath = `${RELEASE_CANDIDATE_DIRECTORY_V1}/${candidate.filename}`;
  if (candidate.tarballPath !== expectedTarballPath) {
    throw new Error('release candidate path escaped candidate directory');
  }
  const absoluteTarballPath = resolve(rootReal, candidate.tarballPath);
  const tarball = trustedRegularFileV1(
    absoluteTarballPath,
    directory,
    'release candidate tarball',
  );
  const actual = fileDigestsV1(tarball.path);
  const tarballIdentity = requireUnchangedRegularFileV1(
    tarball,
    'release candidate tarball',
  );
  if (actual.sha256 !== candidate.tarballSha256) {
    throw new Error('release candidate tarballSha256 mismatch');
  }
  if (actual.sha1 !== candidate.packShasum) {
    throw new Error('release candidate packShasum mismatch');
  }
  if (actual.integrity !== candidate.packIntegrity) {
    throw new Error('release candidate packIntegrity mismatch');
  }
  if (actual.size !== candidate.packedBytes) {
    throw new Error('release candidate packedBytes mismatch');
  }
  const build = requireReleaseBuildReceiptV1(rootReal);
  if (
    candidate.buildSourceSha256 !== build.sourceSha256 ||
    candidate.buildOutputSha256 !== build.outputSha256 ||
    candidate.buildReceiptSha256 !== build.receiptSha256
  ) {
    throw new Error('release candidate is stale: build receipt mismatch');
  }
  const source = computeReleaseCandidateSourceDigestV1(rootReal);
  if (
    candidate.sourceSha256 !== source.sourceSha256 ||
    candidate.buildSourceSha256 !== source.sourceSha256
  ) {
    throw new Error('release candidate is stale: sourceSha256 mismatch');
  }
  const design = computeReleaseDesignRevisionV1({
    root: rootReal,
    requireClean: false,
  });
  if (candidate.designRevisionSha256 !== design.designRevisionSha256) {
    throw new Error(
      'release candidate is stale: designRevisionSha256 mismatch',
    );
  }
  return Object.freeze({
    candidate: Object.freeze({ ...candidate }),
    absoluteTarballPath: tarball.path,
    manifestPath: manifestFile.path,
    fingerprint: strictCompact({
      manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
      manifestIdentity,
      tarballIdentity,
      candidate,
      buildReceiptSha256: build.receiptSha256,
      sourceSha256: source.sourceSha256,
      designRevisionSha256: design.designRevisionSha256,
    }),
  });
}

function assertCurrentPackMatchesCandidateV1(current, candidate) {
  const bindings = [
    ['name', candidate.name],
    ['version', candidate.version],
    ['filename', candidate.filename],
    ['shasum', candidate.packShasum],
    ['integrity', candidate.packIntegrity],
    ['entryCount', candidate.entryCount],
    ['size', candidate.packedBytes],
    ['unpackedSize', candidate.unpackedBytes],
  ];
  for (const [key, expected] of bindings) {
    if (current[key] !== expected) {
      throw new Error(`release candidate is stale: ${key} mismatch`);
    }
  }
}

function loadReleaseCandidateUnlockedV1(root, npmCli, lock) {
  assertOwnedReleaseCandidateLockV1(lock);
  const rootReal = realpathSync.native(resolve(root));
  const before = captureReleaseCandidateStateV1(rootReal, lock);
  const current = currentPackInfo(rootReal, npmCli);
  const after = captureReleaseCandidateStateV1(rootReal, lock);
  if (after.fingerprint !== before.fingerprint) {
    throw new Error('release candidate changed during npm pack dry-run');
  }
  assertCurrentPackMatchesCandidateV1(current, after.candidate);
  return Object.freeze({
    ...after.candidate,
    absoluteTarballPath: after.absoluteTarballPath,
    manifestPath: after.manifestPath,
  });
}

export function loadReleaseCandidateV1(root, npmCli, options = {}) {
  if (options.lock !== undefined) {
    return loadReleaseCandidateUnlockedV1(root, npmCli, options.lock);
  }
  return withReleaseCandidateLockV1(root, (lock) =>
    loadReleaseCandidateUnlockedV1(root, npmCli, lock),
  );
}

export function ensureReleaseCandidateV1(root, npmCli) {
  return loadReleaseCandidateV1(root, npmCli);
}

function sameCandidateIdentityV1(left, right) {
  return [
    'name',
    'version',
    'tarballSha256',
    'packShasum',
    'packIntegrity',
    'packedBytes',
    'sourceSha256',
    'buildSourceSha256',
    'buildOutputSha256',
    'buildReceiptSha256',
    'designRevisionSha256',
  ].every((key) => left[key] === right[key]);
}

export function installReleaseCandidateV1(input) {
  const consumerRoot = resolve(input.consumerRoot);
  rmSync(consumerRoot, { recursive: true, force: true });
  mkdirSync(consumerRoot, { recursive: true, mode: 0o700 });
  const immutableCandidate = withReleaseCandidateLockV1(input.root, (lock) => {
    const current = loadReleaseCandidateUnlockedV1(
      input.root,
      input.npmCli,
      lock,
    );
    if (!sameCandidateIdentityV1(current, input.candidate)) {
      throw new Error('release candidate changed before immutable copy');
    }
    const snapshotDirectory = join(consumerRoot, '.release-candidate');
    mkdirSync(snapshotDirectory, { recursive: false, mode: 0o700 });
    const trustedSnapshotDirectory = realpathSync.native(snapshotDirectory);
    const snapshotPath = join(trustedSnapshotDirectory, current.filename);
    const before = fileDigestsV1(current.absoluteTarballPath);
    copyFileSync(
      current.absoluteTarballPath,
      snapshotPath,
      fsConstants.COPYFILE_EXCL,
    );
    chmodSync(snapshotPath, 0o400);
    const copied = trustedRegularFileV1(
      snapshotPath,
      trustedSnapshotDirectory,
      'immutable release candidate copy',
    );
    const after = fileDigestsV1(current.absoluteTarballPath);
    const snapshot = fileDigestsV1(copied.path);
    if (
      before.sha256 !== current.tarballSha256 ||
      after.sha256 !== current.tarballSha256 ||
      snapshot.sha256 !== current.tarballSha256 ||
      snapshot.sha1 !== current.packShasum ||
      snapshot.integrity !== current.packIntegrity ||
      snapshot.size !== current.packedBytes
    ) {
      throw new Error('immutable release candidate copy digest mismatch');
    }
    return Object.freeze({ ...current, absoluteTarballPath: copied.path });
  });

  writeFileSync(
    join(consumerRoot, 'package.json'),
    `${JSON.stringify(
      { name: input.consumerName, private: true, version: '1.0.0' },
      null,
      2,
    )}\n`,
    'utf8',
  );
  runNpm(
    input.root,
    input.npmCli,
    [
      'install',
      '--prefer-offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      immutableCandidate.absoluteTarballPath,
    ],
    consumerRoot,
  );
  const finalSnapshot = fileDigestsV1(immutableCandidate.absoluteTarballPath);
  if (
    finalSnapshot.sha256 !== immutableCandidate.tarballSha256 ||
    finalSnapshot.sha1 !== immutableCandidate.packShasum ||
    finalSnapshot.integrity !== immutableCandidate.packIntegrity ||
    finalSnapshot.size !== immutableCandidate.packedBytes
  ) {
    throw new Error('immutable release candidate changed during install');
  }
  const installedPackageRoot = join(
    consumerRoot,
    'node_modules',
    immutableCandidate.name,
  );
  const installedPkg = parseJson(
    readFileSync(join(installedPackageRoot, 'package.json'), 'utf8'),
    'installed package.json',
  );
  if (
    installedPkg.name !== immutableCandidate.name ||
    installedPkg.version !== immutableCandidate.version
  ) {
    throw new Error('installed candidate identity mismatch');
  }
  return Object.freeze({
    consumerRoot,
    installedPackageRoot,
    candidate: immutableCandidate,
  });
}
