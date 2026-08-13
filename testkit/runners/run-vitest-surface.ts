import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RUNNER_GROUP_ALIASES,
  RUNNER_SELECTIONS,
  hasRunnerIdentity,
  type RunnerSurface,
} from './runner-registry.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import type { TestIdentity } from '../testing/selection.js';

interface RawVitestSurfaceSelection {
  readonly groups: readonly string[];
  readonly cases: readonly string[];
  readonly identities: readonly TestIdentity[];
  readonly all: boolean;
  readonly reportPerformance: boolean;
}

export interface VitestSurfaceSelection {
  readonly groups: readonly string[];
  readonly identities: readonly TestIdentity[];
  readonly all: boolean;
  readonly reportPerformance: boolean;
}

export class RunnerUsageError extends Error {}

export interface VitestSurfaceSummary {
  readonly selection: readonly string[];
  readonly counts: {
    readonly passed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly total: number;
  };
  readonly failures: readonly string[];
}

function parseIdentityArgument(value: string): TestIdentity {
  const [group, caseId, extra] = value.split('/');
  if (
    group === undefined ||
    group === '' ||
    caseId === undefined ||
    caseId === '' ||
    extra !== undefined
  ) {
    throw new RunnerUsageError('--identity must use <group>/<caseId>.');
  }
  return { group, caseId };
}

function parseSelections(args: readonly string[]): RawVitestSurfaceSelection {
  const groups: string[] = [];
  const cases: string[] = [];
  const identities: TestIdentity[] = [];
  let all = false;
  let reportPerformance = false;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--all') {
      all = true;
      continue;
    }
    if (flag === '--report-performance') {
      reportPerformance = true;
      continue;
    }

    const value = args[index + 1];

    if (flag !== '--group' && flag !== '--case' && flag !== '--identity') {
      throw new RunnerUsageError(
        `Unsupported runner argument: ${flag ?? '<missing>'}`,
      );
    }
    if (value === undefined || value.startsWith('--')) {
      throw new RunnerUsageError(`Missing value for ${flag}.`);
    }

    if (flag === '--group') {
      groups.push(value);
    } else if (flag === '--case') {
      cases.push(value);
    } else {
      identities.push(parseIdentityArgument(value));
    }
    index += 1;
  }

  if (all && (groups.length > 0 || cases.length > 0 || identities.length > 0)) {
    throw new RunnerUsageError(
      '--all cannot be combined with --identity, --group, or --case.',
    );
  }

  if (identities.length > 0 && (groups.length > 0 || cases.length > 0)) {
    throw new RunnerUsageError(
      '--identity cannot be combined with --group or --case.',
    );
  }

  if (cases.length > 0 && groups.length === 0) {
    throw new RunnerUsageError('--case requires exactly one --group.');
  }

  if (cases.length > 0 && (groups.length !== 1 || cases.length !== 1)) {
    throw new RunnerUsageError(
      'Legacy --group/--case selection requires exactly one --group and exactly one --case.',
    );
  }

  return { groups, cases, identities, all, reportPerformance };
}

function assertKnownGroup(surface: RunnerSurface, group: string): void {
  const registry = RUNNER_SELECTIONS[surface];
  if (!registry.groups.has(group)) {
    throw new RunnerUsageError(`Unknown ${surface} test group: ${group}`);
  }
}

function assertKnownIdentity(
  surface: RunnerSurface,
  identity: TestIdentity,
): void {
  if (!hasRunnerIdentity(surface, identity)) {
    throw new RunnerUsageError(
      `Unknown ${surface} test identity: ${identity.group}/${identity.caseId}`,
    );
  }
}

function assertKnownSelections(
  surface: RunnerSurface,
  selection: RawVitestSurfaceSelection,
): void {
  if (selection.reportPerformance && surface !== 'golden') {
    throw new RunnerUsageError(
      '--report-performance is only supported by the golden runner.',
    );
  }

  if (selection.cases.length === 1) {
    const [group] = selection.groups;
    const [caseId] = selection.cases;
    if (group !== undefined && caseId !== undefined) {
      assertKnownIdentity(surface, { group, caseId });
    }
    return;
  }

  for (const group of selection.groups) {
    assertKnownGroup(surface, group);
  }
  for (const identity of selection.identities) {
    assertKnownIdentity(surface, identity);
  }
}

