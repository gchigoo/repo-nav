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

const modulePath = fileURLToPath(import.meta.url);
const moduleDirectory = dirname(modulePath);
const repositoryRoot = resolve(moduleDirectory, '..', '..');

function isDirectExecution() {
  return (
    process.argv[1] !== undefined && resolve(process.argv[1]) === modulePath
  );
}

if (
  isDirectExecution() &&
  process.env['REPO_NAV_PLATFORM_TSX_ACTIVE'] !== '1'
) {
  const relaunch = spawnSync(
    process.execPath,
    ['--import', 'tsx', modulePath, ...process.argv.slice(2)],
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
const { buildSyntheticExtensionSnapshotV1, listSyntheticExtensionMutationsV1 } =
  await import(
    pathToFileURL(
      resolve(
        repositoryRoot,
        'testkit/fixtures/platform/registry-extension-mutations.ts',
      ),
    ).href
  );
const { validatePlatformBatchResult } = await import(
  pathToFileURL(resolve(repositoryRoot, 'testkit/testing/platform-contract.ts'))
    .href
);

export function resolveNpmInvocation() {
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

export function defaultCommandRunner(command) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command.executable, command.args, {
      cwd: command.cwd,
      env: { ...process.env, ...command.env },
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (signal !== null) {
        rejectPromise(new Error(`${command.executable} killed by ${signal}`));
        return;
      }
      resolvePromise(code ?? 1);
    });
  });
}

function parsePrivateResult(raw) {
  const parsed = JSON.parse(raw);
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

function readPrivateResult(path) {
  if (!existsSync(path)) {
    throw new Error(`missing private platform result at ${path}`);
  }
  return parsePrivateResult(readFileSync(path, 'utf8'));
}

function readCapturedPrivateResult(resultPath, capturePath) {
  if (!existsSync(capturePath)) {
    return readPrivateResult(resultPath);
  }
  const snapshots = readFileSync(capturePath, 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => parsePrivateResult(JSON.parse(line)));
  if (snapshots.length === 0) {
    return readPrivateResult(resultPath);
  }
  return {
    registeredOwners: sortStrings([
      ...new Set(snapshots.flatMap((snapshot) => snapshot.registeredOwners)),
    ]),
    assertions: snapshots.flatMap((snapshot) => snapshot.assertions),
    evidence: snapshots.flatMap((snapshot) => snapshot.evidence),
  };
}

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function assertDeepExactStrings(actual, expected, label) {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `${label} mismatch: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`,
    );
  }
}

function identityArgsForBindings(bindings) {
  return bindings.flatMap((binding) => [
    '--identity',
    `${binding.group}/${binding.executableCaseId}`,
  ]);
}

function appendNodeImportOption(existing, hookPath) {
  const option = `--import=${pathToFileURL(hookPath).href}`;
  return existing === undefined || existing.length === 0
    ? option
    : `${existing} ${option}`;
}

function writeResultCaptureHook(hookPath) {
  writeFileSync(
    hookPath,
    `import fs from 'node:fs';\n` +
      `import { resolve } from 'node:path';\n` +
      `import { syncBuiltinESMExports } from 'node:module';\n` +
      `const originalWriteFileSync = fs.writeFileSync;\n` +
      `const resultPath = resolve(process.env.REPO_NAV_PLATFORM_RESULT_PATH ?? '');\n` +
      `const capturePath = process.env.REPO_NAV_PLATFORM_RESULT_CAPTURE_PATH;\n` +
      `fs.writeFileSync = function patchedWriteFileSync(path, data, options) {\n` +
      `  if (capturePath !== undefined && resolve(String(path)) === resultPath) {\n` +
      `    const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);\n` +
      `    originalWriteFileSync.call(fs, capturePath, JSON.stringify(text) + '\\n', { flag: 'a' });\n` +
      `  }\n` +
      `  return originalWriteFileSync.apply(fs, arguments);\n` +
      `};\n` +
      `syncBuiltinESMExports();\n`,
    'utf8',
  );
}

function groupBindingsBySurface(bindings, os) {
  const grouped = {
    unit: [],
    mcp: [],
  };
  for (const binding of bindings) {
    if (!binding.applicableOs.includes(os)) {
      continue;
    }
    grouped[binding.surface].push(binding);
  }
  return [
    { surface: 'unit', bindings: grouped.unit },
    { surface: 'mcp', bindings: grouped.mcp },
  ].filter((group) => group.bindings.length > 0);
}

function assertSummaryContractIds(summaries, bindings, surface) {
  assertDeepExactStrings(
    summaries.map((summary) => summary.contractId),
    sortStrings(bindings.map((binding) => binding.contractId)),
    `platform summaries(${surface})`,
  );
}

