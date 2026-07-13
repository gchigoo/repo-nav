import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RUNNER_GROUP_ALIASES,
  RUNNER_SELECTIONS,
  type RunnerSurface,
} from './runner-registry.js';

interface ParsedSelection {
  readonly groups: readonly string[];
  readonly cases: readonly string[];
  readonly all: boolean;
  readonly reportPerformance: boolean;
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
      throw new Error(`Unsupported runner argument: ${flag ?? '<missing>'}`);
    }
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${flag}.`);
    }

    if (flag === '--group') {
      groups.push(value);
    } else {
      cases.push(value);
    }
    index += 1;
  }

  if (all && (groups.length > 0 || cases.length > 0)) {
    throw new Error('--all cannot be combined with --group or --case.');
  }

  return { groups, cases, all, reportPerformance };
}

function assertKnownSelections(
  surface: RunnerSurface,
  selection: ParsedSelection,
): void {
  const registry = RUNNER_SELECTIONS[surface];

  if (selection.reportPerformance && surface !== 'golden') {
    throw new Error('--report-performance is only supported by the golden runner.');
  }

  for (const group of selection.groups) {
    if (!registry.groups.has(group)) {
      throw new Error(`Unknown ${surface} test group: ${group}`);
    }
  }
  for (const caseId of selection.cases) {
    if (!registry.cases.has(caseId)) {
      throw new Error(`Unknown ${surface} test case: ${caseId}`);
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

export async function runVitestSurface(
  surface: RunnerSurface,
  args: readonly string[],
): Promise<number> {
  const selection = parseSelections(args);
  assertKnownSelections(surface, selection);
  const selectedGroups = selection.all
    ? []
    : expandGroups(surface, selection.groups);
  const selectedCases = selection.all ? [] : selection.cases;

  const repositoryRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
  );
  const vitestEntrypoint = resolve(
    repositoryRoot,
    'node_modules',
    'vitest',
    'vitest.mjs',
  );
  const configPath = resolve(repositoryRoot, 'vitest.config.ts');

  return await new Promise<number>((resolveExitCode, reject) => {
    const child = spawn(
      process.execPath,
      [vitestEntrypoint, 'run', '--config', configPath],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          REPO_NAV_TEST_SURFACE: surface,
          REPO_NAV_TEST_GROUPS: serializeSelection(selectedGroups),
          REPO_NAV_TEST_CASES: serializeSelection(selectedCases),
          REPO_NAV_REPORT_PERFORMANCE: selection.reportPerformance ? '1' : '0',
        },
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
