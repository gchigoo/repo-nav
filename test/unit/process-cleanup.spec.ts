import { spawn, spawnSync } from 'node:child_process';
import { getEventListeners } from 'node:events';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import type {
  RepositoryReadLimits,
  SafeProcessRequest,
  SafeProcessResult,
} from '../../src/contracts/index.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { isSelected } from '../../testkit/testing/selection.js';

interface ProcessInventory {
  readonly parentPid: number;
  readonly descendantPid: number;
}

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const helperPath = resolve(
  repositoryRoot,
  'testkit',
  'fixtures',
  'process',
  'process-helper.ts',
);
const tsxLoaderUrl = pathToFileURL(
  resolve(repositoryRoot, 'node_modules', 'tsx', 'dist', 'loader.mjs'),
).href;

const cleanupIdentity = {
  group: 'process-cleanup',
  caseId: 'reader-abort-no-late-completion',
} as const;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for process cleanup evidence.');
    }
    await delay(20);
  }
}

function readInventory(pidFile: string): ProcessInventory {
  const parsed: unknown = JSON.parse(readFileSync(pidFile, 'utf8'));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('parentPid' in parsed) ||
    !('descendantPid' in parsed) ||
    typeof parsed.parentPid !== 'number' ||
    typeof parsed.descendantPid !== 'number'
  ) {
    throw new Error('Process helper produced an invalid inventory.');
  }
  return {
    parentPid: parsed.parentPid,
    descendantPid: parsed.descendantPid,
  };
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined;
    if (code === 'ESRCH') {
      return false;
    }
    throw error;
  }
}

async function expectInventoryStopped(inventory: ProcessInventory): Promise<void> {
  await waitFor(
    () =>
      !isProcessAlive(inventory.parentPid) &&
      !isProcessAlive(inventory.descendantPid),
  );
  expect(isProcessAlive(inventory.parentPid)).toBe(false);
  expect(isProcessAlive(inventory.descendantPid)).toBe(false);
}

function forceCleanup(inventory: ProcessInventory | undefined): void {
  if (inventory === undefined) {
    return;
  }
  if (process.platform === 'win32') {
    spawnSync(
      'taskkill.exe',
      ['/PID', String(inventory.parentPid), '/T', '/F'],
      { stdio: 'ignore', windowsHide: true },
    );
    spawnSync(
      'taskkill.exe',
      ['/PID', String(inventory.descendantPid), '/T', '/F'],
      { stdio: 'ignore', windowsHide: true },
    );
    return;
  }
  for (const pid of [inventory.parentPid, inventory.descendantPid]) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : undefined;
      if (code !== 'ESRCH') {
        throw error;
      }
    }
  }
}

function treeRequest(
  cwd: string,
  pidFile: string,
  overrides: Partial<SafeProcessRequest> = {},
  helperArgs: readonly string[] = [],
): SafeProcessRequest {
  return {
    executable: process.execPath,
    argv: [
      '--import',
      tsxLoaderUrl,
      helperPath,
      'tree',
      pidFile,
      ...helperArgs,
    ],
    cwd,
    timeoutMs: 5_000,
    maxStdoutBytes: 16 * 1024,
    maxStderrBytes: 16 * 1024,
    terminateGraceMs: 100,
    ...overrides,
  };
}

function expectTermination(
  result: SafeProcessResult,
  kind: 'aborted' | 'timeout' | 'stdout-limit' | 'stderr-limit',
): void {
  expect(result).toMatchObject({ ok: false, kind });
}

class FailingTreeTerminationRunner extends NodeSafeProcessRunner {
  public readonly forceAttempts: boolean[] = [];

  protected override terminateProcessTree(
    _pid: number,
    force: boolean,
  ): Promise<void> {
    this.forceAttempts.push(force);
    return Promise.reject(new Error('synthetic termination failure'));
  }

  protected override killDirectChild(
    child: ReturnType<typeof spawn>,
  ): void {
    queueMicrotask(() => {
      child.emit('error', new Error('synthetic direct kill failure'));
    });
  }
}

