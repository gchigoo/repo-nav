import { describe, expect, it, vi } from 'vitest';

import {
  PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
  type PublicLocateExecutionApplicationV2,
} from '../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import {
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../../src/runtime/tokens.js';
import { CliErrorOutputSchema, ProbeOutputSchema } from '../../src/cli/contracts.js';
import {
  executeCli,
  type CliApplicationContext,
  type CliExecutionDependencies,
} from '../../src/cli/execute.js';
import {
  assertRunnerSurface,
  isSelected,
} from '../../testkit/testing/selection.js';

function dependencies(
  values: ReadonlyMap<symbol, unknown>,
  close = vi.fn(async () => undefined),
): {
  readonly dependencies: CliExecutionDependencies;
  readonly close: typeof close;
  readonly create: ReturnType<typeof vi.fn>;
} {
  const context: CliApplicationContext = {
    get: <T>(token: symbol): T => {
      if (!values.has(token)) throw new Error('Unexpected dependency token.');
      return values.get(token) as T;
    },
    close,
  };
  const create = vi.fn(async () => context);
  return {
    dependencies: { createApplicationContext: create },
    close,
    create,
  };
}

function fakeLocateApplication(
  impl: PublicLocateExecutionApplicationV2['execute'],
): PublicLocateExecutionApplicationV2 {
  return { execute: impl };
}

const locateArgs = [
  'debug',
  'locate',
  '--repo',
  '.',
  '--question',
  'Where is mapping?',
  '--term',
  'mapping',
] as const;

describe.runIf(
  isSelected({ group: 'debug-cli-shell', caseId: 'debug-cli-shell' }),
)('debug CLI shell', () => {
  it('returns help without creating an application context', async () => {
    assertRunnerSurface('unit');
    const fixture = dependencies(new Map());
    const result = await executeCli(
      ['--help'],
      new AbortController().signal,
      fixture.dependencies,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('repo-nav debug');
    expect(fixture.create).not.toHaveBeenCalled();
  });

  it.each([
    [['unknown'], 'Expected the debug command.'],
    [['debug', 'probe', '--wrong', '.'], 'Unknown probe option'],
  ] as const)(
    'maps invalid arguments to exit 2 before bootstrap',
    async (args, message) => {
      const fixture = dependencies(new Map());
      const result = await executeCli(
        args,
        new AbortController().signal,
        fixture.dependencies,
      );
      expect(result.exitCode).toBe(2);
      expect(
        CliErrorOutputSchema.parse(JSON.parse(result.stdout) as unknown).error
          .message,
      ).toContain(message);
      expect(fixture.create).not.toHaveBeenCalled();
    },
  );

  it('rejects removed golden command with usage exit 2', async () => {
    const fixture = dependencies(new Map());
    const result = await executeCli(
      ['debug', 'golden', '--all'],
      new AbortController().signal,
      fixture.dependencies,
    );
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('debug golden was removed');
  });
});

describe.runIf(
  isSelected({ group: 'debug-cli-lifecycle', caseId: 'debug-cli-lifecycle' }),
)('debug CLI lifecycle', () => {
  it('closes the context and maps locate errors through v2 transport', async () => {
    assertRunnerSurface('unit');
    const locate = vi.fn<PublicLocateExecutionApplicationV2['execute']>(
      async () => ({
        value: {
          ok: false as const,
          error: {
            code: 'INVALID_INPUT' as const,
            message: 'Locate request does not match the required schema.',
            recoverable: true,
          },
        },
        compactJson: JSON.stringify({
          ok: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Locate request does not match the required schema.',
            recoverable: true,
          },
        }),
        utf8Bytes: 1,
      }),
    );
    const fixture = dependencies(
      new Map([[PUBLIC_LOCATE_EXECUTION_APPLICATION_V2, fakeLocateApplication(locate)]]),
    );
    const toolError = await executeCli(
      locateArgs,
      new AbortController().signal,
      fixture.dependencies,
    );
    expect(toolError.exitCode).toBe(3);
    expect(fixture.close).toHaveBeenCalledTimes(1);

    locate.mockRejectedValueOnce(new Error('private path D:\\secret'));
    const unexpected = await executeCli(
      locateArgs,
      new AbortController().signal,
      fixture.dependencies,
    );
    expect(unexpected.exitCode).toBe(1);
    expect(unexpected.stdout).not.toContain('secret');
    expect(fixture.close).toHaveBeenCalledTimes(2);
  });
});

describe.runIf(
  isSelected({ group: 'debug-cli-probe', caseId: 'debug-cli-probe' }),
)('debug CLI probe', () => {
  it('probes backends through the application context', async () => {
    const reader = {
      resolveRoot: vi.fn(async () => '/repo'),
    };
    const backends = [
      {
        id: 'ripgrep' as const,
        probe: vi.fn(async () => ({ state: 'available' as const })),
        search: vi.fn(),
      },
    ] as any;
    const fixture = dependencies(
      new Map([
        [REPOSITORY_READER, reader],
        [REPOSITORY_SEARCH_BACKENDS, backends],
      ]),
    );
    const result = await executeCli(
      ['debug', 'probe', '--repo', '.'],
      new AbortController().signal,
      fixture.dependencies,
    );
    expect(result.exitCode).toBe(0);
    expect(ProbeOutputSchema.parse(JSON.parse(result.stdout))).toMatchObject({
      schemaVersion: '1.0',
      repositoryRootRedacted: '<repository-root>',
    });
  });
});
