import type { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  SafeProcessRequest,
  SafeProcessResult,
  SafeProcessStreamingResultV2,
  SafeStdoutConsumerV2,
} from '../../src/contracts/safe-process.js';
import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import { createMultiViewBackendSearchRequestV2 } from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import {
  createBackendExecutionContextV2,
  requireBackendDiscoveryHandoffForF3V2,
  requireBackendExecutionOutcomeV2,
} from '../../src/process/backend-execution-context-v2.js';
import { BoundedByteCollectorV2 } from '../../src/process/bounded-byte-collector-v2.js';
import { projectBufferedCompatibilityResultV2 } from '../../src/process/buffered-compatibility-projection-v2.js';
import { SafeProcessExecutionKernelV2 } from '../../src/process/safe-process-execution-kernel-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import { isSelected } from '../../testkit/testing/selection.js';

class SpawnFailureKernelRunner extends NodeSafeProcessRunner {
  public readonly streamingResults: SafeProcessStreamingResultV2<
    Uint8Array,
    Uint8Array
  >[] = [];

  public constructor(private readonly spawnImpl: typeof spawn) {
    super();
  }

  public override async run(
    request: SafeProcessRequest,
    signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    const collector = new BoundedByteCollectorV2();
    const streaming = await this.runStreaming(request, signal, collector);
    return projectBufferedCompatibilityResultV2(streaming);
  }

  public override runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    signal: AbortSignal,
    consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    const kernel = new SafeProcessExecutionKernelV2({
      spawn: this.spawnImpl,
    });
    return kernel.runStreaming(request, signal, consumer).then((streaming) => {
      if (!streaming.ok && streaming.kind === 'other-spawn-error') {
        this.streamingResults.push(streaming);
      }
      return streaming;
    });
  }
}

function failingSpawn(error: Error): typeof spawn {
  return () => {
    throw error;
  };
}

