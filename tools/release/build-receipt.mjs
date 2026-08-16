import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { strictCompact } from './design-revision.mjs';
import { computeReleaseCandidateSourceDigestV1 } from './release-candidate-source.mjs';

export const RELEASE_BUILD_RECEIPT_V1 = 'dist/.repo-nav-build-receipt-v1.json';
export const RELEASE_BUILD_RECEIPT_AUTHORITY_V1 =
  'single-process-clean-pinned-typescript-build+candidate-source-digest+dist-digest-v1';

const HEX64 = /^[0-9a-f]{64}$/u;
const releaseBuildCapabilitiesV1 = new WeakMap();

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

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertPathInside(parent, child) {
  const resolvedParent = resolve(parent);
  const resolvedChild = resolve(child);
  if (
    resolvedChild !== resolvedParent &&
    !resolvedChild.startsWith(`${resolvedParent}${sep}`)
  ) {
    throw new Error('release build output escaped repository root');
  }
}

function trustedRepositoryRootV1(root) {
  return realpathSync.native(resolve(root));
}

function trustedDistDirectoryV1(root) {
  const rootReal = trustedRepositoryRootV1(root);
  const dist = join(rootReal, 'dist');
  let status;
  try {
    status = lstatSync(dist);
  } catch {
    throw new Error('release build output is missing');
  }
  if (status.isSymbolicLink() || !status.isDirectory()) {
    throw new Error('release build output must be a trusted directory');
  }
  const distReal = realpathSync.native(dist);
  if (distReal !== join(rootReal, 'dist')) {
    throw new Error('release build output directory identity mismatch');
  }
  assertPathInside(rootReal, distReal);
  return Object.freeze({ root: rootReal, dist: distReal });
}

function cleanReleaseBuildOutputV1(root) {
  const rootReal = trustedRepositoryRootV1(root);
  const dist = join(rootReal, 'dist');
  if (!existsSync(dist)) {
    return rootReal;
  }
  const status = lstatSync(dist);
  if (status.isSymbolicLink() || !status.isDirectory()) {
    throw new Error('release build output must be a trusted directory');
  }
  const distReal = realpathSync.native(dist);
  if (distReal !== dist) {
    throw new Error('release build output directory identity mismatch');
  }
  assertPathInside(rootReal, distReal);
  rmSync(distReal, { recursive: true, force: false });
  return rootReal;
}

function collectBuildOutputEntriesV1(dist) {
  const entries = [];
  const visit = (absolute, relativePath) => {
    const status = lstatSync(absolute);
    if (status.isSymbolicLink()) {
      throw new Error(`release build output is a symlink: ${relativePath}`);
    }
    if (status.isDirectory()) {
      for (const name of readdirSync(absolute).sort()) {
        const childPath =
          relativePath === '' ? name : posix.join(relativePath, name);
        visit(join(absolute, name), childPath);
      }
      return;
    }
    if (!status.isFile()) {
      throw new Error(
        `release build output is not a regular file: ${relativePath}`,
      );
    }
    if (relativePath === '.repo-nav-build-receipt-v1.json') {
      return;
    }
    const bytes = readFileSync(absolute);
    entries.push(
      Object.freeze({
        path: relativePath,
        byteLength: bytes.byteLength,
        sha256: sha256(bytes),
      }),
    );
  };
  visit(dist, '');
  entries.sort((left, right) => compareOrdinalV1(left.path, right.path));
  if (entries.length === 0) {
    throw new Error('release build output is empty');
  }
  return Object.freeze(entries);
}

export function computeReleaseBuildOutputDigestV1(root) {
  const trusted = trustedDistDirectoryV1(root);
  const entries = collectBuildOutputEntriesV1(trusted.dist);
  const body = Object.freeze({
    schemaVersion: 1,
    algorithm: 'sha256-path-length-bytes-v1',
    entries,
  });
  const outputSha256 = sha256(Buffer.from(strictCompact(body), 'utf8'));
  return Object.freeze({ ...body, outputSha256 });
}

function validateReleaseBuildReceiptV1(receipt) {
  assertStrictKeys(
    receipt,
    [
      'schemaVersion',
      'authority',
      'typescriptVersion',
      'sourceSha256',
      'outputSha256',
    ],
    'release build receipt',
  );
  if (
    receipt.schemaVersion !== 1 ||
    receipt.authority !== RELEASE_BUILD_RECEIPT_AUTHORITY_V1 ||
    typeof receipt.typescriptVersion !== 'string' ||
    receipt.typescriptVersion.length === 0 ||
    typeof receipt.sourceSha256 !== 'string' ||
    !HEX64.test(receipt.sourceSha256) ||
    typeof receipt.outputSha256 !== 'string' ||
    !HEX64.test(receipt.outputSha256)
  ) {
    throw new Error('release build receipt is invalid');
  }
  return receipt;
}

