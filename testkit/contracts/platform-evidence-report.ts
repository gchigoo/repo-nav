import {
  PLATFORM_CELLS_V1,
  PLATFORM_COMMANDS_V1,
  type PlatformCellContract,
  type PlatformCellId,
  type PlatformCommandContract,
  type PlatformContractIdV1,
} from './platform-contract.js';

export interface PlatformRunIdentityV1 {
  readonly workflowRunId: string;
  readonly runAttempt: number;
}

export interface PlatformPassedAssertionMarkerV1 {
  readonly contractId: string;
  readonly assertionId: string;
}

export interface PlatformContractEvidenceHashV1 {
  readonly contractId: string;
  readonly evidenceId: string;
  readonly sha256: string;
}

export type PlatformCommandOutcome =
  'success' | 'failure' | 'cancelled' | 'skipped';

export type PlatformEventName =
  'pull_request' | 'merge_group' | 'push' | 'workflow_dispatch';

export interface PlatformCoreCommandReportV1 {
  readonly schemaVersion: 1;
  readonly cellId: PlatformCellId;
  readonly expected: PlatformCellContract;
  readonly actual: PlatformCellContract;
  readonly run: PlatformRunIdentityV1;
  readonly revision: Readonly<{
    readonly workflowSha: string;
    readonly sourceSha: string;
    readonly eventName: PlatformEventName;
  }>;
  readonly commands: readonly Readonly<{
    readonly id: PlatformCommandContract['id'];
    readonly outcome: PlatformCommandOutcome;
  }>[];
  readonly requiredCaseIds: readonly string[];
  readonly passedAssertionMarkers: readonly PlatformPassedAssertionMarkerV1[];
  readonly contractEvidenceHashes: readonly PlatformContractEvidenceHashV1[];
  readonly completedAt: string;
}

const FORBIDDEN_KEY_PATTERN =
  /^(cwd|path|root|env|stdout|stderr|error|message|pid|argv)$/iu;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const WORKFLOW_RUN_ID_PATTERN = /^[0-9]+$/u;
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoForbiddenKeys(value: unknown, trail: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoForbiddenKeys(entry, `${trail}[${index}]`),
    );
    return;
  }
  if (!isPlainObject(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      throw new Error(`forbidden report key ${trail}.${key}`);
    }
    assertNoForbiddenKeys(child, `${trail}.${key}`);
  }
}

function sortMarkers(
  markers: readonly PlatformPassedAssertionMarkerV1[],
): readonly PlatformPassedAssertionMarkerV1[] {
  return [...markers].sort((left, right) => {
    const byContract = left.contractId.localeCompare(right.contractId);
    return byContract !== 0
      ? byContract
      : left.assertionId.localeCompare(right.assertionId);
  });
}

function sortEvidence(
  evidence: readonly PlatformContractEvidenceHashV1[],
): readonly PlatformContractEvidenceHashV1[] {
  return [...evidence].sort((left, right) => {
    const byContract = left.contractId.localeCompare(right.contractId);
    return byContract !== 0
      ? byContract
      : left.evidenceId.localeCompare(right.evidenceId);
  });
}

function assertExactMarkers(
  actual: readonly PlatformPassedAssertionMarkerV1[],
  expected: readonly PlatformPassedAssertionMarkerV1[],
): void {
  const sortedActual = sortMarkers(actual);
  const sortedExpected = sortMarkers(expected);
  if (sortedActual.length !== sortedExpected.length) {
    throw new Error('passedAssertionMarkers length mismatch');
  }
  for (let index = 0; index < sortedExpected.length; index += 1) {
    const left = sortedActual[index];
    const right = sortedExpected[index];
    if (
      left === undefined ||
      right === undefined ||
      left.contractId !== right.contractId ||
      left.assertionId !== right.assertionId
    ) {
      throw new Error('passedAssertionMarkers content mismatch');
    }
  }
}

function assertExactEvidence(
  actual: readonly PlatformContractEvidenceHashV1[],
  expected: readonly PlatformContractEvidenceHashV1[],
): void {
  const sortedActual = sortEvidence(actual);
  const sortedExpected = sortEvidence(expected);
  if (sortedActual.length !== sortedExpected.length) {
    throw new Error('contractEvidenceHashes length mismatch');
  }
  for (let index = 0; index < sortedExpected.length; index += 1) {
    const left = sortedActual[index];
    const right = sortedExpected[index];
    if (
      left === undefined ||
      right === undefined ||
      left.contractId !== right.contractId ||
      left.evidenceId !== right.evidenceId ||
      left.sha256 !== right.sha256
    ) {
      throw new Error('contractEvidenceHashes content mismatch');
    }
    if (!SHA256_PATTERN.test(left.sha256)) {
      throw new Error(`invalid evidence hash ${left.sha256}`);
    }
  }
}

