import { spawn, spawnSync } from 'node:child_process';
import { getEventListeners } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAX_EXCERPT_BYTES,
  DEFAULT_MAX_EXCERPT_LINES,
  DEFAULT_MAX_FILE_BYTES,
  RepositoryAccessError,
  type SafeProcessRequest,
  type SafeProcessResult,
} from '../../src/contracts/index.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import {
  createPlatformPathTree,
  createPosixSymlinkEscape,
  createWindowsReparseEscape,
} from '../../testkit/fixtures/platform/repository-path-tree.js';
import {
  platformContractIt,
  recordPlatformAssertionMarker,
} from '../../testkit/testing/platform-contract.js';
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

const limits = {
  maxFileBytes: DEFAULT_MAX_FILE_BYTES,
  maxExcerptBytes: DEFAULT_MAX_EXCERPT_BYTES,
  maxExcerptLines: DEFAULT_MAX_EXCERPT_LINES,
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
      throw new Error('Timed out waiting for process evidence.');
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

async function expectInventoryStopped(
  inventory: ProcessInventory,
): Promise<void> {
  await waitFor(
    () =>
      !isProcessAlive(inventory.parentPid) &&
      !isProcessAlive(inventory.descendantPid),
  );
}

/**
 * Best-effort temp cleanup; Windows may keep EPERM briefly after taskkill.
 */
function safeRmTemp(directory: string): void {
  try {
    rmSync(directory, { recursive: true, force: true });
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined;
    if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'ENOTEMPTY') {
      throw error;
    }
  }
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

function helperRequest(
  cwd: string,
  scenario: string,
  helperArgs: readonly string[],
  overrides: Partial<SafeProcessRequest> = {},
): SafeProcessRequest {
  return {
    executable: process.execPath,
    argv: ['--import', tsxLoaderUrl, helperPath, scenario, ...helperArgs],
    cwd,
    timeoutMs: 5_000,
    maxStdoutBytes: 16 * 1024,
    maxStderrBytes: 16 * 1024,
    terminateGraceMs: 100,
    ...overrides,
  };
}

function treeRequest(
  cwd: string,
  pidFile: string,
  overrides: Partial<SafeProcessRequest> = {},
  helperArgs: readonly string[] = [],
): SafeProcessRequest {
  return helperRequest(cwd, 'tree', [pidFile, ...helperArgs], overrides);
}

function expectTermination(
  result: SafeProcessResult,
  kind: 'aborted' | 'timeout' | 'stdout-limit' | 'stderr-limit',
): void {
  expect(result).toMatchObject({ ok: false, kind });
}

class FailingTreeTerminationRunner extends NodeSafeProcessRunner {
  public readonly forceAttempts: boolean[] = [];
  private killAttempts = 0;

  protected override terminateProcessTree(
    _pid: number,
    force: boolean,
  ): Promise<void> {
    this.forceAttempts.push(force);
    return Promise.reject(new Error('synthetic termination failure'));
  }

  protected override killDirectChild(child: ReturnType<typeof spawn>): void {
    this.killAttempts += 1;
    if (this.killAttempts === 1) {
      // 第一次 hard-kill 注入失败，逼出 cleanup invariant。
      queueMicrotask(() => {
        child.emit('error', new Error('synthetic direct kill failure'));
      });
      return;
    }
    // invariant 路径的二次 hard-kill 真正终止 direct child。
    super.killDirectChild(child);
  }
}

describe.runIf(
  isSelected({
    group: 'cross-platform-baseline',
    caseId: 'repository-path-invalid-input',
  }),
)('F4-PATH-001 invalid repository paths', () => {
  platformContractIt(
    'F4-PATH-001',
    'absolute-parent-nonnormalized-rejected',
    'rejects absolute, parent, and non-normalized paths',
    async () => {
      const tree = createPlatformPathTree();
      try {
        const reader = new NodeRepositoryReader();
        const root = await reader.resolveRoot(
          tree.repository,
          new AbortController().signal,
        );
        const invalidPaths = [
          resolve(tree.repository, 'inside.txt'),
          '../outside.txt',
          './inside.txt',
          'folder/../inside.txt',
          'folder\\inside.txt',
        ];
        for (const relativeFile of invalidPaths) {
          await expect(
            reader.readRange(
              root,
              relativeFile,
              [1, 1],
              limits,
              new AbortController().signal,
            ),
          ).rejects.toMatchObject({ code: 'INVALID_RELATIVE_PATH' });
        }
      } finally {
        tree.cleanup();
      }
    },
  );
});

describe.runIf(
  isSelected({
    group: 'cross-platform-baseline',
    caseId: 'repository-path-posix-symlink-escape',
  }) && process.platform !== 'win32',
)('F4-PATH-002 POSIX symlink escape', () => {
  platformContractIt(
    'F4-PATH-002',
    'posix-symlink-escape-rejected',
    'rejects POSIX symlink escapes outside the repository root',
    async () => {
      const tree = createPlatformPathTree();
      try {
        createPosixSymlinkEscape(tree);
        const reader = new NodeRepositoryReader();
        const root = await reader.resolveRoot(
          tree.repository,
          new AbortController().signal,
        );
        await expect(
          reader.readRange(
            root,
            'escape/secret.txt',
            [1, 1],
            limits,
            new AbortController().signal,
          ),
        ).rejects.toMatchObject({ code: 'PATH_OUTSIDE_ROOT' });
      } finally {
        tree.cleanup();
      }
    },
  );
});

describe.runIf(
  isSelected({
    group: 'cross-platform-baseline',
    caseId: 'repository-path-windows-reparse-escape',
  }) && process.platform === 'win32',
)('F4-PATH-003 Windows reparse escape', () => {
  platformContractIt(
    'F4-PATH-003',
    'windows-reparse-escape-rejected',
    'rejects Windows junction/reparse escapes outside the repository root',
    async () => {
      const tree = createPlatformPathTree();
      try {
        createWindowsReparseEscape(tree);
        const reader = new NodeRepositoryReader();
        const root = await reader.resolveRoot(
          tree.repository,
          new AbortController().signal,
        );
        await expect(
          reader.readRange(
            root,
            'escape/secret.txt',
            [1, 1],
            limits,
            new AbortController().signal,
          ),
        ).rejects.toMatchObject({ code: 'PATH_OUTSIDE_ROOT' });
      } finally {
        tree.cleanup();
      }
    },
  );
});

describe.runIf(
  isSelected({
    group: 'cross-platform-baseline',
    caseId: 'repository-path-error-redaction',
  }),
)('F4-PATH-004 path error redaction', () => {
  platformContractIt(
    'F4-PATH-004',
    'absolute-root-not-serialized',
    'typed path errors do not serialize absolute temp roots',
    async () => {
      const tree = createPlatformPathTree();
      try {
        const reader = new NodeRepositoryReader();
        const root = await reader.resolveRoot(
          tree.repository,
          new AbortController().signal,
        );
        let caught: unknown;
        try {
          await reader.readRange(
            root,
            resolve(tree.repository, 'inside.txt'),
            [1, 1],
            limits,
            new AbortController().signal,
          );
        } catch (error: unknown) {
          caught = error;
        }
        expect(caught).toBeInstanceOf(RepositoryAccessError);
        const serialized = JSON.stringify(caught);
        expect(serialized).not.toContain(tree.workspace);
        expect(serialized).not.toContain(tree.repository);
        if (caught instanceof RepositoryAccessError) {
          expect(caught.message).not.toContain(tree.workspace);
          expect(caught.message).not.toContain(tree.repository);
        }
      } finally {
        tree.cleanup();
      }
    },
  );
});

describe.runIf(
  isSelected({
    group: 'cross-platform-baseline',
    caseId: 'process-caller-abort-tree-cleanup',
  }),
)('F4-PROC-001 caller abort tree cleanup', () => {
  it('proves abort, single settlement, and owned tree death', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f4-abort-'));
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
      recordPlatformAssertionMarker('F4-PROC-001', 'aborted-result');
      recordPlatformAssertionMarker('F4-PROC-001', 'settled-once');
      recordPlatformAssertionMarker('F4-PROC-001', 'owned-tree-dead');
    } finally {
      forceCleanup(inventory);
      safeRmTemp(cwd);
    }
  });
});

