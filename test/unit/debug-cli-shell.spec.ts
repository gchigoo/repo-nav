import type { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type {
  SafeProcessRequest,
  SafeProcessResult,
  SafeProcessStreamingResultV2,
  SafeStdoutConsumerV2,
} from '../../src/contracts/safe-process.js';
import { BoundedByteCollectorV2 } from '../../src/process/bounded-byte-collector-v2.js';
import { projectBufferedCompatibilityResultV2 } from '../../src/process/buffered-compatibility-projection-v2.js';
import { SafeProcessExecutionKernelV2 } from '../../src/process/safe-process-execution-kernel-v2.js';
import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import {
  PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
  type PublicLocateExecutionApplicationV2,
} from '../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import {
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../../src/runtime/tokens.js';
import {
  CliErrorOutputSchema,
  ProbeOutputSchema,
} from '../../src/cli/contracts.js';
import {
  createCliApplicationAdapter,
  type CliApplicationContext,
} from '../../src/cli/application-adapter.js';
import {
  executeCli,
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
  readonly load: ReturnType<typeof vi.fn>;
} {
  const context: CliApplicationContext = {
    get: <T>(token: symbol): T => {
      if (!values.has(token)) throw new Error('Unexpected dependency token.');
      return values.get(token) as T;
    },
    close,
  };
  const adapter = createCliApplicationAdapter({
    createApplicationContext: async () => context,
  });
  const load = vi.fn(async () => adapter);
  return {
    dependencies: { loadApplicationAdapter: load },
    close,
    load,
  };
}

function fakeLocateApplication(
  impl: PublicLocateExecutionApplicationV2['execute'],
): PublicLocateExecutionApplicationV2 {
  return { execute: impl };
}

class CliSpawnFailureRunner extends NodeSafeProcessRunner {
  public constructor(private readonly spawnImpl: typeof spawn) {
    super();
  }

  public override async run(
    request: SafeProcessRequest,
    signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    const streaming = await this.runStreaming(
      request,
      signal,
      new BoundedByteCollectorV2(),
    );
    return projectBufferedCompatibilityResultV2(streaming);
  }

  public override runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    signal: AbortSignal,
    consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    return new SafeProcessExecutionKernelV2({
      spawn: this.spawnImpl,
    }).runStreaming(request, signal, consumer);
  }
}

function failingSpawn(code: string): typeof spawn {
  return () => {
    throw Object.assign(new Error(`${code}: secret /private/repo-nav-bin`), {
      code,
      path: '/private/repo-nav-bin',
    });
  };
}

class CliAvailabilityResultRunner extends NodeSafeProcessRunner {
  private nextIndex = 0;

  public constructor(
    private readonly results: readonly SafeProcessStreamingResultV2<
      Uint8Array,
      Uint8Array
    >[],
  ) {
    super();
  }

  public override runStreaming<TPartial, TComplete>(
    _request: SafeProcessRequest,
    _signal: AbortSignal,
    _consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    const result = this.results[this.nextIndex];
    this.nextIndex += 1;
    if (result === undefined) {
      return Promise.reject(new Error('Unexpected availability invocation.'));
    }
    return Promise.resolve(
      result as SafeProcessStreamingResultV2<TPartial, TComplete>,
    );
  }
}

