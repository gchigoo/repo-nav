/**
 * Package dry-run / smoke against positive allowlist and size budgets.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  requireReleaseBuildCapabilityV1,
  requireReleaseBuildReceiptV1,
} from './build-receipt.mjs';
import {
  RELEASE_CANDIDATE_DIRECTORY_V1,
  computeReleaseCandidateSourceDigestV1,
  createReleaseCandidateStageV1,
  installReleaseCandidateV1,
  loadReleaseCandidateV1,
  publishReleaseCandidateStageV1,
  withReleaseCandidateLockV1,
  writeReleaseCandidateManifestV1,
} from './release-candidate.mjs';
import { RELEASE_BOUNDARIES_V1 } from './release-boundaries-v1.mjs';

const modulePath = fileURLToPath(import.meta.url);
const root = resolve(dirname(modulePath), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');

function fail(message) {
  throw new Error(message);
}

function run(repositoryRoot, npmExecutable, args, opts = {}) {
  const result = spawnSync(process.execPath, [npmExecutable, ...args], {
    cwd: opts.cwd ?? repositoryRoot,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, ...(opts.env ?? {}) },
  });
  if (
    result.error !== undefined ||
    result.signal !== null ||
    result.status !== 0
  ) {
    fail(result.stderr || result.stdout || `npm ${args.join(' ')} failed`);
  }
  return result.stdout;
}

export function inspectReleasePackV1(repositoryRoot, npmExecutable) {
  const parsed = JSON.parse(
    run(repositoryRoot, npmExecutable, ['pack', '--dry-run', '--json']),
  );
  const info = Array.isArray(parsed) ? parsed[0] : parsed;
  const entryCount = info.entryCount ?? info.files?.length ?? 0;
  const packed = info.size ?? 0;
  const unpacked = info.unpackedSize ?? 0;
  if (entryCount > RELEASE_BOUNDARIES_V1.packageEntries) {
    fail(`entryCount ${entryCount} exceeds budget`);
  }
  if (packed > RELEASE_BOUNDARIES_V1.packedBytes) {
    fail(`packed ${packed} exceeds budget`);
  }
  if (unpacked > RELEASE_BOUNDARIES_V1.unpackedBytes) {
    fail(`unpacked ${unpacked} exceeds budget`);
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
  const files = (info.files ?? []).map((file) => file.path ?? file);
  for (const file of files) {
    const normalized = String(file).replace(/\\/g, '/');
    if (
      forbidden.some(
        (prefix) =>
          normalized === prefix.slice(0, -1) || normalized.startsWith(prefix),
      )
    ) {
      fail(`forbidden path in tarball: ${normalized}`);
    }
    if (normalized.endsWith('.map')) {
      fail(`map forbidden: ${normalized}`);
    }
  }
  return Object.freeze({ info, entryCount, packed, unpacked });
}

export function materializeReleaseCandidateV1(input) {
  const repositoryRoot = realpathSync.native(resolve(input.root));
  const npmExecutable = resolve(input.npmCli);
  return withReleaseCandidateLockV1(repositoryRoot, (lock) => {
    const sourceBefore = computeReleaseCandidateSourceDigestV1(repositoryRoot);
    const buildBefore = requireReleaseBuildCapabilityV1(
      input.buildCapability,
      repositoryRoot,
    );
    if (buildBefore.sourceSha256 !== sourceBefore.sourceSha256) {
      fail('release candidate build capability source mismatch');
    }
    const inspection = inspectReleasePackV1(repositoryRoot, npmExecutable);
    const sourceAfter = computeReleaseCandidateSourceDigestV1(repositoryRoot);
    const buildAfterInspection = requireReleaseBuildCapabilityV1(
      input.buildCapability,
      repositoryRoot,
    );
    if (
      sourceBefore.sourceSha256 !== sourceAfter.sourceSha256 ||
      buildBefore.outputSha256 !== buildAfterInspection.outputSha256 ||
      buildBefore.receiptSha256 !== buildAfterInspection.receiptSha256
    ) {
      fail('release candidate source or build output changed during pack');
    }
    const stage = createReleaseCandidateStageV1(repositoryRoot, lock);
    try {
      const parsedPackInfo = JSON.parse(
        run(repositoryRoot, npmExecutable, [
          'pack',
          '--json',
          '--pack-destination',
          stage,
        ]),
      );
      const packInfo = Array.isArray(parsedPackInfo)
        ? parsedPackInfo[0]
        : parsedPackInfo;
      const buildPacked = requireReleaseBuildCapabilityV1(
        input.buildCapability,
        repositoryRoot,
      );
      if (
        buildPacked.sourceSha256 !== sourceBefore.sourceSha256 ||
        buildPacked.outputSha256 !== buildBefore.outputSha256 ||
        buildPacked.receiptSha256 !== buildBefore.receiptSha256
      ) {
        fail('release candidate source or build output changed during pack');
      }
      const tgz = join(stage, packInfo.filename);
      writeReleaseCandidateManifestV1({
        root: repositoryRoot,
        lock,
        buildCapability: input.buildCapability,
        tarballPath: tgz,
        allowedDirectory: stage,
        publishedTarballPath: join(
          repositoryRoot,
          RELEASE_CANDIDATE_DIRECTORY_V1,
          packInfo.filename,
        ),
        manifestPath: join(stage, 'candidate-v1.json'),
        packInfo,
      });
      requireReleaseBuildCapabilityV1(input.buildCapability, repositoryRoot);
      publishReleaseCandidateStageV1(repositoryRoot, stage, lock);
    } catch (error) {
      rmSync(stage, { recursive: true, force: true });
      throw error;
    }
    const candidate = loadReleaseCandidateV1(repositoryRoot, npmExecutable, {
      lock,
    });
    return Object.freeze({ ...candidate, inspection });
  });
}

function spawnChecked(command, args, options, label) {
  const result = spawnSync(command, args, options);
  if (
    result.error !== undefined ||
    result.signal !== null ||
    result.status !== 0
  ) {
    fail(result.stderr || result.stdout || label);
  }
  return result;
}

export function runReleaseCandidateSmokeV1(
  repositoryRoot,
  npmExecutable,
  candidate,
) {
  const artifacts = join(repositoryRoot, 'test-artifacts');
  mkdirSync(artifacts, { recursive: true });
  const temp = mkdtempSync(join(artifacts, 'release-smoke-consumer-'));
  try {
    const installed = installReleaseCandidateV1({
      root: repositoryRoot,
      npmCli: npmExecutable,
      candidate,
      consumerRoot: temp,
      consumerName: 'smoke-consumer',
    });
    const legacyImport = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        "import('repo-nav/legacy-v1').then(()=>process.exit(1),error=>{if(error?.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED'){console.error(error);process.exit(2)}})",
      ],
      { encoding: 'utf8', shell: false, cwd: temp },
    );
    if (legacyImport.status !== 0 || legacyImport.signal !== null) {
      fail(
        legacyImport.stderr ||
          legacyImport.stdout ||
          'installed legacy-v1 subpath unexpectedly resolved',
      );
    }

    writeFileSync(
      join(temp, 'legacy-v1-import.ts'),
      "import 'repo-nav/legacy-v1';\n",
      'utf8',
    );
    writeFileSync(
      join(temp, 'tsconfig.json'),
      `${JSON.stringify(
        {
          compilerOptions: {
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            noEmit: true,
            noUncheckedSideEffectImports: true,
            strict: true,
          },
          files: ['legacy-v1-import.ts'],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    const legacyTypecheck = spawnSync(
      process.execPath,
      [
        join(repositoryRoot, 'node_modules/typescript/bin/tsc'),
        '-p',
        'tsconfig.json',
      ],
      { encoding: 'utf8', shell: false, cwd: temp },
    );
    if (legacyTypecheck.status === 0 || legacyTypecheck.signal !== null) {
      fail('installed legacy-v1 subpath unexpectedly resolved in NodeNext');
    }

    const installedCli = join(
      installed.installedPackageRoot,
      'dist/cli/main.js',
    );
    const help = spawnChecked(
      process.execPath,
      [installedCli, '--help'],
      { encoding: 'utf8', shell: false, cwd: temp },
      'repo-nav --help failed',
    );
    if (!String(help.stdout).includes('repo-nav debug')) {
      fail('repo-nav --help missing expected banner');
    }

    const fixtureRoot = join(temp, 'closed-stdin-fixture');
    mkdirSync(fixtureRoot, { recursive: true });
    writeFileSync(
      join(fixtureRoot, 'README.md'),
      'closed stdin smoke fixture\n',
    );
    const closedStdinOptions = {
      encoding: 'utf8',
      shell: false,
      cwd: temp,
      stdio: ['ignore', 'pipe', 'pipe'],
    };
    const probe = spawnChecked(
      process.execPath,
      [installedCli, 'debug', 'probe', '--repo', fixtureRoot],
      closedStdinOptions,
      'repo-nav debug probe failed',
    );
    if (probe.stderr !== '') {
      fail('repo-nav debug probe wrote to stderr');
    }
    let probeOutput;
    try {
      probeOutput = JSON.parse(probe.stdout);
    } catch {
      fail('repo-nav debug probe returned invalid JSON');
    }
    if (
      probeOutput?.schemaVersion !== '1.0' ||
      probeOutput?.repositoryRootRedacted !== '<repository-root>' ||
      !Array.isArray(probeOutput?.backends)
    ) {
      fail('repo-nav debug probe returned invalid output');
    }

    const locate = spawnChecked(
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
      'repo-nav debug locate failed',
    );
    if (locate.stderr !== '') {
      fail('repo-nav debug locate wrote to stderr');
    }
    let locateOutput;
    try {
      locateOutput = JSON.parse(locate.stdout);
    } catch {
      fail('repo-nav debug locate returned invalid JSON');
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
      fail('repo-nav debug locate returned an invalid closed-stdin outcome');
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function directModeV1(argv) {
  if (argv.includes('--ensure-candidate')) return 'ensure-candidate';
  if (argv.includes('--smoke')) return 'smoke';
  return 'dry-run';
}

function runDirectV1() {
  const mode = directModeV1(process.argv.slice(2));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (pkg.private !== false) {
    fail('private must be false for public beta');
  }
  let candidate;
  let inspection;
  if (mode === 'dry-run') {
    requireReleaseBuildReceiptV1(root);
    inspection = inspectReleasePackV1(root, npmCli);
  } else {
    candidate = loadReleaseCandidateV1(root, npmCli);
    inspection = Object.freeze({
      entryCount: candidate.entryCount,
      packed: candidate.packedBytes,
      unpacked: candidate.unpackedBytes,
    });
    if (mode === 'smoke') {
      runReleaseCandidateSmokeV1(root, npmCli, candidate);
    }
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        mode,
        entryCount: inspection.entryCount,
        packed: inspection.packed,
        unpacked: inspection.unpacked,
        version: pkg.version,
        private: false,
        ...(candidate === undefined
          ? {}
          : {
              tarballPath: candidate.tarballPath,
              tarballSha256: candidate.tarballSha256,
              sourceSha256: candidate.sourceSha256,
              buildOutputSha256: candidate.buildOutputSha256,
              buildReceiptSha256: candidate.buildReceiptSha256,
              designRevisionSha256: candidate.designRevisionSha256,
            }),
      },
      null,
      2,
    )}\n`,
  );
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  realpathSync.native(resolve(entryPath)) === realpathSync.native(modulePath)
) {
  try {
    runDirectV1();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
