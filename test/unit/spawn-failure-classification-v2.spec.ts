import type {
  ChildProcess,
  ChildProcessWithoutNullStreams,
  spawn,
} from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { SafeProcessRequest } from '../../src/contracts/safe-process.js';
import { BoundedByteCollectorV2 } from '../../src/process/bounded-byte-collector-v2.js';
import { projectBufferedCompatibilityResultV2 } from '../../src/process/buffered-compatibility-projection-v2.js';
import { SafeProcessExecutionKernelV2 } from '../../src/process/safe-process-execution-kernel-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function request(cwd: string): SafeProcessRequest {
  return {
    executable: 'repo-nav-does-not-exist',
    argv: [],
    cwd,
    timeoutMs: 5_000,
    maxStdoutBytes: 1024,
    maxStderrBytes: 1024,
    terminateGraceMs: 100,
  };
}

function throwingSpawn(thrown: unknown): typeof spawn {
  return () => {
    throw thrown;
  };
}

async function runKernelWithSpawnThrow(thrown: unknown): Promise<unknown> {
  const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-spawn-class-'));
  try {
    const kernel = new SafeProcessExecutionKernelV2({
      spawn: throwingSpawn(thrown),
    });
    return await kernel.runStreaming(
      request(cwd),
      new AbortController().signal,
      new BoundedByteCollectorV2(),
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function kernelWithPreSpawnChildError(
  error: unknown,
): SafeProcessExecutionKernelV2 {
  return new SafeProcessExecutionKernelV2({
    spawn: (() => {
      const child =
        new EventEmitter() as unknown as ChildProcessWithoutNullStreams;
      const cast = child as unknown as {
        stdout: EventEmitter;
        stderr: EventEmitter;
        pid: number | undefined;
      };
      cast.stdout = new EventEmitter();
      cast.stderr = new EventEmitter();
      cast.pid = undefined;
      process.nextTick(() => {
        child.emit('error', error);
      });
      return child as unknown as ChildProcess;
    }) as typeof spawn,
  });
}

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'spawn-failure-classification',
  }),
)('H3 spawn-failure classification', () => {
  it.each([
    ['ENOENT', 'not-found'],
    ['EACCES', 'permission-denied'],
    ['EPERM', 'permission-denied'],
    ['EMFILE', 'other'],
  ] as const)('classifies %s', async (code, expected) => {
    const streaming = await runKernelWithSpawnThrow(
      Object.assign(new Error('secret /private/bin'), { code }),
    );
    expect(streaming).toMatchObject({
      ok: false,
      kind: 'other-spawn-error',
      startState: 'no-child',
      spawnFailureReason: expected,
    });
    const buffered = projectBufferedCompatibilityResultV2(
      streaming as Parameters<typeof projectBufferedCompatibilityResultV2>[0],
    );
    expect(Object.keys(buffered).sort()).toEqual([
      'exitCode',
      'kind',
      'ok',
      'stderr',
      'stdout',
      'terminationSignal',
    ]);
    expect(JSON.stringify(streaming)).not.toContain('secret');
    expect(JSON.stringify(streaming)).not.toContain('/private/bin');
    expect(JSON.stringify(buffered)).not.toContain('secret');
    expect(JSON.stringify(buffered)).not.toContain('/private/bin');
  });

  it('classifies non-code and non-object throws as other', async () => {
    const fromString = await runKernelWithSpawnThrow('plain string');
    expect(fromString).toMatchObject({
      ok: false,
      kind: 'other-spawn-error',
      startState: 'no-child',
      spawnFailureReason: 'other',
    });
    const fromNull = await runKernelWithSpawnThrow(null);
    expect(fromNull).toMatchObject({
      ok: false,
      kind: 'other-spawn-error',
      startState: 'no-child',
      spawnFailureReason: 'other',
    });
  });

  it.each([
    [
      'getter',
      Object.defineProperty({}, 'code', {
        get: () => {
          throw new Error('getter secret /private/bin');
        },
      }),
    ],
    [
      'proxy',
      new Proxy(
        {},
        {
          get: () => {
            throw new Error('proxy secret /private/bin');
          },
        },
      ),
    ],
  ] as const)(
    'fails closed for a hostile %s during a synchronous throw',
    async (_kind, thrown) => {
      const streaming = await runKernelWithSpawnThrow(thrown);
      expect(streaming).toMatchObject({
        ok: false,
        kind: 'other-spawn-error',
        startState: 'no-child',
        spawnFailureReason: 'other',
      });
      expect(JSON.stringify(streaming)).not.toContain('secret');
      expect(JSON.stringify(streaming)).not.toContain('/private/');
    },
  );

  it('classifies a pre-spawn child error event and discards the raw error', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-spawn-event-'));
    try {
      const kernel = kernelWithPreSpawnChildError(
        Object.assign(new Error('secret /private/bin'), { code: 'EACCES' }),
      );
      const streaming = await kernel.runStreaming(
        request(cwd),
        new AbortController().signal,
        new BoundedByteCollectorV2(),
      );
      expect(streaming).toMatchObject({
        ok: false,
        kind: 'other-spawn-error',
        startState: 'no-child',
        spawnFailureReason: 'permission-denied',
      });
      expect(JSON.stringify(streaming)).not.toContain('secret');
      expect(JSON.stringify(streaming)).not.toContain('/private/bin');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it.each([
    [
      'getter',
      Object.defineProperty({}, 'code', {
        get: () => {
          throw new Error('event getter secret /private/bin');
        },
      }),
    ],
    [
      'proxy',
      new Proxy(
        {},
        {
          get: () => {
            throw new Error('event proxy secret /private/bin');
          },
        },
      ),
    ],
  ] as const)(
    'fails closed for a hostile %s on a pre-spawn child error event',
    async (_kind, hostile) => {
      const cwd = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-spawn-hostile-event-'),
      );
      try {
        const kernel = kernelWithPreSpawnChildError(hostile);
        const streaming = await kernel.runStreaming(
          request(cwd),
          new AbortController().signal,
          new BoundedByteCollectorV2(),
        );
        expect(streaming).toMatchObject({
          ok: false,
          kind: 'other-spawn-error',
          startState: 'no-child',
          spawnFailureReason: 'other',
        });
        expect(JSON.stringify(streaming)).not.toContain('secret');
        expect(JSON.stringify(streaming)).not.toContain('/private/');
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  );

  it('does not carry a reason on invalid-request no-child results', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-spawn-invalid-'));
    try {
      const kernel = new SafeProcessExecutionKernelV2();
      const streaming = await kernel.runStreaming(
        { ...request(cwd), timeoutMs: Number.NaN },
        new AbortController().signal,
        new BoundedByteCollectorV2(),
      );
      expect(streaming).toMatchObject({
        ok: false,
        kind: 'invalid-request',
        startState: 'no-child',
      });
      expect('spawnFailureReason' in streaming).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('does not carry a reason on aborted no-child results', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-spawn-aborted-'));
    try {
      const kernel = new SafeProcessExecutionKernelV2();
      const streaming = await kernel.runStreaming(
        request(cwd),
        AbortSignal.abort(),
        new BoundedByteCollectorV2(),
      );
      expect(streaming).toMatchObject({
        ok: false,
        kind: 'aborted',
        startState: 'no-child',
      });
      expect('spawnFailureReason' in streaming).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
