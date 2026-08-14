import { createRepoNavApplicationContext } from '../app/create-application-context.js';
import type {
  RepositoryReader,
  RepositorySearchBackend,
} from '../contracts/index.js';
import {
  PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
  type PublicLocateExecutionApplicationV2,
} from '../evidence/locate-execution/public-locate-execution-application-v2.js';
import {
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../runtime/tokens.js';
import { ProbeOutputSchema, createCliError } from './contracts.js';
import type { CliApplicationAdapter, CliExecutionResult } from './execute.js';

export interface CliApplicationContext {
  get<T>(token: symbol): T;
  close(): Promise<void>;
}

export interface CliApplicationAdapterDependencies {
  readonly createApplicationContext: () => Promise<CliApplicationContext>;
}

const DEFAULT_DEPENDENCIES: CliApplicationAdapterDependencies = {
  createApplicationContext: createRepoNavApplicationContext,
};

function json(value: unknown): string {
  return JSON.stringify(value);
}

function internalFailure(): CliExecutionResult {
  return {
    exitCode: 1,
    stdout: json(
      createCliError('CLI_INTERNAL', 'The debug command failed unexpectedly.'),
    ),
    stderr: 'repo-nav debug command failed unexpectedly.',
  };
}

async function withApplicationContext(
  dependencies: CliApplicationAdapterDependencies,
  execute: (application: CliApplicationContext) => Promise<CliExecutionResult>,
): Promise<CliExecutionResult> {
  let application: CliApplicationContext | undefined;
  let result: CliExecutionResult;
  try {
    application = await dependencies.createApplicationContext();
    result = await execute(application);
  } catch {
    result = internalFailure();
  }
  if (application !== undefined) {
    try {
      await application.close();
    } catch {
      return internalFailure();
    }
  }
  return result;
}

export function createCliApplicationAdapter(
  dependencies: CliApplicationAdapterDependencies = DEFAULT_DEPENDENCIES,
): CliApplicationAdapter {
  return {
    executeLocate: async (command, signal) =>
      withApplicationContext(dependencies, async (application) => {
        const locateApplication =
          application.get<PublicLocateExecutionApplicationV2>(
            PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
          );
        const view = await locateApplication.execute(command.rawRequest, {
          callerSignal: signal,
        });
        return {
          exitCode: view.value.ok ? 0 : 3,
          stdout: view.compactJson,
        };
      }),
    executeProbe: async (command, signal) =>
      withApplicationContext(dependencies, async (application) => {
        const reader = application.get<RepositoryReader>(REPOSITORY_READER);
        let repositoryRoot: string;
        try {
          repositoryRoot = await reader.resolveRoot(command.repoPath, signal);
        } catch {
          return {
            exitCode: 3,
            stdout: json(
              createCliError(
                'INVALID_REPOSITORY',
                'The repository path could not be opened.',
              ),
            ),
          };
        }
        const backends = application.get<readonly RepositorySearchBackend[]>(
          REPOSITORY_SEARCH_BACKENDS,
        );
        const settlements = await Promise.allSettled(
          backends.map(async (backend) => ({
            backend: backend.id,
            health: await backend.probe(repositoryRoot, signal),
          })),
        );
        const rejected = settlements.find(
          (settlement): settlement is PromiseRejectedResult =>
            settlement.status === 'rejected',
        );
        if (rejected !== undefined) {
          throw rejected.reason;
        }
        const diagnostics = settlements.map((settlement) => {
          if (settlement.status !== 'fulfilled') {
            throw settlement.reason;
          }
          return settlement.value;
        });
        const output = ProbeOutputSchema.parse({
          schemaVersion: '1.0',
          repositoryRootRedacted: '<repository-root>',
          backends: diagnostics,
        });
        return { exitCode: 0, stdout: json(output) };
      }),
  };
}