function expandGroups(
  surface: RunnerSurface,
  groups: readonly string[],
): readonly string[] {
  const aliases = RUNNER_GROUP_ALIASES[surface];
  return [...new Set(groups.flatMap((group) => aliases[group] ?? [group]))];
}

function normalizeSelection(
  selection: RawVitestSurfaceSelection,
): VitestSurfaceSelection {
  if (selection.all) {
    return {
      groups: [],
      identities: [],
      all: true,
      reportPerformance: selection.reportPerformance,
    };
  }

  if (selection.cases.length === 1) {
    const [group] = selection.groups;
    const [caseId] = selection.cases;
    if (group === undefined || caseId === undefined) {
      throw new RunnerUsageError(
        'Legacy --group/--case selection requires exactly one --group and exactly one --case.',
      );
    }
    return {
      groups: [],
      identities: [{ group, caseId }],
      all: false,
      reportPerformance: selection.reportPerformance,
    };
  }

  return {
    groups: selection.groups,
    identities: selection.identities,
    all: false,
    reportPerformance: selection.reportPerformance,
  };
}

function serializeSelection(value: unknown): string {
  return JSON.stringify(value);
}

function resolveRepositoryRoot(): string {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.cwd(),
    resolve(moduleDirectory, '..', '..'),
    resolve(moduleDirectory, '..', '..', '..'),
  ];
  const root = candidates.find(
    (candidate) =>
      existsSync(resolve(candidate, 'package.json')) &&
      existsSync(resolve(candidate, 'node_modules', 'vitest', 'vitest.mjs')),
  );
  if (root === undefined) {
    throw new Error('Could not resolve the repo-nav repository root.');
  }
  return root;
}

export interface VitestSurfaceInvocation {
  readonly repositoryRoot: string;
  readonly commandArgs: readonly string[];
  readonly environment: NodeJS.ProcessEnv;
  readonly selection: VitestSurfaceSelection;
}

export function buildVitestSurfaceInvocation(
  surface: RunnerSurface,
  args: readonly string[],
): VitestSurfaceInvocation {
  const rawSelection = parseSelections(args);
  assertKnownSelections(surface, rawSelection);
  const selection = normalizeSelection(rawSelection);
  const selectedGroups =
    selection.all || selection.identities.length > 0
      ? []
      : expandGroups(surface, selection.groups);
  const selectedIdentities = selection.all ? [] : selection.identities;
  const repositoryRoot = resolveRepositoryRoot();
  const environment: NodeJS.ProcessEnv = { ...process.env };
  delete environment['REPO_NAV_TEST_CASES'];
  environment['REPO_NAV_TEST_SURFACE'] = surface;
  environment['REPO_NAV_TEST_GROUPS'] = serializeSelection(selectedGroups);
  environment['REPO_NAV_TEST_IDENTITIES'] =
    serializeSelection(selectedIdentities);
  environment['REPO_NAV_REPORT_PERFORMANCE'] = selection.reportPerformance
    ? '1'
    : '0';
  environment['REPO_NAV_REPOSITORY_ROOT'] = repositoryRoot;

  return {
    repositoryRoot,
    commandArgs: [
      resolve(repositoryRoot, 'node_modules', 'vitest', 'vitest.mjs'),
      'run',
      '--config',
      resolve(repositoryRoot, 'vitest.config.ts'),
      '--testTimeout=30000',
    ],
    environment,
    selection,
  };
}

export async function runVitestSurface(
  surface: RunnerSurface,
  args: readonly string[],
): Promise<number> {
  const invocation = buildVitestSurfaceInvocation(surface, args);

  return await new Promise<number>((resolveExitCode, reject) => {
    const child = spawn(process.execPath, invocation.commandArgs, {
      cwd: invocation.repositoryRoot,
      env: invocation.environment,
      stdio: 'inherit',
      windowsHide: true,
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal !== null) {
        reject(new Error(`Vitest terminated by signal ${signal}.`));
        return;
      }
      resolveExitCode(code ?? 1);
    });
  });
}

