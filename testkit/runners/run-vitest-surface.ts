import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RUNNER_SELECTIONS,
  type RunnerSurface,
} from './runner-registry.js';

interface ParsedSelection {
  readonly groups: readonly string[];
  readonly cases: readonly string[];
}

function parseSelections(args: readonly string[]): ParsedSelection {
  const groups: string[] = [];
  const cases: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
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

  return { groups, cases };
}

function assertKnownSelections(
  surface: RunnerSurface,
  selection: ParsedSelection,
): void {
  const registry = RUNNER_SELECTIONS[surface];

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

function serializeSelection(values: readonly string[]): string {
  return JSON.stringify(values);
}

export async function runVitestSurface(
  surface: RunnerSurface,
  args: readonly string[],
): Promise<number> {
  const selection = parseSelections(args);
  assertKnownSelections(surface, selection);

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
          REPO_NAV_TEST_GROUPS: serializeSelection(selection.groups),
          REPO_NAV_TEST_CASES: serializeSelection(selection.cases),
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