/**
 * Validates a strict PlatformCoreCommandReportV1 closed schema.
 */
export function validatePlatformCoreCommandReportV1(
  value: unknown,
  options: {
    readonly expectedMarkers: readonly PlatformPassedAssertionMarkerV1[];
    readonly expectedEvidence: readonly PlatformContractEvidenceHashV1[];
    readonly expectedCaseIds: readonly string[];
    readonly requireAllCommandsSuccess?: boolean;
  },
): PlatformCoreCommandReportV1 {
  assertNoForbiddenKeys(value, 'report');
  if (!isPlainObject(value)) {
    throw new Error('report must be an object');
  }
  const allowedKeys = new Set([
    'schemaVersion',
    'cellId',
    'expected',
    'actual',
    'run',
    'revision',
    'commands',
    'requiredCaseIds',
    'passedAssertionMarkers',
    'contractEvidenceHashes',
    'completedAt',
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`unexpected report key ${key}`);
    }
  }
  if (value['schemaVersion'] !== 1) {
    throw new Error('schemaVersion must be 1');
  }
  const cellId = value['cellId'];
  if (
    typeof cellId !== 'string' ||
    !PLATFORM_CELLS_V1.some((cell) => cell.id === cellId)
  ) {
    throw new Error('invalid cellId');
  }
  const expected = value['expected'];
  const actual = value['actual'];
  const cell = PLATFORM_CELLS_V1.find((entry) => entry.id === cellId);
  if (cell === undefined) {
    throw new Error('missing cell');
  }
  if (JSON.stringify(expected) !== JSON.stringify(cell)) {
    throw new Error('expected cell mismatch');
  }
  if (!isPlainObject(actual)) {
    throw new Error('actual must be an object');
  }
  if (
    actual['id'] !== cell.id ||
    actual['runner'] !== cell.runner ||
    actual['os'] !== cell.os ||
    actual['arch'] !== cell.arch ||
    actual['nodeMajor'] !== cell.nodeMajor
  ) {
    throw new Error('actual cell mismatch');
  }
  const run = value['run'];
  if (!isPlainObject(run)) {
    throw new Error('run must be an object');
  }
  if (Object.keys(run).sort().join(',') !== 'runAttempt,workflowRunId') {
    throw new Error('run keys must be exactly workflowRunId,runAttempt');
  }
  if (
    typeof run['workflowRunId'] !== 'string' ||
    !WORKFLOW_RUN_ID_PATTERN.test(run['workflowRunId'])
  ) {
    throw new Error('invalid workflowRunId');
  }
  if (
    typeof run['runAttempt'] !== 'number' ||
    !Number.isSafeInteger(run['runAttempt']) ||
    run['runAttempt'] < 1
  ) {
    throw new Error('invalid runAttempt');
  }
  const revision = value['revision'];
  if (!isPlainObject(revision)) {
    throw new Error('revision must be an object');
  }
  if (
    Object.keys(revision).sort().join(',') !== 'eventName,sourceSha,workflowSha'
  ) {
    throw new Error(
      'revision keys must be exactly workflowSha,sourceSha,eventName',
    );
  }
  if (
    typeof revision['workflowSha'] !== 'string' ||
    !GIT_SHA_PATTERN.test(revision['workflowSha'])
  ) {
    throw new Error('invalid workflowSha');
  }
  if (
    typeof revision['sourceSha'] !== 'string' ||
    !GIT_SHA_PATTERN.test(revision['sourceSha'])
  ) {
    throw new Error('invalid sourceSha');
  }
  const eventName = revision['eventName'];
  if (
    eventName !== 'pull_request' &&
    eventName !== 'merge_group' &&
    eventName !== 'push' &&
    eventName !== 'workflow_dispatch'
  ) {
    throw new Error('invalid eventName');
  }
  const commands = value['commands'];
  if (
    !Array.isArray(commands) ||
    commands.length !== PLATFORM_COMMANDS_V1.length
  ) {
    throw new Error('commands must cover all nine core command ids');
  }
  for (let index = 0; index < PLATFORM_COMMANDS_V1.length; index += 1) {
    const command = commands[index];
    const expectedCommand = PLATFORM_COMMANDS_V1[index];
    if (!isPlainObject(command) || expectedCommand === undefined) {
      throw new Error('invalid command entry');
    }
    if (Object.keys(command).sort().join(',') !== 'id,outcome') {
      throw new Error('command keys must be exactly id,outcome');
    }
    if (command['id'] !== expectedCommand.id) {
      throw new Error(`command order mismatch at ${index}`);
    }
    const outcome = command['outcome'];
    if (
      outcome !== 'success' &&
      outcome !== 'failure' &&
      outcome !== 'cancelled' &&
      outcome !== 'skipped'
    ) {
      throw new Error(`invalid outcome for ${expectedCommand.id}`);
    }
    if (options.requireAllCommandsSuccess !== false && outcome !== 'success') {
      throw new Error(`command ${expectedCommand.id} is not success`);
    }
  }
  const requiredCaseIds = value['requiredCaseIds'];
  if (
    !Array.isArray(requiredCaseIds) ||
    !requiredCaseIds.every((entry) => typeof entry === 'string')
  ) {
    throw new Error('requiredCaseIds must be string[]');
  }
  if (
    requiredCaseIds.length !== options.expectedCaseIds.length ||
    requiredCaseIds.some(
      (entry, index) => entry !== options.expectedCaseIds[index],
    )
  ) {
    throw new Error('requiredCaseIds mismatch');
  }
  const markers = value['passedAssertionMarkers'];
  if (!Array.isArray(markers)) {
    throw new Error('passedAssertionMarkers must be an array');
  }
  const normalizedMarkers: PlatformPassedAssertionMarkerV1[] = markers.map(
    (entry) => {
      if (!isPlainObject(entry)) {
        throw new Error('invalid marker entry');
      }
      if (Object.keys(entry).sort().join(',') !== 'assertionId,contractId') {
        throw new Error('marker keys must be exactly contractId,assertionId');
      }
      if (
        typeof entry['contractId'] !== 'string' ||
        typeof entry['assertionId'] !== 'string'
      ) {
        throw new Error('invalid marker fields');
      }
      return {
        contractId: entry['contractId'],
        assertionId: entry['assertionId'],
      };
    },
  );
  assertExactMarkers(normalizedMarkers, options.expectedMarkers);
  const evidence = value['contractEvidenceHashes'];
  if (!Array.isArray(evidence)) {
    throw new Error('contractEvidenceHashes must be an array');
  }
  const normalizedEvidence: PlatformContractEvidenceHashV1[] = evidence.map(
    (entry) => {
      if (!isPlainObject(entry)) {
        throw new Error('invalid evidence entry');
      }
      if (
        Object.keys(entry).sort().join(',') !== 'contractId,evidenceId,sha256'
      ) {
        throw new Error(
          'evidence keys must be exactly contractId,evidenceId,sha256',
        );
      }
      if (
        typeof entry['contractId'] !== 'string' ||
        typeof entry['evidenceId'] !== 'string' ||
        typeof entry['sha256'] !== 'string'
      ) {
        throw new Error('invalid evidence fields');
      }
      return {
        contractId: entry['contractId'],
        evidenceId: entry['evidenceId'],
        sha256: entry['sha256'],
      };
    },
  );
  assertExactEvidence(normalizedEvidence, options.expectedEvidence);
  if (
    typeof value['completedAt'] !== 'string' ||
    Number.isNaN(Date.parse(value['completedAt']))
  ) {
    throw new Error('invalid completedAt');
  }
  return value as unknown as PlatformCoreCommandReportV1;
}