function requirePinnedTypeScriptCompilerV1(root) {
  const rootReal = trustedRepositoryRootV1(root);
  const packageJson = parseJson(
    readFileSync(join(rootReal, 'package.json'), 'utf8'),
    'package.json',
  );
  const declaredVersion = packageJson?.devDependencies?.typescript;
  if (
    typeof declaredVersion !== 'string' ||
    !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u.test(declaredVersion)
  ) {
    throw new Error('release build requires an exact TypeScript version');
  }
  const installedPackagePath = join(
    rootReal,
    'node_modules',
    'typescript',
    'package.json',
  );
  const installedPackageStatus = lstatSync(installedPackagePath);
  if (
    installedPackageStatus.isSymbolicLink() ||
    !installedPackageStatus.isFile()
  ) {
    throw new Error('release build TypeScript package metadata is untrusted');
  }
  const installedPackageReal = realpathSync.native(installedPackagePath);
  const installedPackage = parseJson(
    readFileSync(installedPackageReal, 'utf8'),
    'installed TypeScript package.json',
  );
  if (installedPackage.version !== declaredVersion) {
    throw new Error('release build TypeScript version mismatch');
  }
  const compilerPath = join(dirname(installedPackageReal), 'bin', 'tsc');
  const compilerStatus = lstatSync(compilerPath);
  if (compilerStatus.isSymbolicLink() || !compilerStatus.isFile()) {
    throw new Error('release build TypeScript compiler is untrusted');
  }
  return Object.freeze({
    compilerPath: realpathSync.native(compilerPath),
    typescriptVersion: declaredVersion,
  });
}

function runTypeScriptBuildV1(root, compilerPath) {
  const result = spawnSync(
    process.execPath,
    [compilerPath, '-p', 'tsconfig.build.json'],
    {
      cwd: root,
      encoding: 'utf8',
      shell: false,
    },
  );
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.signal !== null || result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || 'release TypeScript build failed',
    );
  }
}

function writeReleaseBuildReceiptV1(root, typescriptVersion, snapshot) {
  const trusted = trustedDistDirectoryV1(root);
  if (
    !isPlainObject(snapshot) ||
    typeof snapshot.sourceSha256 !== 'string' ||
    !HEX64.test(snapshot.sourceSha256) ||
    typeof snapshot.outputSha256 !== 'string' ||
    !HEX64.test(snapshot.outputSha256)
  ) {
    throw new Error('release build snapshot is invalid');
  }
  const receipt = Object.freeze({
    schemaVersion: 1,
    authority: RELEASE_BUILD_RECEIPT_AUTHORITY_V1,
    typescriptVersion,
    sourceSha256: snapshot.sourceSha256,
    outputSha256: snapshot.outputSha256,
  });
  const path = join(trusted.root, ...RELEASE_BUILD_RECEIPT_V1.split('/'));
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  writeFileSync(path, bytes, {
    flag: 'wx',
    mode: 0o600,
  });
  return Object.freeze({ ...receipt, receiptSha256: sha256(bytes), path });
}

function removeReleaseBuildReceiptV1(written) {
  try {
    const status = lstatSync(written.path);
    if (status.isSymbolicLink() || !status.isFile()) return;
    const bytes = readFileSync(written.path);
    if (sha256(bytes) === written.receiptSha256) {
      rmSync(written.path, { force: false });
    }
  } catch {
    // The failed build remains fail closed if cleanup loses a filesystem race.
  }
}

