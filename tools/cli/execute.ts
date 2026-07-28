import { createRepoNavApplicationContext } from '../../src/app/create-application-context.js';
import type {
  RepositoryEvidenceService,
  RepositoryReader,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';
import {
  createLocateToolOutput,
  internalLocateError,
} from '../../src/mcp/locate-tool-output.js';
import {
  REPOSITORY_EVIDENCE_SERVICE,
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../../src/runtime/tokens.js';
import {
  RunnerUsageError,
  runVitestSurfaceSummary,
  type VitestSurfaceSummary,
} from '../../testkit/runners/run-vitest-surface.js';
import {
  CLI_SCHEMA_VERSION,
  GoldenOutputSchema,
  ProbeOutputSchema,
  createCliError,
} from './contracts.js';
import { CliUsageError, parseCliArguments } from './parser.js';

export interface CliExecutionResult {
  readonly exitCode: 0 | 1 | 2 | 3;
  readonly stdout: string;
  readonly stderr?: string;
}

export interface CliExecutionDependencies {
  createApplicationContext(): Promise<CliApplicationContext>;
  runGolden(args: readonly string[], signal: AbortSignal): Promise<VitestSurfaceSummary>;
}

export interface CliApplicationContext {
  get<T>(token: symbol): T;
  close(): Promise<void>;
}

const DEFAULT_DEPENDENCIES: CliExecutionDependencies = {
  createApplicationContext: createRepoNavApplicationContext,
  runGolden: async (args, signal) => await runVitestSurfaceSummary('golden', args, signal),
};

function json(value: unknown): string {
  return JSON.stringify(value);
}

function internalFailure(): CliExecutionResult {
  return {
    exitCode: 1,
    stdout: json(createCliError('CLI_INTERNAL', 'The debug command failed unexpectedly.')),
    stderr: 'repo-nav debug command failed unexpectedly.',
  };
}

export async function executeCli(
  args: readonly string[],
  signal: AbortSignal,
  dependencies: CliExecutionDependencies = DEFAULT_DEPENDENCIES,
): Promise<CliExecutionResult> {
  let command;
  try {
    command = parseCliArguments(args);
  } catch (error: unknown) {
    if (error instanceof CliUsageError) {
      return {
        exitCode: 2,
        stdout: json(createCliError('CLI_USAGE', error.message)),
      };
    }
    return internalFailure();
  }

  if (command.kind === 'help') return { exitCode: 0, stdout: command.text };

  if (command.kind === 'golden') {
    const hasPrimarySelection = command.args.some(
      (argument) =>
        argument === '--all' || argument === '--group' || argument === '--case',
    );
    if (!hasPrimarySelection || command.args.includes('--report-performance')) {
      return {
        exitCode: 2,
        stdout: json(
          createCliError(
            'CLI_USAGE',
            'golden requires --all, --group, or --case; performance reporting is not exposed by the CLI.',
          ),
        ),
      };
    }
    try {
      const summary = await dependencies.runGolden(command.args, signal);
      const output = GoldenOutputSchema.parse({
        schemaVersion: CLI_SCHEMA_VERSION,
        ...summary,
        artifactPaths: [
          '.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-qa.md',
          'test-artifacts/performance/large-synthetic-repository-v1.json',
        ],
      });
      return { exitCode: summary.counts.failed === 0 ? 0 : 1, stdout: json(output) };
    } catch (error: unknown) {
      if (error instanceof RunnerUsageError) {
        return { exitCode: 2, stdout: json(createCliError('CLI_USAGE', error.message)) };
      }
      return internalFailure();
    }
  }

  let application: CliApplicationContext | undefined;
  try {
    application = await dependencies.createApplicationContext();
    if (command.kind === 'locate') {
      const service = application.get<RepositoryEvidenceService>(
        REPOSITORY_EVIDENCE_SERVICE,
      );
      let result;
      let serviceThrew = false;
      try {
        result = await service.locate(command.request, {
          callerSignal: signal,
        });
      } catch {
        serviceThrew = true;
        result = internalLocateError();
      }
      const output = createLocateToolOutput(result);
      return {
        exitCode: serviceThrew ? 1 : output.ok ? 0 : 3,
        stdout: json(output),
      };
    }

    const reader = application.get<RepositoryReader>(REPOSITORY_READER);
    let repositoryRoot: string;
    try {
      repositoryRoot = await reader.resolveRoot(command.repoPath, signal);
    } catch {
      return {
        exitCode: 3,
        stdout: json(
          createCliError('INVALID_REPOSITORY', 'The repository path could not be opened.'),
        ),
      };
    }
    const backends = application.get<readonly RepositorySearchBackend[]>(
      REPOSITORY_SEARCH_BACKENDS,
    );
    const diagnostics = [];
    for (const backend of backends) {
      diagnostics.push({
        backend: backend.id,
        health: await backend.probe(repositoryRoot, signal),
      });
    }
    const output = ProbeOutputSchema.parse({
      schemaVersion: CLI_SCHEMA_VERSION,
      repositoryRootRedacted: '<repository-root>',
      backends: diagnostics,
    });
    return { exitCode: 0, stdout: json(output) };
  } catch {
    return internalFailure();
  } finally {
    if (application !== undefined) {
      try {
        await application.close();
      } catch {
        return internalFailure();
      }
    }
  }
}
