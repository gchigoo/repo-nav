import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  PLATFORM_CELLS_V1,
  PLATFORM_COMMANDS_V1,
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  applicableBindingsForOs,
  createFilesystemPlatformContractRepository,
  validateProductionPlatformContractSnapshotV1,
} = await import(
  pathToFileURL(
    resolve(repositoryRoot, 'testkit/contracts/platform-contract.ts'),
  ).href
);
const {
  buildPlatformCoreCommandReportV1,
  validatePlatformCoreCommandReportV1,
} = await import(
  pathToFileURL(
    resolve(repositoryRoot, 'testkit/contracts/platform-evidence-report.ts'),
  ).href
);

function parseArgs(argv) {
  const values = {
    selfTest: false,
    cellId: undefined,
    output: undefined,
    workflowRunId: undefined,
    runAttempt: undefined,
    workflowSha: undefined,
    sourceSha: undefined,
    eventName: undefined,
    outcomes: {},
    summaryPath: undefined,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--self-test') {
      values.selfTest = true;
      continue;
    }
    if (flag === '--cell') {
      values.cellId = argv[++index];
      continue;
    }
    if (flag === '--output') {
      values.output = argv[++index];
      continue;
    }
    if (flag === '--workflow-run-id') {
      values.workflowRunId = argv[++index];
      continue;
    }
    if (flag === '--run-attempt') {
      values.runAttempt = Number(argv[++index]);
      continue;
    }
    if (flag === '--workflow-sha') {
      values.workflowSha = argv[++index];
      continue;
    }
    if (flag === '--source-sha') {
      values.sourceSha = argv[++index];
      continue;
    }
    if (flag === '--event-name') {
      values.eventName = argv[++index];
      continue;
    }
    if (flag === '--summary') {
      values.summaryPath = argv[++index];
      continue;
    }
    if (flag === '--outcome') {
      const [id, outcome] = String(argv[++index]).split('=');
      values.outcomes[id] = outcome;
      continue;
    }
    throw new Error(`unsupported argument: ${flag}`);
  }
  return values;
}

function runSelfTest() {
  const cell = PLATFORM_CELLS_V1[0];
  const outcomes = Object.fromEntries(
    PLATFORM_COMMANDS_V1.map((command) => [command.id, 'success']),
  );
  const report = buildPlatformCoreCommandReportV1({
    cellId: cell.id,
    actual: cell,
    run: { workflowRunId: '1234567890', runAttempt: 1 },
    revision: {
      workflowSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      sourceSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      eventName: 'push',
    },
    commandOutcomes: outcomes,
    requiredCaseIds: [],
    passedAssertionMarkers: [],
    contractEvidenceHashes: [],
    completedAt: new Date().toISOString(),
  });
  validatePlatformCoreCommandReportV1(report, {
    expectedMarkers: [],
    expectedEvidence: [],
    expectedCaseIds: [],
    requireAllCommandsSuccess: true,
  });
  const hostile = {
    ...report,
    cwd: '/tmp/secret',
  };
  let rejected = false;
  try {
    validatePlatformCoreCommandReportV1(hostile, {
      expectedMarkers: [],
      expectedEvidence: [],
      expectedCaseIds: [],
    });
  } catch {
    rejected = true;
  }
  if (!rejected) {
    throw new Error('forbidden key cwd was accepted');
  }
  process.stdout.write('platform report self-test passed\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    runSelfTest();
    return;
  }
  if (
    args.cellId === undefined ||
    args.output === undefined ||
    args.workflowRunId === undefined ||
    args.runAttempt === undefined ||
    args.workflowSha === undefined ||
    args.sourceSha === undefined ||
    args.eventName === undefined
  ) {
    throw new Error('missing required report writer arguments');
  }
  const cell = PLATFORM_CELLS_V1.find((entry) => entry.id === args.cellId);
  if (cell === undefined) {
    throw new Error(`unknown cell ${args.cellId}`);
  }
  for (const command of PLATFORM_COMMANDS_V1) {
    if (args.outcomes[command.id] === undefined) {
      throw new Error(`missing outcome for ${command.id}`);
    }
  }
  const repository =
    createFilesystemPlatformContractRepository(repositoryRoot);
  const snapshot = validateProductionPlatformContractSnapshotV1(
    PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
    repository,
  ).snapshot;
  const applicable = applicableBindingsForOs(snapshot, cell.os);
  let markers = [];
  let evidence = [];
  if (args.summaryPath !== undefined) {
    const summaryAbsolute = resolve(repositoryRoot, args.summaryPath);
    if (existsSync(summaryAbsolute)) {
      const summary = JSON.parse(readFileSync(summaryAbsolute, 'utf8'));
      markers = summary.passedAssertionMarkers ?? [];
      evidence = summary.contractEvidenceHashes ?? [];
    }
  }
  const requiredCaseIds = applicable.map((binding) => binding.contractId).sort();
  const report = buildPlatformCoreCommandReportV1({
    cellId: cell.id,
    actual: cell,
    run: {
      workflowRunId: args.workflowRunId,
      runAttempt: args.runAttempt,
    },
    revision: {
      workflowSha: args.workflowSha,
      sourceSha: args.sourceSha,
      eventName: args.eventName,
    },
    commandOutcomes: args.outcomes,
    requiredCaseIds,
    passedAssertionMarkers: markers,
    contractEvidenceHashes: evidence,
    completedAt: new Date().toISOString(),
  });
  const outputPath = resolve(repositoryRoot, args.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`wrote ${args.output}\n`);
}

main();
