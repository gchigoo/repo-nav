import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(moduleDirectory, '..', '..');

if (process.env['REPO_NAV_PLATFORM_TSX_ACTIVE'] !== '1') {
  const relaunch = spawnSync(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      cwd: repositoryRoot,
      env: { ...process.env, REPO_NAV_PLATFORM_TSX_ACTIVE: '1' },
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  process.exit(relaunch.status ?? 1);
}

const {
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
  assertRuntimeMatchesCell,
  createFilesystemPlatformContractRepository,
  ensureRunnerSelectionsCoverPlatformCases,
  probeRuntimeIdentity,
  validatePlatformContractSnapshotV1,
  validateProductionPlatformContractSnapshotV1,
} = await import(
  pathToFileURL(
    resolve(repositoryRoot, 'testkit/contracts/platform-contract.ts'),
  ).href
);
const {
  buildSyntheticExtensionSnapshotV1,
  listSyntheticExtensionMutationsV1,
} = await import(
  pathToFileURL(
    resolve(
      repositoryRoot,
      'testkit/fixtures/platform/registry-extension-mutations.ts',
    ),
  ).href
);

function resolveNpmInvocation() {
  // Node 20+ rejects spawning *.cmd with shell:false (EINVAL on Windows).
  // Invoke the JS CLI through node to keep shell:false on every platform.
  const npmCliCandidates = [
    resolve(repositoryRoot, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    resolve(
      dirname(process.execPath),
      'node_modules',
      'npm',
      'bin',
      'npm-cli.js',
    ),
  ];
  const npmCli = npmCliCandidates.find((candidate) => existsSync(candidate));
  if (npmCli !== undefined) {
    return { executable: process.execPath, prefixArgs: [npmCli] };
  }
  return {
    executable: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    prefixArgs: [],
  };
}

function parseArgs(argv) {
  const contracts = [];
  let selfTest = false;
  let runtimeProbe = false;
  let cellId;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--self-test') {
      selfTest = true;
      continue;
    }
    if (flag === '--runtime-probe') {
      runtimeProbe = true;
      continue;
    }
    if (flag === '--cell') {
      cellId = argv[index + 1];
      index += 1;
      continue;
    }
    if (flag === '--contract') {
      contracts.push(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`unsupported argument: ${flag}`);
  }
  return { contracts, selfTest, runtimeProbe, cellId };
}

function runCommand(executable, args, env = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      cwd: repositoryRoot,
      env: { ...process.env, ...env },
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (signal !== null) {
        rejectPromise(new Error(`${executable} killed by ${signal}`));
        return;
      }
      resolvePromise(code ?? 1);
    });
  });
}

function readPrivateResult(path) {
  if (!existsSync(path)) {
    throw new Error(`missing private platform result at ${path}`);
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray(parsed.assertions) ||
    !Array.isArray(parsed.evidence) ||
    !Array.isArray(parsed.registeredOwners)
  ) {
    throw new Error('invalid private platform runner result');
  }
  return parsed;
}

function sortUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function assertDeepExact(actual, expected, label) {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `${label} mismatch: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`,
    );
  }
}

