import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RUNNER_GROUP_ALIASES,
  RUNNER_SELECTIONS,
  type RunnerSurface,
} from './runner-registry.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';

interface ParsedSelection {
  readonly groups: readonly string[];
  readonly cases: readonly string[];
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

function parseSelections(args: readonly string[]): ParsedSelection {
  const groups: string[] = [];
  const cases: string[] = [];
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

    if (flag !== '--group' && flag !== '--case') {
      throw new RunnerUsageError(`Unsupported runner argument: ${flag ?? '<missing>'}`);
    }
    if (value === undefined || value.startsWith('--')) {
      throw new RunnerUsageError(`Missing value for ${flag}.`);
    }

    if (flag === '--group') {
      groups.push(value);
    } else {
      cases.push(value);
    }
    index += 1;
  }

  if (all && (groups.length > 0 || cases.length > 0)) {
    throw new RunnerUsageError('--all cannot be combined with --group or --case.');
  }

  return { groups, cases, all, reportPerformance };
}

function assertKnownSelections(
  surface: RunnerSurface,
  selection: ParsedSelection,
): void {
  const registry = RUNNER_SELECTIONS[surface];

  if (selection.reportPerformance && surface !== 'golden') {
    throw new RunnerUsageError('--report-performance is only supported by the golden runner.');
  }

  for (const group of selection.groups) {
    if (!registry.groups.has(group)) {
      throw new RunnerUsageError(`Unknown ${surface} test group: ${group}`);
    }
  }
  for (const caseId of selection.cases) {
    if (!registry.cases.has(caseId)) {
      throw new RunnerUsageError(`Unknown ${surface} test case: ${caseId}`);
    }
  }
}

function expandGroups(
  surface: RunnerSurface,
  groups: readonly string[],
): readonly string[] {
  const aliases = RUNNER_GROUP_ALIASES[surface];
  return [...new Set(groups.flatMap((group) => aliases[group] ?? [group]))];
}

function serializeSelection(values: readonly string[]): string {
  return JSON.stringify(values);
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

function buildVitestInvocation(
  surface: RunnerSurface,
  args: readonly string[],
): {
  readonly repositoryRoot: string;
  readonly commandArgs: readonly string[];
  readonly environment: NodeJS.ProcessEnv;
  readonly selection: ParsedSelection;
} {
  const selection = parseSelections(args);
  assertKnownSelections(surface, selection);
  const selectedGroups = selection.all ? [] : expandGroups(surface, selection.groups);
  const selectedCases = selection.all ? [] : selection.cases;
  const repositoryRoot = resolveRepositoryRoot();
  return {
    repositoryRoot,
    commandArgs: [
      resolve(repositoryRoot, 'node_modules', 'vitest', 'vitest.mjs'),
      'run',
      '--config',
      resolve(repositoryRoot, 'vitest.config.ts'),
      '--testTimeout=30000',
    ],
    environment: {
      ...process.env,
      REPO_NAV_TEST_SURFACE: surface,
      REPO_NAV_TEST_GROUPS: serializeSelection(selectedGroups),
      REPO_NAV_TEST_CASES: serializeSelection(selectedCases),
      REPO_NAV_REPORT_PERFORMANCE: selection.reportPerformance ? '1' : '0',
      REPO_NAV_REPOSITORY_ROOT: repositoryRoot,
    },
    selection,
  };
}

export async function runVitestSurface(
  surface: RunnerSurface,
  args: readonly string[],
): Promise<number> {
  const invocation = buildVitestInvocation(surface, args);

  return await new Promise<number>((resolveExitCode, reject) => {
    const child = spawn(
      process.execPath,
      invocation.commandArgs,
      {
        cwd: invocation.repositoryRoot,
        env: invocation.environment,
        stdio: 'inherit',
        windowsHide: true,
      },
    );

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
  if (typeof value !== 'object' || value === null || !('testResults' in value)) return [];
  const testResults = (value as Readonly<Record<string, unknown>>)['testResults'];
  if (!Array.isArray(testResults)) return [];
  const failures: string[] = [];
  for (const suite of testResults) {
    if (typeof suite !== 'object' || suite === null || !('assertionResults' in suite)) continue;
    const assertions = (suite as Readonly<Record<string, unknown>>)['assertionResults'];
    if (!Array.isArray(assertions)) continue;
    for (const assertion of assertions) {
      if (typeof assertion !== 'object' || assertion === null) continue;
      const record = assertion as Readonly<Record<string, unknown>>;
      if (record['status'] === 'failed' && typeof record['fullName'] === 'string') {
        failures.push(record['fullName']);
      }
    }
  }
  return failures;
}

export async function runVitestSurfaceSummary(
  surface: RunnerSurface,
  args: readonly string[],
  abortSignal?: AbortSignal,
): Promise<VitestSurfaceSummary> {
  const invocation = buildVitestInvocation(surface, args);
  const signal = abortSignal ?? new AbortController().signal;
  const environment: Record<string, string> = {};
  for (const key of [
    'REPO_NAV_TEST_SURFACE',
    'REPO_NAV_TEST_GROUPS',
    'REPO_NAV_TEST_CASES',
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
    selection: invocation.selection.all
      ? ['all']
      : [
          ...invocation.selection.groups.map((group) => `group:${group}`),
          ...invocation.selection.cases.map((caseId) => `case:${caseId}`),
        ],
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