function completedAvailability(
  stdout: string,
  exitCode: number,
): SafeProcessStreamingResultV2<Uint8Array, Uint8Array> {
  return {
    ok: true,
    kind: 'completed',
    startState: 'started',
    exitCode,
    terminationSignal: null,
    stdout: { kind: 'complete', value: Buffer.from(stdout, 'utf8') },
    stderr: new Uint8Array(),
  };
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
  it('returns help without loading the application adapter', async () => {
    assertRunnerSurface('unit');
    const fixture = dependencies(new Map());
    const result = await executeCli(
      ['--help'],
      new AbortController().signal,
      fixture.dependencies,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('repo-nav debug');
    expect(fixture.load).not.toHaveBeenCalled();
  });

  it('returns version without loading the application adapter', async () => {
    const fixture = dependencies(new Map());
    const result = await executeCli(
      ['--version'],
      new AbortController().signal,
      fixture.dependencies,
    );
    expect(result).toMatchObject({ exitCode: 0, stdout: '1.1.0' });
    expect(fixture.load).not.toHaveBeenCalled();
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
      expect(fixture.load).not.toHaveBeenCalled();
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
      new Map([
        [PUBLIC_LOCATE_EXECUTION_APPLICATION_V2, fakeLocateApplication(locate)],
      ]),
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
  it('starts backend probes concurrently and preserves registration order', async () => {
    const reader = {
      resolveRoot: vi.fn(async () => '/repo'),
    };
    let resolveCodeGraph: ((value: { state: 'available' }) => void) | undefined;
    let resolveRipgrep: ((value: { state: 'available' }) => void) | undefined;
    const codegraphProbe = vi.fn(
      () =>
        new Promise<{ state: 'available' }>((resolveProbe) => {
          resolveCodeGraph = resolveProbe;
        }),
    );
    const ripgrepProbe = vi.fn(
      () =>
        new Promise<{ state: 'available' }>((resolveProbe) => {
          resolveRipgrep = resolveProbe;
        }),
    );
    const fixture = dependencies(
      new Map<symbol, unknown>([
        [REPOSITORY_READER, reader],
        [
          REPOSITORY_SEARCH_BACKENDS,
          [
            { id: 'codegraph', probe: codegraphProbe, search: vi.fn() },
            { id: 'ripgrep', probe: ripgrepProbe, search: vi.fn() },
          ],
        ],
      ]),
    );

    const pending = executeCli(
      ['debug', 'probe', '--repo', '.'],
      new AbortController().signal,
      fixture.dependencies,
    );
    await vi.waitFor(() => {
      expect(codegraphProbe).toHaveBeenCalledTimes(1);
      expect(ripgrepProbe).toHaveBeenCalledTimes(1);
    });
    resolveRipgrep?.({ state: 'available' });
    resolveCodeGraph?.({ state: 'available' });

    const result = await pending;
    expect(ProbeOutputSchema.parse(JSON.parse(result.stdout)).backends).toEqual(
      [
        { backend: 'codegraph', health: { state: 'available' } },
        { backend: 'ripgrep', health: { state: 'available' } },
      ],
    );
  });

  it('waits for every started probe before closing after an unexpected rejection', async () => {
    const reader = {
      resolveRoot: vi.fn(async () => '/repo'),
    };
    let rejectCodeGraph: ((reason: Error) => void) | undefined;
    let resolveRipgrep: ((value: { state: 'available' }) => void) | undefined;
    const codegraphProbe = vi.fn(
      () =>
        new Promise<{ state: 'available' }>((_resolveProbe, rejectProbe) => {
          rejectCodeGraph = rejectProbe;
        }),
    );
    const ripgrepProbe = vi.fn(
      () =>
        new Promise<{ state: 'available' }>((resolveProbe) => {
          resolveRipgrep = resolveProbe;
        }),
    );
    const close = vi.fn(async () => undefined);
    const fixture = dependencies(
      new Map<symbol, unknown>([
        [REPOSITORY_READER, reader],
        [
          REPOSITORY_SEARCH_BACKENDS,
          [
            { id: 'codegraph', probe: codegraphProbe, search: vi.fn() },
            { id: 'ripgrep', probe: ripgrepProbe, search: vi.fn() },
          ],
        ],
      ]),
      close,
    );

    const pending = executeCli(
      ['debug', 'probe', '--repo', '.'],
      new AbortController().signal,
      fixture.dependencies,
    );
    await vi.waitFor(() => {
      expect(codegraphProbe).toHaveBeenCalledTimes(1);
      expect(ripgrepProbe).toHaveBeenCalledTimes(1);
    });
    rejectCodeGraph?.(new Error('private path /secret/repository'));
    await Promise.resolve();
    expect(close).not.toHaveBeenCalled();
    resolveRipgrep?.({ state: 'available' });

    const result = await pending;
    expect(close).toHaveBeenCalledTimes(1);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).not.toContain('secret');
    expect(result.stdout).not.toContain('/private/');
    expect(CliErrorOutputSchema.parse(JSON.parse(result.stdout))).toMatchObject(
      {
        error: { code: 'CLI_INTERNAL' },
      },
    );
  });

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

  it('rejects nonzero production availability completions in CLI diagnostics', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-cli-nonzero-'));
    try {
      const reader = {
        resolveRoot: vi.fn(async () => repository),
      };
      const runner = new CliAvailabilityResultRunner([
        completedAvailability(
          JSON.stringify({ initialized: true, version: '99.0.0' }),
          7,
        ),
        completedAvailability('ripgrep 99.0.0\n', 7),
      ]);
      const fixture = dependencies(
        new Map<symbol, unknown>([
          [REPOSITORY_READER, reader],
          [
            REPOSITORY_SEARCH_BACKENDS,
            [new CodeGraphBackend(runner), new RipgrepBackend(runner)],
          ],
        ]),
      );
      const result = await executeCli(
        ['debug', 'probe', '--repo', '.'],
        new AbortController().signal,
        fixture.dependencies,
      );
      expect(result.exitCode).toBe(0);
      expect(
        ProbeOutputSchema.parse(JSON.parse(result.stdout)).backends,
      ).toEqual([
        {
          backend: 'codegraph',
          health: {
            state: 'error',
            reasonCode: 'BACKEND_PROCESS_FAILED',
          },
        },
        {
          backend: 'ripgrep',
          health: {
            state: 'error',
            reasonCode: 'BACKEND_PROCESS_FAILED',
          },
        },
      ]);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it.each([
    [
      'ENOENT',
      { state: 'unavailable', reasonCode: 'CODEGRAPH_UNAVAILABLE' },
      { state: 'missing', reasonCode: 'RIPGREP_UNAVAILABLE' },
    ],
    [
      'EACCES',
      { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
      { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
    ],
    [
      'EPERM',
      { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
      { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
    ],
    [
      'EMFILE',
      { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
      { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
    ],
  ] as const)(
    'preserves sanitized %s availability classification in production backend diagnostics',
    async (code, codegraphHealth, ripgrepHealth) => {
      const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-cli-probe-'));
      try {
        const reader = {
          resolveRoot: vi.fn(async () => repository),
        };
        const runner = new CliSpawnFailureRunner(failingSpawn(code));
        const fixture = dependencies(
          new Map<symbol, unknown>([
            [REPOSITORY_READER, reader],
            [
              REPOSITORY_SEARCH_BACKENDS,
              [new CodeGraphBackend(runner), new RipgrepBackend(runner)],
            ],
          ]),
        );
        const result = await executeCli(
          ['debug', 'probe', '--repo', '.'],
          new AbortController().signal,
          fixture.dependencies,
        );
        expect(result.exitCode).toBe(0);
        const parsed = ProbeOutputSchema.parse(JSON.parse(result.stdout));
        expect(parsed.backends).toEqual([
          { backend: 'codegraph', health: codegraphHealth },
          { backend: 'ripgrep', health: ripgrepHealth },
        ]);
        expect(result.stdout).not.toContain('secret');
        expect(result.stdout).not.toContain('/private/');
      } finally {
        rmSync(repository, { recursive: true, force: true });
      }
    },
  );
});
