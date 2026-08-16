import { readPackageMetadata } from '../runtime/package-metadata.js';
import { createCliError } from './contracts.js';
import {
  CliUsageError,
  CLI_USAGE_ERROR_MESSAGE,
  parseCliArguments,
  type ParsedCliCommand,
} from './parser.js';

export interface CliExecutionResult {
  readonly exitCode: 0 | 1 | 2 | 3;
  readonly stdout: string;
  readonly stderr?: string;
}

export interface CliApplicationAdapter {
  executeLocate(
    command: Extract<ParsedCliCommand, { readonly kind: 'locate' }>,
    signal: AbortSignal,
  ): Promise<CliExecutionResult>;
  executeProbe(
    command: Extract<ParsedCliCommand, { readonly kind: 'probe' }>,
    signal: AbortSignal,
  ): Promise<CliExecutionResult>;
}

export interface CliExecutionDependencies {
  readonly loadApplicationAdapter: () => Promise<CliApplicationAdapter>;
}

const DEFAULT_DEPENDENCIES: CliExecutionDependencies = {
  loadApplicationAdapter: () =>
    import('./application-adapter.js').then((module) =>
      module.createCliApplicationAdapter(),
    ),
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
  let command: ParsedCliCommand;
  try {
    command = parseCliArguments(args);
  } catch (error: unknown) {
    if (error instanceof CliUsageError) {
      return {
        exitCode: 2,
        stdout: json(createCliError('CLI_USAGE', CLI_USAGE_ERROR_MESSAGE)),
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

  try {
    const adapter = await dependencies.loadApplicationAdapter();
    return command.kind === 'locate'
      ? await adapter.executeLocate(command, signal)
      : await adapter.executeProbe(command, signal);
  } catch {
    return internalFailure();
  }
}