export function requireReleaseBuildReceiptV1(root) {
  const trusted = trustedDistDirectoryV1(root);
  const path = join(trusted.root, ...RELEASE_BUILD_RECEIPT_V1.split('/'));
  let status;
  try {
    status = lstatSync(path);
  } catch {
    throw new Error('release build receipt is missing');
  }
  if (status.isSymbolicLink() || !status.isFile()) {
    throw new Error('release build receipt must be a regular file');
  }
  const bytes = readFileSync(path);
  const receipt = validateReleaseBuildReceiptV1(
    parseJson(bytes.toString('utf8'), 'release build receipt'),
  );
  const compiler = requirePinnedTypeScriptCompilerV1(trusted.root);
  if (receipt.typescriptVersion !== compiler.typescriptVersion) {
    throw new Error('release build receipt TypeScript version mismatch');
  }
  const source = computeReleaseCandidateSourceDigestV1(trusted.root);
  if (receipt.sourceSha256 !== source.sourceSha256) {
    throw new Error('release build receipt source digest mismatch');
  }
  const output = computeReleaseBuildOutputDigestV1(trusted.root);
  if (receipt.outputSha256 !== output.outputSha256) {
    throw new Error('release build receipt output digest mismatch');
  }
  return Object.freeze({
    ...receipt,
    receiptSha256: sha256(bytes),
    path,
  });
}

export function requireReleaseBuildCapabilityV1(capability, root) {
  if (
    (typeof capability !== 'object' || capability === null) &&
    typeof capability !== 'function'
  ) {
    throw new Error('release build capability missing');
  }
  const record = releaseBuildCapabilitiesV1.get(capability);
  if (record === undefined) {
    throw new Error('release build capability invalid');
  }
  const rootReal = trustedRepositoryRootV1(root);
  if (record.root !== rootReal) {
    throw new Error('release build capability repository mismatch');
  }
  const receipt = requireReleaseBuildReceiptV1(rootReal);
  for (const key of [
    'typescriptVersion',
    'sourceSha256',
    'outputSha256',
    'receiptSha256',
  ]) {
    if (record[key] !== receipt[key]) {
      throw new Error(`release build capability ${key} mismatch`);
    }
  }
  return receipt;
}

export function executeReleaseBuildV1(root, operation) {
  if (typeof operation !== 'function') {
    throw new Error('release build operation must be a function');
  }
  const rootReal = trustedRepositoryRootV1(root);
  const sourceBefore = computeReleaseCandidateSourceDigestV1(rootReal);
  const compiler = requirePinnedTypeScriptCompilerV1(rootReal);
  cleanReleaseBuildOutputV1(rootReal);
  runTypeScriptBuildV1(rootReal, compiler.compilerPath);

  const compilerOutput = computeReleaseBuildOutputDigestV1(rootReal);
  const sourceAfter = computeReleaseCandidateSourceDigestV1(rootReal);
  if (sourceAfter.sourceSha256 !== sourceBefore.sourceSha256) {
    throw new Error('release candidate source changed during TypeScript build');
  }
  const verifiedOutput = computeReleaseBuildOutputDigestV1(rootReal);
  if (verifiedOutput.outputSha256 !== compilerOutput.outputSha256) {
    throw new Error('release build output changed before receipt');
  }

  const written = writeReleaseBuildReceiptV1(
    rootReal,
    compiler.typescriptVersion,
    {
      sourceSha256: sourceBefore.sourceSha256,
      outputSha256: compilerOutput.outputSha256,
    },
  );
  let receipt;
  try {
    receipt = requireReleaseBuildReceiptV1(rootReal);
    if (
      receipt.sourceSha256 !== sourceBefore.sourceSha256 ||
      receipt.outputSha256 !== compilerOutput.outputSha256 ||
      receipt.receiptSha256 !== written.receiptSha256
    ) {
      throw new Error('release build receipt snapshot mismatch');
    }
  } catch (error) {
    removeReleaseBuildReceiptV1(written);
    throw error;
  }

  const capability = Object.freeze({});
  releaseBuildCapabilitiesV1.set(
    capability,
    Object.freeze({
      root: rootReal,
      typescriptVersion: receipt.typescriptVersion,
      sourceSha256: receipt.sourceSha256,
      outputSha256: receipt.outputSha256,
      receiptSha256: receipt.receiptSha256,
    }),
  );
  try {
    const result = operation(capability, receipt);
    if (result !== null && typeof result === 'object' && 'then' in result) {
      throw new Error('release build operation must be synchronous');
    }
    requireReleaseBuildCapabilityV1(capability, rootReal);
    return Object.freeze({ receipt, result });
  } finally {
    releaseBuildCapabilitiesV1.delete(capability);
  }
}

const modulePath = fileURLToPath(import.meta.url);
const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  realpathSync.native(resolve(modulePath)) ===
    realpathSync.native(resolve(entryPath))
) {
  process.stderr.write(
    'build-receipt.mjs is a library; run npm run build for a clean TypeScript build\n',
  );
  process.exitCode = 1;
}