/**
 * Builds a safe report object from already-validated gate inputs.
 */
export function buildPlatformCoreCommandReportV1(input: {
  readonly cellId: PlatformCellId;
  readonly actual: PlatformCellContract;
  readonly run: PlatformRunIdentityV1;
  readonly revision: PlatformCoreCommandReportV1['revision'];
  readonly commandOutcomes: Readonly<
    Record<PlatformCommandContract['id'], PlatformCommandOutcome>
  >;
  readonly requiredCaseIds: readonly string[];
  readonly passedAssertionMarkers: readonly PlatformPassedAssertionMarkerV1[];
  readonly contractEvidenceHashes: readonly PlatformContractEvidenceHashV1[];
  readonly completedAt: string;
}): PlatformCoreCommandReportV1 {
  const expected = PLATFORM_CELLS_V1.find((cell) => cell.id === input.cellId);
  if (expected === undefined) {
    throw new Error(`unknown cell ${input.cellId}`);
  }
  const report: PlatformCoreCommandReportV1 = {
    schemaVersion: 1,
    cellId: input.cellId,
    expected,
    actual: input.actual,
    run: input.run,
    revision: input.revision,
    commands: PLATFORM_COMMANDS_V1.map((command) => ({
      id: command.id,
      outcome: input.commandOutcomes[command.id],
    })),
    requiredCaseIds: [...input.requiredCaseIds],
    passedAssertionMarkers: sortMarkers(input.passedAssertionMarkers),
    contractEvidenceHashes: sortEvidence(input.contractEvidenceHashes),
    completedAt: input.completedAt,
  };
  return validatePlatformCoreCommandReportV1(report, {
    expectedMarkers: input.passedAssertionMarkers,
    expectedEvidence: input.contractEvidenceHashes,
    expectedCaseIds: input.requiredCaseIds,
    requireAllCommandsSuccess: false,
  });
}

export function f4BaseEmptyEvidence(): readonly PlatformContractEvidenceHashV1[] {
  return Object.freeze([]);
}

export type { PlatformContractIdV1 };