describe.runIf(
  isSelected({
    group: 'cross-platform-baseline',
    caseId: 'process-timeout-tree-cleanup',
  }),
)('F4-PROC-002 timeout tree cleanup', () => {
  it('proves timeout, single settlement, and owned tree death', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f4-timeout-'));
    const pidFile = resolve(cwd, 'pids.json');
    let inventory: ProcessInventory | undefined;
    let settlements = 0;
    try {
      const runPromise = new NodeSafeProcessRunner().run(
        treeRequest(cwd, pidFile, { timeoutMs: 2_000 }),
        new AbortController().signal,
      );
      void runPromise.then(
        () => {
          settlements += 1;
        },
        () => {
          settlements += 1;
        },
      );
      // Wait for inventory before timeout settles (macOS-intel spawn latency).
      await waitFor(() => existsSync(pidFile), 15_000);
      inventory = readInventory(pidFile);
      const result = await runPromise;
      expectTermination(result, 'timeout');
      await expectInventoryStopped(inventory);
      await delay(150);
      expect(settlements).toBe(1);
      recordPlatformAssertionMarker('F4-PROC-002', 'timeout-result');
      recordPlatformAssertionMarker('F4-PROC-002', 'settled-once');
      recordPlatformAssertionMarker('F4-PROC-002', 'owned-tree-dead');
    } finally {
      forceCleanup(inventory);
      safeRmTemp(cwd);
    }
  }, 20_000);
});