function numberField(value: unknown, key: string): number {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    throw new Error(`Vitest JSON report omitted ${key}.`);
  }
  const field = (value as Readonly<Record<string, unknown>>)[key];
  if (typeof field !== 'number' || !Number.isInteger(field) || field < 0) {
    throw new Error(`Vitest JSON report contained invalid ${key}.`);
  }
  return field;
}

function failureNames(value: unknown): readonly string[] {
  if (typeof value !== 'object' || value === null || !('testResults' in value))
    return [];
  const testResults = (value as Readonly<Record<string, unknown>>)[
    'testResults'
  ];
  if (!Array.isArray(testResults)) return [];
  const failures: string[] = [];
  for (const suite of testResults) {
    if (
      typeof suite !== 'object' ||
      suite === null ||
      !('assertionResults' in suite)
    )
      continue;
    const assertions = (suite as Readonly<Record<string, unknown>>)[
      'assertionResults'
    ];
    if (!Array.isArray(assertions)) continue;
    for (const assertion of assertions) {
      if (typeof assertion !== 'object' || assertion === null) continue;
      const record = assertion as Readonly<Record<string, unknown>>;
      if (
        record['status'] === 'failed' &&
        typeof record['fullName'] === 'string'
      ) {
        failures.push(record['fullName']);
      }
    }
  }
  return failures;
}

function summarizeSelection(
  selection: VitestSurfaceSelection,
): readonly string[] {
  if (selection.all) {
    return ['all'];
  }
  return [
    ...selection.identities.map(
      (identity) => `identity:${identity.group}/${identity.caseId}`,
    ),
    ...selection.groups.map((group) => `group:${group}`),
  ];
}

export async function runVitestSurfaceSummary(
  surface: RunnerSurface,
  args: readonly string[],
  abortSignal?: AbortSignal,
): Promise<VitestSurfaceSummary> {
  const invocation = buildVitestSurfaceInvocation(surface, args);
  const signal = abortSignal ?? new AbortController().signal;
  const environment: Record<string, string> = {};
  for (const key of [
    'REPO_NAV_TEST_SURFACE',
    'REPO_NAV_TEST_GROUPS',
    'REPO_NAV_TEST_IDENTITIES',
    'REPO_NAV_REPORT_PERFORMANCE',
  ] as const) {
    const value = invocation.environment[key];
    if (value !== undefined) {
      environment[key] = value;
    }
  }
  const result = await new NodeSafeProcessRunner().run(
    {
      executable: process.execPath,
      argv: [...invocation.commandArgs, '--reporter=json'],
      cwd: invocation.repositoryRoot,
      env: environment,
      timeoutMs: 30_000,
      maxStdoutBytes: 8 * 1024 * 1024,
      maxStderrBytes: 2 * 1024 * 1024,
      terminateGraceMs: 500,
    },
    signal,
  );
  if (!result.ok && result.kind !== 'non-zero-exit') {
    throw new Error(`Vitest runner failed (${result.kind}).`);
  }
  let report: unknown;
  try {
    report = JSON.parse(Buffer.from(result.stdout).toString('utf8')) as unknown;
  } catch {
    throw new Error('Vitest did not produce a valid JSON report.');
  }
  const passed = numberField(report, 'numPassedTests');
  const failed = numberField(report, 'numFailedTests');
  const skipped = numberField(report, 'numPendingTests');
  if (!result.ok && failed === 0) {
    throw new Error('Vitest failed without a test failure report.');
  }
  return {
    selection: summarizeSelection(invocation.selection),
    counts: { passed, failed, skipped, total: passed + failed + skipped },
    failures: failureNames(report),
  };
}

export async function executeVitestSurface(
  surface: RunnerSurface,
  args: readonly string[],
): Promise<void> {
  try {
    process.exitCode = await runVitestSurface(surface, args);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
