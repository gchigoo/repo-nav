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
import { readPackageMetadata } from '../runtime/package-metadata.js';
import { ProbeOutputSchema, createCliError } from './contracts.js';
import { CliUsageError, parseCliArguments } from './parser.js';

export interface CliExecutionResult {
  readonly exitCode: 0 | 1 | 2 | 3;
  readonly stdout: string;
  readonly stderr?: string;
}

export interface CliApplicationContext {
  get<T>(token: symbol): T;
  close(): Promise<void>;
}

export interface CliExecutionDependencies {
  createApplicationContext(): Promise<CliApplicationContext>;
}

const DEFAULT_DEPENDENCIES: CliExecutionDependencies = {
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

/**
 * Execute production debug CLI (locate/probe/help/version).
 */
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

  if (command.kind === 'help') {
    return { exitCode: 0, stdout: command.text };
  }
  if (command.kind === 'version') {
    return { exitCode: 0, stdout: readPackageMetadata().version };
  }

  let application: CliApplicationContext | undefined;
  try {
    application = await dependencies.createApplicationContext();
    if (command.kind === 'locate') {
      const locateApplication =
        application.get<PublicLocateExecutionApplicationV2>(
          PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
        );
      try {
        const view = await locateApplication.execute(command.rawRequest, {
          callerSignal: signal,
        });
        return {
          exitCode: view.value.ok ? 0 : 3,
          stdout: view.compactJson,
        };
      } catch {
        return internalFailure();
      }
    }

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
    const diagnostics = [];
    for (const backend of backends) {
      diagnostics.push({
        backend: backend.id,
        health: await backend.probe(repositoryRoot, signal),
      });
    }
    const output = ProbeOutputSchema.parse({
      schemaVersion: '1.0',
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