async function executeBinding(binding, markerOwners, evidenceOwners) {
  const tempDirectory = mkdtempSync(
    resolve(tmpdir(), 'repo-nav-platform-result-'),
  );
  const resultPath = resolve(tempDirectory, 'private-result.json');
  try {
    const script = binding.surface === 'unit' ? 'test' : 'test:mcp';
    const npm = resolveNpmInvocation();
    const code = await runCommand(
      npm.executable,
      [
        ...npm.prefixArgs,
        'run',
        script,
        '--',
        '--group',
        binding.group,
        '--case',
        binding.executableCaseId,
      ],
      {
        REPO_NAV_PLATFORM_RESULT_PATH: resultPath,
        REPO_NAV_REPOSITORY_ROOT: repositoryRoot,
      },
    );
    if (code !== 0) {
      throw new Error(
        `runner failed for ${binding.contractId} (${binding.surface}/${binding.group}/${binding.executableCaseId}) exit=${code}`,
      );
    }
    const privateResult = readPrivateResult(resultPath);
    const expectedOwners = sortUnique([
      binding.assertionOwner,
      ...markerOwners
        .filter((owner) => owner.contractId === binding.contractId)
        .map((owner) => owner.assertionOwner),
      ...evidenceOwners
        .filter((owner) => owner.contractId === binding.contractId)
        .map((owner) => owner.evidenceOwner),
    ]);
    assertDeepExact(
      sortUnique(privateResult.registeredOwners),
      expectedOwners,
      `registeredOwners(${binding.contractId})`,
    );

    const passedMarkers = privateResult.assertions.filter(
      (entry) => entry.status === 'passed',
    );
    const expectedAssertionIds = [...binding.requiredAssertionIds].sort();
    const actualAssertionIds = sortUnique(
      passedMarkers.map((entry) => entry.assertionId),
    );
    assertDeepExact(
      actualAssertionIds,
      expectedAssertionIds,
      `passedAssertionIds(${binding.contractId})`,
    );
    if (passedMarkers.length !== binding.requiredAssertionIds.length) {
      throw new Error(
        `duplicate or missing passed markers for ${binding.contractId}`,
      );
    }
    for (const marker of passedMarkers) {
      if (marker.contractId !== binding.contractId) {
        throw new Error(
          `unexpected contract marker ${marker.contractId} while running ${binding.contractId}`,
        );
      }
      const declared = markerOwners.find(
        (owner) =>
          owner.contractId === marker.contractId &&
          owner.assertionId === marker.assertionId,
      );
      if (declared === undefined) {
        throw new Error(
          `undeclared marker ${marker.contractId}/${marker.assertionId}`,
        );
      }
      if (marker.actualOwner !== declared.assertionOwner) {
        throw new Error(
          `actualOwner mismatch for ${marker.contractId}/${marker.assertionId}: declared ${declared.assertionOwner} actual ${marker.actualOwner}`,
        );
      }
    }

    const expectedEvidenceIds = [...binding.requiredEvidenceHashIds].sort();
    const actualEvidenceIds = sortUnique(
      privateResult.evidence.map((entry) => entry.evidenceId),
    );
    assertDeepExact(
      actualEvidenceIds,
      expectedEvidenceIds,
      `evidenceIds(${binding.contractId})`,
    );
    for (const evidence of privateResult.evidence) {
      if (evidence.contractId !== binding.contractId) {
        throw new Error(
          `unexpected evidence contract ${evidence.contractId}`,
        );
      }
      if (!/^[0-9a-f]{64}$/u.test(evidence.sha256)) {
        throw new Error(
          `invalid evidence hash for ${evidence.contractId}/${evidence.evidenceId}`,
        );
      }
      const declared = evidenceOwners.find(
        (owner) =>
          owner.contractId === evidence.contractId &&
          owner.evidenceId === evidence.evidenceId,
      );
      if (declared === undefined) {
        throw new Error(
          `undeclared evidence ${evidence.contractId}/${evidence.evidenceId}`,
        );
      }
      if (evidence.actualOwner !== declared.evidenceOwner) {
        throw new Error(
          `evidence actualOwner mismatch for ${evidence.contractId}/${evidence.evidenceId}`,
        );
      }
    }

    return {
      contractId: binding.contractId,
      passedAssertionMarkers: passedMarkers.map((entry) => ({
        contractId: entry.contractId,
        assertionId: entry.assertionId,
      })),
      contractEvidenceHashes: privateResult.evidence.map((entry) => ({
        contractId: entry.contractId,
        evidenceId: entry.evidenceId,
        sha256: entry.sha256,
      })),
    };
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

function runSelfTest() {
  const repository =
    createFilesystemPlatformContractRepository(repositoryRoot);
  validateProductionPlatformContractSnapshotV1(
    PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
    repository,
  );
  ensureRunnerSelectionsCoverPlatformCases();

  const synthetic = buildSyntheticExtensionSnapshotV1();
  validatePlatformContractSnapshotV1(
    SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
    synthetic,
    repository,
  );

  for (const mutation of listSyntheticExtensionMutationsV1()) {
    let failed = false;
    try {
      validatePlatformContractSnapshotV1(
        mutation.expectedIds,
        mutation.snapshot,
        repository,
      );
    } catch {
      failed = true;
    }
    if (!failed) {
      throw new Error(
        `synthetic mutation ${mutation.id} unexpectedly passed validation`,
      );
    }
  }

  const osCoverage = {
    linux: new Set(),
    win32: new Set(),
    darwin: new Set(),
  };
  for (const binding of PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.bindings) {
    for (const os of binding.applicableOs) {
      osCoverage[os].add(binding.contractId);
    }
  }
  for (const os of ['linux', 'win32', 'darwin']) {
    if (osCoverage[os].size === 0) {
      throw new Error(`no bindings applicable on ${os}`);
    }
  }
  if (
    !osCoverage.linux.has('F4-PATH-002') ||
    !osCoverage.darwin.has('F4-PATH-002')
  ) {
    throw new Error('F4-PATH-002 must cover linux and darwin');
  }
  if (!osCoverage.win32.has('F4-PATH-003')) {
    throw new Error('F4-PATH-003 must cover win32');
  }
  if (
    osCoverage.win32.has('F4-PATH-002') ||
    osCoverage.linux.has('F4-PATH-003')
  ) {
    throw new Error('PATH OS applicability inverted');
  }

  mkdirSync(resolve(repositoryRoot, 'test-artifacts', 'platform'), {
    recursive: true,
  });
  writeFileSync(
    resolve(repositoryRoot, 'test-artifacts', 'platform', 'self-test.json'),
    `${JSON.stringify({ ok: true, schemaVersion: 1 }, null, 2)}\n`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository =
    createFilesystemPlatformContractRepository(repositoryRoot);
  const validated = validateProductionPlatformContractSnapshotV1(
    PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
    repository,
  );
  const snapshot = validated.snapshot;

  if (args.runtimeProbe) {
    if (typeof args.cellId !== 'string') {
      throw new Error('--runtime-probe requires --cell');
    }
    const cell = assertRuntimeMatchesCell(args.cellId);
    process.stdout.write(`${JSON.stringify({ ok: true, cell }, null, 2)}\n`);
    return;
  }

  if (args.selfTest) {
    runSelfTest();
    process.stdout.write('platform contract self-test passed\n');
    return;
  }

  const identity = probeRuntimeIdentity();
  if (
    identity.platform !== 'linux' &&
    identity.platform !== 'win32' &&
    identity.platform !== 'darwin'
  ) {
    throw new Error(`unsupported platform ${identity.platform}`);
  }
  const os = identity.platform;
  const selected =
    args.contracts.length === 0
      ? snapshot.bindings
      : snapshot.bindings.filter((binding) =>
          args.contracts.includes(binding.contractId),
        );
  if (args.contracts.length > 0 && selected.length !== args.contracts.length) {
    throw new Error('one or more --contract ids are unknown');
  }

  const summaries = [];
  for (const binding of selected) {
    if (!binding.applicableOs.includes(os)) {
      continue;
    }
    const summary = await executeBinding(
      binding,
      snapshot.markerOwners,
      snapshot.evidenceHashOwners,
    );
    summaries.push(summary);
  }

  const safeSummary = {
    schemaVersion: 1,
    os,
    nodeMajor: identity.nodeMajor,
    arch: identity.arch,
    contracts: summaries.map((entry) => entry.contractId).sort(),
    passedAssertionMarkers: summaries
      .flatMap((entry) => entry.passedAssertionMarkers)
      .sort(
        (left, right) =>
          left.contractId.localeCompare(right.contractId) ||
          left.assertionId.localeCompare(right.assertionId),
      ),
    contractEvidenceHashes: summaries
      .flatMap((entry) => entry.contractEvidenceHashes)
      .sort(
        (left, right) =>
          left.contractId.localeCompare(right.contractId) ||
          left.evidenceId.localeCompare(right.evidenceId),
      ),
  };
  const outputDirectory = resolve(
    repositoryRoot,
    'test-artifacts',
    'platform',
  );
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    resolve(outputDirectory, 'safe-summary.json'),
    `${JSON.stringify(safeSummary, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(
    `platform contracts passed: ${safeSummary.contracts.join(', ') || '(none applicable)'}\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