describe.runIf(isSelected(cleanupIdentity))('process and reader cleanup', () => {
  it('terminates direct child and descendant on caller abort and settles once', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-process-abort-'));
    const pidFile = resolve(cwd, 'pids.json');
    const controller = new AbortController();
    let inventory: ProcessInventory | undefined;
    let settlements = 0;
    try {
      const runPromise = new NodeSafeProcessRunner().run(
        treeRequest(cwd, pidFile),
        controller.signal,
      );
      void runPromise.then(
        () => {
          settlements += 1;
        },
        () => {
          settlements += 1;
        },
      );
      await waitFor(() => existsSync(pidFile));
      inventory = readInventory(pidFile);
      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(1);

      controller.abort();
      const result = await runPromise;
      expectTermination(result, 'aborted');
      await expectInventoryStopped(inventory);
      await delay(150);
      expect(settlements).toBe(1);
      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    } finally {
      forceCleanup(inventory);
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  // macOS-intel CI can exceed vitest's 5s default under load; keep assertion tight, budget roomy.
  it('terminates direct child and descendant on timeout', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-process-timeout-'));
    const pidFile = resolve(cwd, 'pids.json');
    let inventory: ProcessInventory | undefined;
    try {
      const result = await new NodeSafeProcessRunner().run(
        treeRequest(cwd, pidFile, { timeoutMs: 500 }),
        new AbortController().signal,
      );
      await waitFor(() => existsSync(pidFile));
      inventory = readInventory(pidFile);
      expectTermination(result, 'timeout');
      await expectInventoryStopped(inventory);
    } finally {
      forceCleanup(inventory);
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 15_000);

  it.each([
    ['stdout', 'stdout-limit'],
    ['stderr', 'stderr-limit'],
  ] as const)(
    'terminates direct child and descendant when %s exactly reaches its cap',
    async (stream, kind) => {
      const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-process-cap-'));
      const pidFile = resolve(cwd, 'pids.json');
      let inventory: ProcessInventory | undefined;
      try {
        const result = await new NodeSafeProcessRunner().run(
          treeRequest(
            cwd,
            pidFile,
            stream === 'stdout'
              ? { maxStdoutBytes: 1024 }
              : { maxStderrBytes: 1024 },
            [stream, '1024'],
          ),
          new AbortController().signal,
        );
        await waitFor(() => existsSync(pidFile));
        inventory = readInventory(pidFile);
        expectTermination(result, kind);
        expect(result[stream]).toHaveLength(1024);
        await expectInventoryStopped(inventory);
      } finally {
        forceCleanup(inventory);
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  );

  it('rejects within a fixed cleanup deadline when tree termination fails', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-process-fail-'));
    const pidFile = resolve(cwd, 'pids.json');
    const controller = new AbortController();
    const runner = new FailingTreeTerminationRunner();
    const startedAt = Date.now();
    let inventory: ProcessInventory | undefined;
    try {
      const runPromise = runner.run(
        treeRequest(cwd, pidFile, { timeoutMs: 500, terminateGraceMs: 50 }),
        controller.signal,
      );
      await waitFor(() => existsSync(pidFile));
      inventory = readInventory(pidFile);
      await expect(runPromise).rejects.toThrow(
        'Safe process cleanup invariant failed.',
      );
      expect(Date.now() - startedAt).toBeLessThan(3_000);
      expect(runner.forceAttempts).toEqual([false, true]);
      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    } finally {
      forceCleanup(inventory);
      if (inventory !== undefined) {
        await expectInventoryStopped(inventory);
      }
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('rejects an aborted reader without late fulfillment and closes its handle', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-reader-abort-'));
    const file = resolve(repository, 'large.txt');
    const renamed = resolve(repository, 'renamed.txt');
    writeFileSync(file, Buffer.alloc(16 * 1024 * 1024, 65));
    const limits: RepositoryReadLimits = {
      maxFileBytes: 20 * 1024 * 1024,
      maxExcerptBytes: 20 * 1024 * 1024,
      maxExcerptLines: 10,
    };
    const controller = new AbortController();
    let fulfillments = 0;
    try {
      const readPromise = new NodeRepositoryReader()
        .readRange(repository, 'large.txt', [1, 1], limits, controller.signal)
        .then((value) => {
          fulfillments += 1;
          return value;
        });
      setTimeout(() => controller.abort(), 0);

      await expect(readPromise).rejects.toMatchObject({
        code: 'ABORTED',
      });
      renameSync(file, renamed);
      await delay(100);
      expect(fulfillments).toBe(0);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
