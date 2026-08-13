import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  SafeProcessRequest,
  SafeProcessResult,
  SafeProcessStreamingResultV2,
  SafeStdoutConsumerV2,
  StreamingSafeProcessRunnerV2,
} from '../../src/contracts/safe-process.js';
import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import {
  createBackendExecutionContextV2,
  requireBackendDiscoveryHandoffForF3V2,
  requireBackendExecutionOutcomeV2,
  requireBackendPhysicalAttemptExecutorV2,
} from '../../src/process/backend-execution-context-v2.js';
import { BoundedByteCollectorV2 } from '../../src/process/bounded-byte-collector-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import { PHYSICAL_START_MUTATIONS_V2 } from '../../testkit/fixtures/backend-execution-v2/physical-start-authority-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

class CountingRunnerV2 implements StreamingSafeProcessRunnerV2 {
  public runCount = 0;
  public streamCount = 0;
  public streamArgv: string[][] = [];
  public constructor(private readonly inner: NodeSafeProcessRunner) {}
  public run(
    request: SafeProcessRequest,
    signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    this.runCount += 1;
    return this.inner.run(request, signal);
  }
  public runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    signal: AbortSignal,
    consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    this.streamCount += 1;
    this.streamArgv = [...this.streamArgv, [...request.argv]];
    return this.inner.runStreaming(request, signal, consumer);
  }
}

class StubStreamingRunnerV2 implements StreamingSafeProcessRunnerV2 {
  public runCalls = 0;
  public runStreamingCalls = 0;
  public readonly consumers: SafeStdoutConsumerV2<unknown, unknown>[] = [];

  public constructor(
    private readonly streaming: SafeProcessStreamingResultV2<
      Uint8Array,
      Uint8Array
    >,
  ) {}

  public run(
    _request: SafeProcessRequest,
    _signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    this.runCalls += 1;
    return Promise.resolve({
      ok: false,
      kind: 'spawn-error',
      exitCode: null,
      terminationSignal: null,
      stdout: new Uint8Array(),
      stderr: new Uint8Array(),
    });
  }