describe.runIf(
  isSelected({
    group: 'cross-platform-baseline',
    caseId: 'process-stdout-n-plus-one-boundary',
  }),
)('F4-PROC-003 stdout N+1 boundary', () => {
  it('keeps exact-N success and N+1 stdout-limit', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f4-stdout-'));
    const pidFileLimit = resolve(cwd, 'limit.json');
    let inventory: ProcessInventory | undefined;
    try {
      const success = await new NodeSafeProcessRunner().run(
        helperRequest(cwd, 'output', ['stdout', '1024'], {
          maxStdoutBytes: 1024,
        }),
        new AbortController().signal,
      );
      expect(success.ok).toBe(true);
      expect(success.stdout).toHaveLength(1024);
      recordPlatformAssertionMarker('F4-PROC-003', 'exact-n-success');

      const limited = await new NodeSafeProcessRunner().run(
        treeRequest(cwd, pidFileLimit, { maxStdoutBytes: 1024 }, [
          'stdout',
          '1025',
        ]),
        new AbortController().signal,
      );
      await waitFor(() => existsSync(pidFileLimit));
      inventory = readInventory(pidFileLimit);
      expectTermination(limited, 'stdout-limit');
      expect(limited.stdout).toHaveLength(1024);
      await expectInventoryStopped(inventory);
      recordPlatformAssertionMarker('F4-PROC-003', 'n-plus-one-limit');
      recordPlatformAssertionMarker('F4-PROC-003', 'owned-tree-dead');
    } finally {
      forceCleanup(inventory);
      safeRmTemp(cwd);
    }
  });
});

describe.runIf(
  isSelected({
    group: 'cross-platform-baseline',
    caseId: 'process-stderr-n-plus-one-boundary',
  }),
)('F4-PROC-004 stderr N+1 boundary', () => {
  it('keeps exact-N success and N+1 stderr-limit', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f4-stderr-'));
    const pidFileLimit = resolve(cwd, 'limit.json');
    let inventory: ProcessInventory | undefined;
    try {
      const success = await new NodeSafeProcessRunner().run(
        helperRequest(cwd, 'output', ['stderr', '1024'], {
          maxStderrBytes: 1024,
        }),
        new AbortController().signal,
      );
      expect(success.ok).toBe(true);
      expect(success.stderr).toHaveLength(1024);
      recordPlatformAssertionMarker('F4-PROC-004', 'exact-n-success');

      const limited = await new NodeSafeProcessRunner().run(
        treeRequest(cwd, pidFileLimit, { maxStderrBytes: 1024 }, [
          'stderr',
          '1025',
        ]),
        new AbortController().signal,
      );
      await waitFor(() => existsSync(pidFileLimit));
      inventory = readInventory(pidFileLimit);
      expectTermination(limited, 'stderr-limit');
      expect(limited.stderr).toHaveLength(1024);
      await expectInventoryStopped(inventory);
      recordPlatformAssertionMarker('F4-PROC-004', 'n-plus-one-limit');
      recordPlatformAssertionMarker('F4-PROC-004', 'owned-tree-dead');
    } finally {
      forceCleanup(inventory);
      safeRmTemp(cwd);
    }
  });
});

describe.runIf(
  isSelected({
    group: 'cross-platform-baseline',
    caseId: 'process-cleanup-invariant-fault',
  }),
)('F4-PROC-005 cleanup invariant fault', () => {
  it('records fixed invariant, direct child death, and descendant observation', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f4-fault-'));
    const pidFile = resolve(cwd, 'pids.json');
    const controller = new AbortController();
    const runner = new FailingTreeTerminationRunner();
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
      expect(runner.forceAttempts).toEqual([false, true]);
      recordPlatformAssertionMarker('F4-PROC-005', 'fixed-invariant');
      await waitFor(() => !isProcessAlive(inventory!.parentPid));
      recordPlatformAssertionMarker('F4-PROC-005', 'direct-child-dead');
      const descendantAliveBeforeHarness = isProcessAlive(
        inventory.descendantPid,
      );
      expect(typeof descendantAliveBeforeHarness).toBe('boolean');
      recordPlatformAssertionMarker(
        'F4-PROC-005',
        'descendant-observed-before-harness-cleanup',
      );
    } finally {
      forceCleanup(inventory);
      if (inventory !== undefined) {
        await expectInventoryStopped(inventory);
      }
      safeRmTemp(cwd);
    }
  });
});
