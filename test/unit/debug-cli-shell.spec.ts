import { describe, expect, it, vi } from 'vitest';

import { createPublicErrorResult } from '../../src/contracts/index.js';
import {
  REPOSITORY_EVIDENCE_SERVICE,
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../../src/runtime/tokens.js';
import { CliErrorOutputSchema, GoldenOutputSchema, ProbeOutputSchema } from '../../tools/cli/contracts.js';
import {
  executeCli,
  type CliApplicationContext,
  type CliExecutionDependencies,
} from '../../tools/cli/execute.js';
import { assertRunnerSurface, isSelected } from '../../testkit/testing/selection.js';

function dependencies(
  values: ReadonlyMap<symbol, unknown>,
  close = vi.fn(async () => undefined),
  runGolden: CliExecutionDependencies['runGolden'] = async () => ({
    selection: ['all'],
    counts: { passed: 1, failed: 0, skipped: 0, total: 1 },
    failures: [],
  }),
): { readonly dependencies: CliExecutionDependencies; readonly close: typeof close; readonly create: ReturnType<typeof vi.fn> } {
  const context: CliApplicationContext = {
    get: <T>(token: symbol): T => {
      if (!values.has(token)) throw new Error('Unexpected dependency token.');
      return values.get(token) as T;
    },
    close,
  };
  const create = vi.fn(async () => context);
  return { dependencies: { createApplicationContext: create, runGolden }, close, create };
}

const locateArgs = [
  'debug', 'locate', '--repo', '.', '--question', 'Where is mapping?', '--term', 'mapping',
] as const;

describe.runIf(isSelected({ group: 'debug-cli-shell', caseId: 'debug-cli-shell' }))('debug CLI shell', () => {
  it('returns help without creating an application context', async () => {
    assertRunnerSurface('unit');
    const fixture = dependencies(new Map());
    const result = await executeCli(['--help'], new AbortController().signal, fixture.dependencies);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('repo-nav debug');
    expect(fixture.create).not.toHaveBeenCalled();
  });

  it.each([
    [['unknown'], 'Expected the debug command.'],
    [['debug', 'locate', '--repo', '.'], 'Missing required option --question.'],
    [['debug', 'probe', '--wrong', '.'], 'Unknown probe option'],
  ] as const)('maps invalid arguments to exit 2 before bootstrap', async (args, message) => {
    const fixture = dependencies(new Map());
    const result = await executeCli(args, new AbortController().signal, fixture.dependencies);
    expect(result.exitCode).toBe(2);
    expect(CliErrorOutputSchema.parse(JSON.parse(result.stdout) as unknown).error.message).toContain(message);
    expect(fixture.create).not.toHaveBeenCalled();
  });
});

describe.runIf(isSelected({ group: 'debug-cli-lifecycle', caseId: 'debug-cli-lifecycle' }))('debug CLI lifecycle', () => {
  it('closes the context and maps service exceptions through the canonical tool policy', async () => {
    assertRunnerSurface('unit');
    const service = { locate: vi.fn(async () => createPublicErrorResult('INVALID_INPUT')) };
    const fixture = dependencies(new Map([[REPOSITORY_EVIDENCE_SERVICE, service]]));
    const toolError = await executeCli(locateArgs, new AbortController().signal, fixture.dependencies);
    expect(toolError.exitCode).toBe(3);
    expect(fixture.close).toHaveBeenCalledTimes(1);

    service.locate.mockRejectedValueOnce(new Error('private path D:\\secret'));
    const unexpected = await executeCli(locateArgs, new AbortController().signal, fixture.dependencies);
    expect(unexpected.exitCode).toBe(1);
    expect(JSON.parse(unexpected.stdout)).toEqual(createPublicErrorResult('INTERNAL_ERROR'));
    expect(unexpected.stdout).not.toContain('secret');
    expect(fixture.close).toHaveBeenCalledTimes(2);
  });

  it('fails closed when application cleanup rejects', async () => {
    const service = { locate: vi.fn(async () => createPublicErrorResult('INVALID_INPUT')) };
    const fixture = dependencies(
      new Map([[REPOSITORY_EVIDENCE_SERVICE, service]]),
      vi.fn(async () => { throw new Error('unsafe cleanup detail'); }),
    );
    const result = await executeCli(locateArgs, new AbortController().signal, fixture.dependencies);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).not.toContain('cleanup detail');
    expect(fixture.close).toHaveBeenCalledOnce();
  });

  it('passes an already-aborted signal and still closes exactly once', async () => {
    const controller = new AbortController();
    controller.abort();
    const service = {
      locate: vi.fn(async (_request: unknown, context: { readonly signal: AbortSignal }) => {
        expect(context.signal.aborted).toBe(true);
        return createPublicErrorResult('INTERNAL_ERROR');
      }),
    };
    const fixture = dependencies(new Map([[REPOSITORY_EVIDENCE_SERVICE, service]]));
    await executeCli(locateArgs, controller.signal, fixture.dependencies);
    expect(fixture.close).toHaveBeenCalledOnce();
  });
});

