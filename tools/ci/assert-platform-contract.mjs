import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(moduleDirectory, '..', '..');

if (process.env['REPO_NAV_PLATFORM_TSX_ACTIVE'] !== '1') {
  const relaunch = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      fileURLToPath(import.meta.url),
      ...process.argv.slice(2),
    ],
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
  PLATFORM_ACTION_PINS_V1,
  PLATFORM_AGGREGATE_JOB_ID_V1,
  PLATFORM_AGGREGATE_RUNNER_V1,
  PLATFORM_CELLS_V1,
  PLATFORM_COMMANDS_V1,
  PLATFORM_MATRIX_JOB_ID_V1,
  PLATFORM_WORKFLOW_PATH_V1,
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  applicableBindingsForOs,
  createFilesystemPlatformContractRepository,
  validateProductionPlatformContractSnapshotV1,
} = await import(
  pathToFileURL(
    resolve(repositoryRoot, 'testkit/contracts/platform-contract.ts'),
  ).href
);
const { validatePlatformCoreCommandReportV1 } = await import(
  pathToFileURL(
    resolve(repositoryRoot, 'testkit/contracts/platform-evidence-report.ts'),
  ).href
);

function parseArgs(argv) {
  let workflowPath;
  let cellReportPath;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--workflow') {
      workflowPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (flag === '--cell-report') {
      cellReportPath = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unsupported argument: ${flag}`);
  }
  return { workflowPath, cellReportPath };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertWorkflowContract(workflowPath) {
  const absolute = resolve(repositoryRoot, workflowPath);
  const raw = readFileSync(absolute, 'utf8');
  assert(!/secrets\./u.test(raw), 'workflow must not reference secrets');
  assert(
    !/continue-on-error/u.test(raw),
    'workflow must not continue-on-error',
  );
  assert(
    !/ubuntu-latest|windows-latest|macos-latest/u.test(raw),
    'no *-latest runners',
  );
  assert(
    !/@v\d+/u.test(raw),
    'actions must be pinned by SHA, not floating tags',
  );
  const doc = parseYaml(raw);
  assert(
    doc?.permissions?.contents === 'read',
    'permissions.contents must be read',
  );
  assert(
    doc?.concurrency?.['cancel-in-progress'] === true,
    'concurrency.cancel-in-progress must be true',
  );
  assert(
    Array.isArray(doc?.on?.merge_group?.types) &&
      doc.on.merge_group.types.includes('checks_requested'),
    'merge_group.checks_requested required',
  );
  assert(
    Array.isArray(doc?.on?.push?.branches) &&
      doc.on.push.branches.includes('main') &&
      doc.on.push.branches.includes('repo-nav-public-beta'),
    'push branches must include main and repo-nav-public-beta',
  );
  assert(doc?.on?.pull_request !== undefined, 'pull_request trigger required');
  assert(
    doc?.on?.workflow_dispatch !== undefined,
    'workflow_dispatch trigger required',
  );

  const matrixJob = doc?.jobs?.[PLATFORM_MATRIX_JOB_ID_V1];
  assert(matrixJob !== undefined, 'platform-matrix job missing');
  assert(
    matrixJob.strategy?.['fail-fast'] === false,
    'fail-fast must be false',
  );
  const include = matrixJob.strategy?.matrix?.include;
  assert(Array.isArray(include), 'matrix.include required');
  assert(
    include.length === PLATFORM_CELLS_V1.length,
    'matrix must have six cells',
  );
  for (let index = 0; index < PLATFORM_CELLS_V1.length; index += 1) {
    const expected = PLATFORM_CELLS_V1[index];
    const actual = include[index];
    assert(actual?.cellId === expected.id, `cell order mismatch at ${index}`);
    assert(
      actual?.runner === expected.runner,
      `runner mismatch for ${expected.id}`,
    );
    assert(
      Number(actual?.nodeMajor) === expected.nodeMajor,
      `nodeMajor mismatch for ${expected.id}`,
    );
  }
  assert(
    matrixJob['runs-on'] === '${{ matrix.runner }}',
    'matrix runs-on must use matrix.runner',
  );

  const steps = matrixJob.steps;
  assert(Array.isArray(steps), 'matrix steps required');
  const checkout = steps.find((step) =>
    String(step.uses ?? '').startsWith('actions/checkout@'),
  );
  const setupPython = steps.find((step) =>
    String(step.uses ?? '').startsWith('actions/setup-python@'),
  );
  const setup = steps.find((step) =>
    String(step.uses ?? '').startsWith('actions/setup-node@'),
  );
  const upload = steps.find((step) =>
    String(step.uses ?? '').startsWith('actions/upload-artifact@'),
  );
  const checkoutPin = PLATFORM_ACTION_PINS_V1.find(
    (pin) => pin.id === 'checkout',
  );
  const setupPythonPin = PLATFORM_ACTION_PINS_V1.find(
    (pin) => pin.id === 'setup-python',
  );
  const setupPin = PLATFORM_ACTION_PINS_V1.find(
    (pin) => pin.id === 'setup-node',
  );
  const uploadPin = PLATFORM_ACTION_PINS_V1.find(
    (pin) => pin.id === 'upload-artifact',
  );
  assert(
    checkout?.uses === `actions/checkout@${checkoutPin.sha}`,
    'checkout SHA mismatch',
  );
  assert(
    setupPython?.uses === `actions/setup-python@${setupPythonPin.sha}`,
    'setup-python SHA mismatch',
  );
  assert(
    setup?.uses === `actions/setup-node@${setupPin.sha}`,
    'setup-node SHA mismatch',
  );
  assert(
    upload?.uses === `actions/upload-artifact@${uploadPin.sha}`,
    'upload-artifact SHA mismatch',
  );
  assert(
    checkout?.with?.['persist-credentials'] === false,
    'persist-credentials must be false',
  );
  assert(
    checkout?.with?.ref === '${{ github.sha }}',
    'checkout ref must be github.sha',
  );
  assert(
    setup?.with?.['package-manager-cache'] === false,
    'package-manager-cache must be false',
  );

  for (const command of PLATFORM_COMMANDS_V1) {
    assert(
      steps.some((step) => step.id === command.id),
      `missing step id ${command.id}`,
    );
  }
  assert(
    steps.some((step) => step.id === 'report' && step.if === 'always()'),
    'report step must be always()',
  );
  assert(
    steps.some((step) => step.id === 'assert-cell' && step.if === 'always()'),
    'assert-cell step must be always()',
  );
  assert(upload?.if === 'always()', 'upload must be always()');
  assert(
    upload?.with?.['if-no-files-found'] === 'error',
    'upload must error if missing',
  );
  assert(upload?.with?.['retention-days'] === 14, 'retention-days must be 14');

  const aggregate = doc?.jobs?.[PLATFORM_AGGREGATE_JOB_ID_V1];
  assert(aggregate !== undefined, 'aggregate job missing');
  assert(
    aggregate.name === PLATFORM_AGGREGATE_JOB_ID_V1,
    'aggregate name must be stable',
  );
  assert(
    aggregate['runs-on'] === PLATFORM_AGGREGATE_RUNNER_V1,
    'aggregate runner mismatch',
  );
  assert(
    Array.isArray(aggregate.needs) &&
      aggregate.needs.length === 1 &&
      aggregate.needs[0] === PLATFORM_MATRIX_JOB_ID_V1,
    'aggregate needs must be [platform-matrix]',
  );
  assert(aggregate.if === 'always()', 'aggregate must use if: always()');
  assert(
    !Array.isArray(aggregate.steps) ||
      !aggregate.steps.some((step) => step.uses),
    'aggregate must not checkout/setup',
  );
  assert(
    !Array.isArray(aggregate.steps) ||
      !aggregate.steps.some((step) =>
        /npm\s+ci|npm\s+install/u.test(String(step.run ?? '')),
      ),
    'aggregate must not install dependencies',
  );
  const requireStep = aggregate.steps?.find((step) =>
    String(step.run ?? '').includes('needs.platform-matrix.result'),
  );
  assert(requireStep !== undefined, 'aggregate must check matrix result');
  const requireRun = String(requireStep.run);
  assert(
    requireRun.includes("== 'success'") ||
      requireRun.includes('== "success"') ||
      requireRun.includes("!= 'success'") ||
      requireRun.includes('!= "success"'),
    'aggregate must require success only',
  );
}

function assertCellReport(cellReportPath) {
  const report = JSON.parse(
    readFileSync(resolve(repositoryRoot, cellReportPath), 'utf8'),
  );
  const repository = createFilesystemPlatformContractRepository(repositoryRoot);
  const snapshot = validateProductionPlatformContractSnapshotV1(
    PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
    repository,
  ).snapshot;
  const cellId = report.cellId;
  const cell = PLATFORM_CELLS_V1.find((entry) => entry.id === cellId);
  assert(cell !== undefined, 'unknown cell in report');
  const applicable = applicableBindingsForOs(snapshot, cell.os);
  const expectedCaseIds = applicable
    .map((binding) => binding.contractId)
    .sort();
  const expectedMarkers = applicable
    .flatMap((binding) =>
      binding.requiredAssertionIds.map((assertionId) => ({
        contractId: binding.contractId,
        assertionId,
      })),
    )
    .sort(
      (left, right) =>
        left.contractId.localeCompare(right.contractId) ||
        left.assertionId.localeCompare(right.assertionId),
    );
  const expectedEvidence = (report.contractEvidenceHashes ?? []).map(
    (entry) => ({
      contractId: entry.contractId,
      evidenceId: entry.evidenceId,
      sha256: entry.sha256,
    }),
  );
  const expectedEvidenceIds = applicable
    .flatMap((binding) =>
      binding.requiredEvidenceHashIds.map(
        (evidenceId) => `${binding.contractId}::${evidenceId}`,
      ),
    )
    .sort();
  const actualEvidenceIds = expectedEvidence
    .map((entry) => `${entry.contractId}::${entry.evidenceId}`)
    .sort();
  assert(
    JSON.stringify(actualEvidenceIds) === JSON.stringify(expectedEvidenceIds),
    'contractEvidenceHashes id set mismatch',
  );
  validatePlatformCoreCommandReportV1(report, {
    expectedMarkers,
    expectedEvidence,
    expectedCaseIds,
    requireAllCommandsSuccess: true,
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.workflowPath !== undefined) {
    assertWorkflowContract(args.workflowPath);
    process.stdout.write(
      `workflow contract ok: ${args.workflowPath || PLATFORM_WORKFLOW_PATH_V1}\n`,
    );
  }
  if (args.cellReportPath !== undefined) {
    assertCellReport(args.cellReportPath);
    process.stdout.write(`cell report ok: ${args.cellReportPath}\n`);
  }
  if (args.workflowPath === undefined && args.cellReportPath === undefined) {
    assertWorkflowContract(PLATFORM_WORKFLOW_PATH_V1);
    process.stdout.write(
      `workflow contract ok: ${PLATFORM_WORKFLOW_PATH_V1}\n`,
    );
  }
}

main();