async function executeSurfaceGroup(input) {
  const tempDirectory = mkdtempSync(
    resolve(tmpdir(), 'repo-nav-platform-result-'),
  );
  const resultPath = resolve(tempDirectory, 'private-result.json');
  const capturePath = resolve(tempDirectory, 'private-result-captures.ndjson');
  const hookPath = resolve(tempDirectory, 'capture-platform-result.mjs');
  writeResultCaptureHook(hookPath);
  try {
    const script = input.surface === 'unit' ? 'test' : 'test:mcp:built';
    const npm = input.resolveNpm();
    const args = [
      ...npm.prefixArgs,
      'run',
      script,
      '--',
      ...identityArgsForBindings(input.bindings),
    ];
    const code = await input.commandRunner({
      executable: npm.executable,
      args,
      cwd: repositoryRoot,
      env: {
        NODE_OPTIONS: appendNodeImportOption(
          process.env['NODE_OPTIONS'],
          hookPath,
        ),
        REPO_NAV_PLATFORM_RESULT_CAPTURE_PATH: capturePath,
        REPO_NAV_PLATFORM_RESULT_PATH: resultPath,
        REPO_NAV_REPOSITORY_ROOT: repositoryRoot,
      },
    });
    if (code !== 0) {
      throw new Error(
        `runner failed for ${input.surface} platform contracts (${input.bindings
          .map((binding) => binding.contractId)
          .join(', ')}) exit=${code}`,
      );
    }
    const privateResult = readCapturedPrivateResult(resultPath, capturePath);
    const summaries = input.validateBatchResult({
      bindings: input.bindings,
      privateResult,
      markerOwners: input.markerOwners,
      evidenceOwners: input.evidenceOwners,
    });
    assertSummaryContractIds(summaries, input.bindings, input.surface);
    return summaries;
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

function selectBindings(snapshot, contracts) {
  if (contracts.length === 0) {
    return snapshot.bindings;
  }
  const selected = snapshot.bindings.filter((binding) =>
    contracts.includes(binding.contractId),
  );
  if (selected.length !== contracts.length) {
    throw new Error('one or more --contract ids are unknown');
  }
  return selected;
}

function buildSafeSummary(identity, summaries) {
  const os = identity.platform;
  return {
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
}

function writeSafeSummary(safeSummary) {
  const outputDirectory = resolve(repositoryRoot, 'test-artifacts', 'platform');
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    resolve(outputDirectory, 'safe-summary.json'),
    `${JSON.stringify(safeSummary, null, 2)}\n`,
    'utf8',
  );
}

function runSelfTest() {
  const repository = createFilesystemPlatformContractRepository(repositoryRoot);
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

export async function runPlatformContracts(argv = [], options = {}) {
  const args = parseArgs(argv);
  const repository = createFilesystemPlatformContractRepository(repositoryRoot);
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
    return { mode: 'runtime-probe', cell };
  }

  if (args.selfTest) {
    runSelfTest();
    return { mode: 'self-test' };
  }

  const identity = options.runtimeIdentity ?? probeRuntimeIdentity();
  if (
    identity.platform !== 'linux' &&
    identity.platform !== 'win32' &&
    identity.platform !== 'darwin'
  ) {
    throw new Error(`unsupported platform ${identity.platform}`);
  }
  const selected = selectBindings(snapshot, args.contracts);
  const surfaceGroups = groupBindingsBySurface(selected, identity.platform);
  const summaries = [];
  for (const group of surfaceGroups) {
    summaries.push(
      ...(await executeSurfaceGroup({
        surface: group.surface,
        bindings: group.bindings,
        markerOwners: snapshot.markerOwners,
        evidenceOwners: snapshot.evidenceHashOwners,
        commandRunner: options.commandRunner ?? defaultCommandRunner,
        resolveNpm: options.resolveNpm ?? resolveNpmInvocation,
        validateBatchResult:
          options.validateBatchResult ?? validatePlatformBatchResult,
      })),
    );
  }

  const safeSummary = buildSafeSummary(identity, summaries);
  if (options.writeSummary !== false) {
    writeSafeSummary(safeSummary);
  }
  return { mode: 'contracts', safeSummary, summaries };
}

async function main() {
  const result = await runPlatformContracts(process.argv.slice(2));
  if (result.mode === 'runtime-probe') {
    process.stdout.write(
      `${JSON.stringify({ ok: true, cell: result.cell }, null, 2)}\n`,
    );
    return;
  }
  if (result.mode === 'self-test') {
    process.stdout.write('platform contract self-test passed\n');
    return;
  }
  process.stdout.write(
    `platform contracts passed: ${
      result.safeSummary.contracts.join(', ') || '(none applicable)'
    }\n`,
  );
}

if (isDirectExecution()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