function spawnError(code: string): Error {
  return Object.assign(new Error(`${code}: secret /private/repo-nav-bin`), {
    code,
    path: '/private/repo-nav-bin',
  });
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

class AvailabilityResultRunner extends NodeSafeProcessRunner {
  public runCount = 0;
  public streamCount = 0;

  public constructor(
    private readonly streaming: SafeProcessStreamingResultV2<
      Uint8Array,
      Uint8Array
    >,
  ) {
    super();
  }

  public override run(
    _request: SafeProcessRequest,
    _signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    this.runCount += 1;
    return Promise.reject(new Error('Unexpected buffered availability run.'));
  }

  public override runStreaming<TPartial, TComplete>(
    _request: SafeProcessRequest,
    _signal: AbortSignal,
    _consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    this.streamCount += 1;
    return Promise.resolve(
      this.streaming as SafeProcessStreamingResultV2<TPartial, TComplete>,
    );
  }
}

function requestFor(repositoryRoot: string) {
  return createMultiViewBackendSearchRequestV2(
    {
      repositoryRoot,
      terms: [{ value: 'Foo', caseSensitive: true }],
      anchors: [],
      negativeTerms: [],
      layers: [],
    },
    40,
  );
}

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'production-spawn-failure-wiring',
  }),
)('H3 production spawn-failure wiring', () => {
  it.each(['EACCES', 'EPERM'] as const)(
    'reports a %s spawn failure as backend failed BACKEND_PROCESS_FAILED',
    async (code) => {
      const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-wiring-'));
      try {
        writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
        const runner = new SpawnFailureKernelRunner(
          failingSpawn(spawnError(code)),
        );
        const signal = new AbortController().signal;
        const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
        const context = createBackendExecutionContextV2(
          runner,
          undefined,
          signal,
          execution,
        );
        const request = createMultiViewBackendSearchRequestV2(
          {
            repositoryRoot: repository,
            terms: [{ value: 'Foo', caseSensitive: true }],
            anchors: [],
            negativeTerms: [],
            layers: [],
          },
          40,
        );
        const handoff = await new CodeGraphBackend(runner).searchViews(
          request,
          signal,
          context,
          execution,
        );
        const view = requireBackendDiscoveryHandoffForF3V2(
          handoff,
          'codegraph',
          request,
          context,
          execution,
        );
        expect(view.kind).toBe('started');
        if (view.kind !== 'started') {
          return;
        }
        expect(view.expandedHealth).toEqual({
          state: 'error',
          reasonCode: 'BACKEND_PROCESS_FAILED',
        });
        expect(view.expandedHealth.reasonCode).not.toBe(
          'CODEGRAPH_UNAVAILABLE',
        );
        expect(view.legacy.health.reasonCode).toBe('BACKEND_PROCESS_FAILED');
        const outcome = requireBackendExecutionOutcomeV2(
          view.expandedOutcome,
          execution,
        );
        expect(outcome).toMatchObject({
          backend: 'codegraph',
          status: 'failed',
          reasonCode: 'BACKEND_PROCESS_FAILED',
          hitCount: 0,
        });
        const serialized = JSON.stringify({
          expandedHealth: view.expandedHealth,
          legacy: view.legacy,
          outcome,
        });
        expect(serialized).not.toContain('secret');
        expect(serialized).not.toContain('/private/');
        expect(runner.streamingResults).toHaveLength(1);
        expect(runner.streamingResults[0]).toMatchObject({
          ok: false,
          kind: 'other-spawn-error',
          startState: 'no-child',
          spawnFailureReason: 'permission-denied',
        });
        expect(JSON.stringify(runner.streamingResults[0])).not.toContain(
          'secret',
        );
        expect(JSON.stringify(runner.streamingResults[0])).not.toContain(
          '/private/',
        );
      } finally {
        rmSync(repository, { recursive: true, force: true });
      }
    },
  );

  it.each([
    ['ENOENT', { state: 'unavailable', reasonCode: 'CODEGRAPH_UNAVAILABLE' }],
    ['EACCES', { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' }],
    ['EPERM', { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' }],
    ['EMFILE', { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' }],
  ] as const)(
    'maps CodeGraph direct probe %s without buffered classification loss',
    async (code, expected) => {
      const repository = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-codegraph-probe-'),
      );
      try {
        const runner = new SpawnFailureKernelRunner(
          failingSpawn(spawnError(code)),
        );
        await expect(
          new CodeGraphBackend(runner).probe(
            repository,
            new AbortController().signal,
          ),
        ).resolves.toEqual(expected);
        expect(runner.streamingResults[0]).toMatchObject({
          ok: false,
          kind: 'other-spawn-error',
          spawnFailureReason:
            code === 'ENOENT'
              ? 'not-found'
              : code === 'EACCES' || code === 'EPERM'
                ? 'permission-denied'
                : 'other',
        });
      } finally {
        rmSync(repository, { recursive: true, force: true });
      }
    },
  );

  it.each([
    ['ENOENT', { state: 'missing', reasonCode: 'RIPGREP_UNAVAILABLE' }],
    ['EACCES', { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' }],
    ['EPERM', { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' }],
    ['EMFILE', { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' }],
  ] as const)(
    'maps Ripgrep direct probe %s without buffered classification loss',
    async (code, expected) => {
      const repository = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-ripgrep-probe-'),
      );
      try {
        const runner = new SpawnFailureKernelRunner(
          failingSpawn(spawnError(code)),
        );
        await expect(
          new RipgrepBackend(runner).probe(
            repository,
            new AbortController().signal,
          ),
        ).resolves.toEqual(expected);
        expect(runner.streamingResults[0]).toMatchObject({
          ok: false,
          kind: 'other-spawn-error',
          spawnFailureReason:
            code === 'ENOENT'
              ? 'not-found'
              : code === 'EACCES' || code === 'EPERM'
                ? 'permission-denied'
                : 'other',
        });
      } finally {
        rmSync(repository, { recursive: true, force: true });
      }
    },
  );

  it('rejects nonzero direct availability completions with valid-looking output', async () => {
    const repository = mkdtempSync(
      resolve(tmpdir(), 'repo-nav-direct-nonzero-'),
    );
    try {
      const codegraph = new AvailabilityResultRunner(
        completedAvailability(
          JSON.stringify({ initialized: true, version: '99.0.0' }),
          7,
        ),
      );
      await expect(
        new CodeGraphBackend(codegraph).probe(
          repository,
          new AbortController().signal,
        ),
      ).resolves.toEqual({
        state: 'error',
        reasonCode: 'BACKEND_PROCESS_FAILED',
      });
      const ripgrep = new AvailabilityResultRunner(
        completedAvailability('ripgrep 99.0.0\n', 7),
      );
      await expect(
        new RipgrepBackend(ripgrep).probe(
          repository,
          new AbortController().signal,
        ),
      ).resolves.toEqual({
        state: 'error',
        reasonCode: 'BACKEND_PROCESS_FAILED',
      });
      expect(codegraph.runCount).toBe(0);
      expect(ripgrep.runCount).toBe(0);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it.each([
    [
      'codegraph',
      completedAvailability(
        JSON.stringify({ initialized: true, version: '99.0.0' }),
        7,
      ),
    ],
    ['ripgrep', completedAvailability('ripgrep 99.0.0\n', 7)],
  ] as const)(
    'rejects a nonzero %s searchViews availability completion',
    async (backendId, availability) => {
      const repository = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-views-nonzero-'),
      );
      try {
        const runner = new AvailabilityResultRunner(availability);
        const signal = new AbortController().signal;
        const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
        const context = createBackendExecutionContextV2(
          runner,
          undefined,
          signal,
          execution,
        );
        const request = requestFor(repository);
        const backend =
          backendId === 'codegraph'
            ? new CodeGraphBackend(runner)
            : new RipgrepBackend(runner);
        const handoff = await backend.searchViews(
          request,
          signal,
          context,
          execution,
        );
        const view = requireBackendDiscoveryHandoffForF3V2(
          handoff,
          backendId,
          request,
          context,
          execution,
        );
        expect(view.kind).toBe('started');
        if (view.kind !== 'started') {
          return;
        }
        expect(view.expandedHealth).toEqual({
          state: 'error',
          reasonCode: 'BACKEND_PROCESS_FAILED',
        });
        expect(view.legacy.health).toEqual({
          state: 'error',
          reasonCode: 'BACKEND_PROCESS_FAILED',
        });
        const outcome = requireBackendExecutionOutcomeV2(
          view.expandedOutcome,
          execution,
        );
        expect(outcome).toMatchObject({
          backend: backendId,
          status: 'failed',
          reasonCode: 'BACKEND_PROCESS_FAILED',
          hitCount: 0,
        });
        expect(runner.runCount).toBe(0);
        expect(runner.streamCount).toBe(1);
      } finally {
        rmSync(repository, { recursive: true, force: true });
      }
    },
  );

  it.each(['codegraph', 'ripgrep'] as const)(
    'maps %s availability preparation failure to backend error without a physical start',
    async (backendId) => {
      const repository = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-views-prepare-failure-'),
      );
      const runner = new AvailabilityResultRunner(
        completedAvailability('unused', 0),
      );
      const signal = new AbortController().signal;
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const context = createBackendExecutionContextV2(
        runner,
        undefined,
        signal,
        execution,
      );
      const request = requestFor(repository);
      await rm(repository, { recursive: true, force: true });
      const backend =
        backendId === 'codegraph'
          ? new CodeGraphBackend(runner)
          : new RipgrepBackend(runner);
      const handoff = await backend.searchViews(
        request,
        signal,
        context,
        execution,
      );
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        backendId,
        request,
        context,
        execution,
      );
      expect(view.kind).toBe('no-start');
      if (view.kind !== 'no-start') {
        return;
      }
      expect(view.reason).toBe('availability-preparation-failed');
      expect(view.expandedHealth).toEqual({
        state: 'error',
        reasonCode: 'BACKEND_PROCESS_FAILED',
      });
      expect(view.legacy.health).toEqual({
        state: 'error',
        reasonCode: 'BACKEND_PROCESS_FAILED',
      });
      expect(view.completeSafeHits).toEqual([]);
      expect(runner.runCount).toBe(0);
      expect(runner.streamCount).toBe(0);
      expect(JSON.stringify(view)).not.toContain(repository);
    },
  );

  it('reports an ENOENT spawn failure as executable-not-found / CODEGRAPH_UNAVAILABLE', async () => {
    const repository = mkdtempSync(
      resolve(tmpdir(), 'repo-nav-wiring-enoent-'),
    );
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      const runner = new SpawnFailureKernelRunner(
        failingSpawn(spawnError('ENOENT')),
      );
      const signal = new AbortController().signal;
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const context = createBackendExecutionContextV2(
        runner,
        undefined,
        signal,
        execution,
      );
      const request = createMultiViewBackendSearchRequestV2(
        {
          repositoryRoot: repository,
          terms: [{ value: 'Foo', caseSensitive: true }],
          anchors: [],
          negativeTerms: [],
          layers: [],
        },
        40,
      );
      const handoff = await new CodeGraphBackend(runner).searchViews(
        request,
        signal,
        context,
        execution,
      );
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'codegraph',
        request,
        context,
        execution,
      );
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      expect(view.expandedHealth).toEqual({
        state: 'unavailable',
        reasonCode: 'CODEGRAPH_UNAVAILABLE',
      });
      expect(runner.streamingResults[0]).toMatchObject({
        ok: false,
        kind: 'other-spawn-error',
        startState: 'no-child',
        spawnFailureReason: 'not-found',
      });
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