  public runStreaming<TPartial, TComplete>(
    _request: SafeProcessRequest,
    _signal: AbortSignal,
    consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    this.runStreamingCalls += 1;
    this.consumers.push(consumer);
    return Promise.resolve(
      this.streaming as SafeProcessStreamingResultV2<TPartial, TComplete>,
    );
  }
}

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'physical-start-authority',
  }),
)('F5-START-AUTHORITY-001 physical start', () => {
  it('registers ripgrep-group ordinals via executor and rejects bare-runner searchViews bypass', async () => {
    expect(PHYSICAL_START_MUTATIONS_V2).toContain('bare-runner');
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-start-'));
    try {
      writeFileSync(resolve(cwd, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      const counting = new CountingRunnerV2(new NodeSafeProcessRunner());
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const signal = new AbortController().signal;
      const context = createBackendExecutionContextV2(
        counting,
        undefined,
        signal,
        execution,
      );
      const executor = requireBackendPhysicalAttemptExecutorV2(
        context,
        'ripgrep',
        execution,
      );
      const prepared = await executor.prepareAvailabilityProbe(
        {
          backend: 'ripgrep',
          argvClass: 'ripgrep-version',
          request: {
            executable: 'rg',
            argv: ['--version'],
            cwd,
            timeoutMs: 5_000,
            maxStdoutBytes: 64 * 1024,
            maxStderrBytes: 16 * 1024,
            terminateGraceMs: 100,
          },
        },
        execution,
      );
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) {
        return;
      }
      const start = executor.startAvailabilityProbe(
        {
          backend: 'ripgrep',
          laneMask: 'expanded-only',
          kind: 'ripgrep-version',
          request: {
            executable: 'rg',
            argv: ['--version'],
            cwd,
            timeoutMs: 5_000,
            maxStdoutBytes: 64 * 1024,
            maxStderrBytes: 16 * 1024,
            terminateGraceMs: 100,
          },
        },
        prepared.prepared,
        signal,
        execution,
      );
      const startView = executor.requireStart(start, execution);
      expect(startView.ordinal).toBe(1);
      const settled = await executor.settlePhysicalAttempt(start, execution);
      const resultView = executor.requireResult(settled, execution);
      expect(resultView.ordinal).toBe(1);
      const other = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      expect(() => executor.requireStart(start, other)).toThrow();

      // production searchViews：独立 execution，必须登记 ripgrep-group streaming starts
      const executionProd =
        createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const signalProd = new AbortController().signal;
      const countingProd = new CountingRunnerV2(new NodeSafeProcessRunner());
      const contextProd = createBackendExecutionContextV2(
        countingProd,
        undefined,
        signalProd,
        executionProd,
      );
      const request = {
        base: {
          repositoryRoot: cwd,
          terms: [{ value: 'Foo', caseSensitive: true }],
          anchors: [],
          negativeTerms: [],
          layers: [],
        },
        expandedMaxHits: 800,
        legacyMaxHits: 10,
      };
      const handoff = await new RipgrepBackend(
        new NodeSafeProcessRunner(),
      ).searchViews(request, signalProd, contextProd, executionProd);
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'ripgrep',
        request,
        contextProd,
        executionProd,
      );
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      // bare-runner mutation 证伪：groups 必须走 runStreaming，不能只靠 buffered run
      expect(countingProd.streamCount).toBeGreaterThanOrEqual(1);
      expect(
        countingProd.streamArgv.some((argv) => argv.includes('--json')),
      ).toBe(true);
      const outcome = requireBackendExecutionOutcomeV2(
        view.expandedOutcome,
        executionProd,
      );
      expect(outcome.hitCount).toBeGreaterThan(0);
      // availability probe 与 search groups 均走 streaming；不得用 buffered run 绕过
      expect(countingProd.runCount).toBe(0);
      expect(countingProd.streamCount).toBeGreaterThanOrEqual(2);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('maps a nonzero streaming completion to process-exit', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-avail-nonzero-'));
    try {
      const stub = new StubStreamingRunnerV2({
        ok: true,
        kind: 'completed',
        startState: 'started',
        exitCode: 7,
        terminationSignal: null,
        stdout: { kind: 'complete', value: Buffer.from('ripgrep 99') },
        stderr: new Uint8Array(),
      });
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const signal = new AbortController().signal;
      const context = createBackendExecutionContextV2(
        stub,
        undefined,
        signal,
        execution,
      );
      const executor = requireBackendPhysicalAttemptExecutorV2(
        context,
        'ripgrep',
        execution,
      );
      const requestValue: SafeProcessRequest = {
        executable: 'rg',
        argv: ['--version'],
        cwd,
        timeoutMs: 5_000,
        maxStdoutBytes: 64 * 1024,
        maxStderrBytes: 16 * 1024,
        terminateGraceMs: 100,
      };
      const prepared = await executor.prepareAvailabilityProbe(
        {
          backend: 'ripgrep',
          argvClass: 'ripgrep-version',
          request: requestValue,
        },
        execution,
      );
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) {
        return;
      }
      const start = executor.startAvailabilityProbe(
        {
          backend: 'ripgrep',
          laneMask: 'expanded-and-legacy',
          kind: 'ripgrep-version',
          request: requestValue,
        },
        prepared.prepared,
        signal,
        execution,
      );
      const settled = await executor.settlePhysicalAttempt(start, execution);
      expect(executor.requireResult(settled, execution).result).toMatchObject({
        ok: false,
        kind: 'process-exit',
        exitCode: 7,
        terminationSignal: null,
      });
      expect(stub.runStreamingCalls).toBe(1);
      expect(stub.runCalls).toBe(0);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it.each([
    ['not-found', 'executable-not-found'],
    ['permission-denied', 'other-spawn-error'],
    ['other', 'other-spawn-error'],
  ] as const)(
    'maps streaming %s to availability %s',
    async (reason, expected) => {
      const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-avail-map-'));
      try {
        const stub = new StubStreamingRunnerV2({
          ok: false,
          kind: 'other-spawn-error',
          startState: 'no-child',
          spawnFailureReason: reason,
          exitCode: null,
          terminationSignal: null,
          stdout: { kind: 'unavailable' },
          stderr: new Uint8Array(),
        });
        const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
        const signal = new AbortController().signal;
        const context = createBackendExecutionContextV2(
          stub,
          undefined,
          signal,
          execution,
        );
        const executor = requireBackendPhysicalAttemptExecutorV2(
          context,
          'ripgrep',
          execution,
        );
        const requestValue: SafeProcessRequest = {
          executable: 'rg',
          argv: ['--version'],
          cwd,
          timeoutMs: 5_000,
          maxStdoutBytes: 64 * 1024,
          maxStderrBytes: 16 * 1024,
          terminateGraceMs: 100,
        };
        const prepared = await executor.prepareAvailabilityProbe(
          {
            backend: 'ripgrep',
            argvClass: 'ripgrep-version',
            request: requestValue,
          },
          execution,
        );
        expect(prepared.ok).toBe(true);
        if (!prepared.ok) {
          return;
        }
        const start = executor.startAvailabilityProbe(
          {
            backend: 'ripgrep',
            laneMask: 'expanded-and-legacy',
            kind: 'ripgrep-version',
            request: requestValue,
          },
          prepared.prepared,
          signal,
          execution,
        );
        const settled = await executor.settlePhysicalAttempt(start, execution);
        expect(executor.requireResult(settled, execution).result).toMatchObject(
          {
            ok: false,
            kind: expected,
          },
        );
        expect(stub.runStreamingCalls).toBe(1);
        expect(stub.runCalls).toBe(0);
        expect(stub.consumers[0]).toBeInstanceOf(BoundedByteCollectorV2);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  );
});