describe.runIf(isSelected({ group: 'debug-cli-locate', caseId: 'debug-cli-locate' }))('debug locate adapter', () => {
  it('uses only the evidence-service seam and preserves canonical tool output', async () => {
    assertRunnerSurface('unit');
    const expected = createPublicErrorResult('INVALID_INPUT', 'ADD_TERM');
    const service = { locate: vi.fn(async () => expected) };
    const fixture = dependencies(new Map([[REPOSITORY_EVIDENCE_SERVICE, service]]));
    const result = await executeCli(locateArgs, new AbortController().signal, fixture.dependencies);
    expect(result.exitCode).toBe(3);
    expect(JSON.parse(result.stdout)).toEqual(expected);
    expect(service.locate).toHaveBeenCalledOnce();
    expect(fixture.close).toHaveBeenCalledOnce();
  });
});

describe.runIf(isSelected({ group: 'debug-cli-probe', caseId: 'debug-cli-probe' }))('debug probe adapter', () => {
  it('resolves the root and probes backends in configured order without evidence fields', async () => {
    assertRunnerSurface('unit');
    const order: string[] = [];
    const reader = { resolveRoot: vi.fn(async () => 'D:\\repo') };
    const backends = [
      { id: 'codegraph', probe: vi.fn(async () => { order.push('codegraph'); return { state: 'missing', indexFound: false }; }) },
      { id: 'ripgrep', probe: vi.fn(async () => { order.push('ripgrep'); return { state: 'available', version: '15' }; }) },
    ];
    const fixture = dependencies(new Map<symbol, unknown>([
      [REPOSITORY_READER, reader],
      [REPOSITORY_SEARCH_BACKENDS, backends],
    ]));
    const result = await executeCli(['debug', 'probe', '--repo', '.'], new AbortController().signal, fixture.dependencies);
    const output = ProbeOutputSchema.parse(JSON.parse(result.stdout) as unknown);
    expect(result.exitCode).toBe(0);
    expect(order).toEqual(['codegraph', 'ripgrep']);
    expect(output.repositoryRootRedacted).toBe('<repository-root>');
    expect(result.stdout).not.toMatch(/confirmed|candidates|status|D:\\\\repo/u);
    expect(fixture.close).toHaveBeenCalledOnce();
  });
});

describe.runIf(isSelected({ group: 'debug-cli-golden', caseId: 'debug-cli-golden' }))('debug golden adapter', () => {
  it('reuses the shared runner result and maps pass/failure/usage exit codes', async () => {
    assertRunnerSurface('unit');
    const passed = dependencies(new Map());
    const passResult = await executeCli(['debug', 'golden', '--all'], new AbortController().signal, passed.dependencies);
    expect(passResult.exitCode).toBe(0);
    expect(GoldenOutputSchema.parse(JSON.parse(passResult.stdout) as unknown).counts.passed).toBe(1);
    expect(passed.create).not.toHaveBeenCalled();

    const failed = dependencies(new Map(), vi.fn(async () => undefined), async () => ({
      selection: ['case:broken'],
      counts: { passed: 0, failed: 1, skipped: 0, total: 1 },
      failures: ['safe test name'],
    }));
    const failResult = await executeCli(['debug', 'golden', '--case', 'manifest-evaluator'], new AbortController().signal, failed.dependencies);
    expect(failResult.exitCode).toBe(1);
    expect(GoldenOutputSchema.parse(JSON.parse(failResult.stdout) as unknown).failures).toEqual(['safe test name']);

    const usage = await executeCli(['debug', 'golden'], new AbortController().signal, passed.dependencies);
    expect(usage.exitCode).toBe(2);
    const performanceOnly = await executeCli(
      ['debug', 'golden', '--report-performance'],
      new AbortController().signal,
      passed.dependencies,
    );
    expect(performanceOnly.exitCode).toBe(2);
    expect(passed.create).not.toHaveBeenCalled();
  });
});
