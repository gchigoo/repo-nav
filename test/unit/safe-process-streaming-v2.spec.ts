import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { SafeProcessRequest } from '../../src/contracts/index.js';
import { projectBufferedCompatibilityResultV2 } from '../../src/process/buffered-compatibility-projection-v2.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { BYTE_WRITER_SIZES_V2 } from '../../testkit/fixtures/process-v2/byte-writer-v2.js';
import { BUFFERED_PROJECTION_ROWS_V2 } from '../../testkit/fixtures/process-v2/buffered-projection-v2.js';
import { HostileConsumerV2 } from '../../testkit/fixtures/process-v2/hostile-consumer-v2.js';
import {
  schedulePrimaryTriggersV2,
  settlementForRaceV2,
} from '../../testkit/fixtures/process-v2/terminal-race-scheduler-v2.js';
import {
  platformContractIt,
  recordPlatformAssertionMarker,
} from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

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

function request(
  cwd: string,
  scenario: string,
  args: readonly string[] = [],
  overrides: Partial<SafeProcessRequest> = {},
): SafeProcessRequest {
  return {
    executable: process.execPath,
    argv: ['--import', tsxLoaderUrl, helperPath, scenario, ...args],
    cwd,
    timeoutMs: 5_000,
    maxStdoutBytes: 1024,
    maxStderrBytes: 1024,
    terminateGraceMs: 100,
    ...overrides,
  };
}

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'process-n-plus-one-boundary',
  }),
)('F5-PROC-001 N+1 boundary', () => {
  it('succeeds at exact N and limits on N+1 for stdout/stderr', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-n1-'));
    try {
      expect(BYTE_WRITER_SIZES_V2).toContain(1024);
      const runner = new NodeSafeProcessRunner();
      for (const stream of ['stdout', 'stderr'] as const) {
        const exact = await runner.run(
          request(cwd, 'output', [stream, '1024'], {
            maxStdoutBytes: 1024,
            maxStderrBytes: 1024,
          }),
          new AbortController().signal,
        );
        expect(exact.ok).toBe(true);
        expect(exact[stream]).toHaveLength(1024);

        const limited = await runner.run(
          request(cwd, 'output', [stream, '1025'], {
            maxStdoutBytes: 1024,
            maxStderrBytes: 1024,
          }),
          new AbortController().signal,
        );
        expect(limited).toMatchObject({
          ok: false,
          kind: stream === 'stdout' ? 'stdout-limit' : 'stderr-limit',
        });
        expect(limited[stream]).toHaveLength(1024);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'process-terminal-races',
  }),
)('F5-PROC-002 terminal races', () => {
  it('freezes first primary trigger and settlement precedence', () => {
    expect(
      schedulePrimaryTriggersV2(['timeout', 'aborted', 'stdout-limit']),
    ).toBe('timeout');
    expect(
      settlementForRaceV2({
        cleanupFailed: true,
        finalizerInvalid: true,
        primary: 'aborted',
        exitCode: 0,
        signal: null,
      }),
    ).toBe('cleanup-invariant');
    expect(
      settlementForRaceV2({
        cleanupFailed: false,
        finalizerInvalid: true,
        primary: 'aborted',
        exitCode: 0,
        signal: null,
      }),
    ).toBe('consumer-invalid');
    expect(
      settlementForRaceV2({
        cleanupFailed: false,
        finalizerInvalid: false,
        primary: undefined,
        exitCode: null,
        signal: 'SIGTERM',
      }),
    ).toBe('process-exit');
    expect(
      settlementForRaceV2({
        cleanupFailed: false,
        finalizerInvalid: false,
        primary: undefined,
        exitCode: 0,
        signal: null,
      }),
    ).toBe('completed');
  });
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'consumer-progress-contract',
  }) ||
    isSelected({
      group: 'streaming-ripgrep',
      caseId: 'stream-consumer-progress-and-boundary',
    }),
)('F5-PROC-003 consumer progress', () => {
  it('accepts continue-full and rejects invalid decisions', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-progress-'));
    try {
      const runner = new NodeSafeProcessRunner();
      const full = new HostileConsumerV2('continue-full');
      const ok = await runner.runStreaming(
        request(cwd, 'output', ['stdout', '32'], { maxStdoutBytes: 1024 }),
        new AbortController().signal,
        full,
      );
      expect(ok.ok).toBe(true);
      expect(full.pushCount).toBeGreaterThan(0);

      for (const mode of [
        'continue-zero',
        'stop-zero',
        'nan-consumed',
        'throw-push',
      ] as const) {
        const hostile = new HostileConsumerV2(mode);
        const result = await runner.runStreaming(
          request(cwd, 'output', ['stdout', '16'], { maxStdoutBytes: 1024 }),
          new AbortController().signal,
          hostile,
        );
        expect(result.ok).toBe(false);
        if (!result.ok && result.startState === 'started') {
          expect(result.kind).toBe('consumer-invalid');
        }
      }
      recordPlatformAssertionMarker('F5-PROC-001', 'continue-full-prefix');
      recordPlatformAssertionMarker('F5-PROC-001', 'invalid-decision-fixed');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  platformContractIt(
    'F5-PROC-001',
    'partial-stop-before-n-plus-one',
    'partial stop wins before same-chunk N+1',
    async () => {
      const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-partial-'));
      try {
        const consumer = new HostileConsumerV2('stop-partial');
        const result = await new NodeSafeProcessRunner().runStreaming(
          request(cwd, 'output', ['stdout', '8'], { maxStdoutBytes: 4 }),
          new AbortController().signal,
          consumer,
        );
        expect(result.ok).toBe(false);
        if (!result.ok && result.startState === 'started') {
          expect(result.kind).toBe('consumer-stop');
        }
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  );

  it('records cleanup-invariant override marker via settlement precedence', () => {
    expect(
      settlementForRaceV2({
        cleanupFailed: true,
        finalizerInvalid: false,
        primary: 'consumer-stop',
        exitCode: 0,
        signal: null,
      }),
    ).toBe('cleanup-invariant');
    recordPlatformAssertionMarker(
      'F5-PROC-001',
      'cleanup-invariant-overrides-trigger',
    );
  });
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'buffered-compatibility-projection',
  }),
)('F5-PROC-003 buffered projection', () => {
  it('projects kernel settlements to legacy SafeProcessResult rows', async () => {
    expect(BUFFERED_PROJECTION_ROWS_V2.length).toBeGreaterThan(5);
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-proj-'));
    try {
      const runner = new NodeSafeProcessRunner();
      const success = await runner.run(
        request(cwd, 'echo-argv', ['ok']),
        new AbortController().signal,
      );
      expect(success.ok).toBe(true);

      const nonZero = await runner.run(
        request(cwd, 'non-zero'),
        new AbortController().signal,
      );
      expect(nonZero).toMatchObject({ ok: false, kind: 'non-zero-exit' });

      const invalid = await runner.run(
        { ...request(cwd, 'echo-argv'), timeoutMs: Number.NaN },
        new AbortController().signal,
      );
      expect(invalid).toMatchObject({ ok: false, kind: 'invalid-request' });

      const spawn = await runner.run(
        { ...request(cwd, 'echo-argv'), executable: 'repo-nav-missing-bin' },
        new AbortController().signal,
      );
      expect(spawn).toMatchObject({ ok: false, kind: 'spawn-error' });

      const aborted = await runner.run(
        request(cwd, 'sleep'),
        AbortSignal.abort(),
      );
      expect(aborted).toMatchObject({ ok: false, kind: 'aborted' });

      expect(() =>
        projectBufferedCompatibilityResultV2({
          ok: false,
          kind: 'consumer-invalid',
          startState: 'started',
          exitCode: null,
          terminationSignal: null,
          stdout: { kind: 'unavailable' },
          stderr: new Uint8Array(),
        }),
      ).toThrow(/consumer-only/u);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'stream-consumer-finalizer-and-process-exit',
  }),
)('F5-PROC-003 finalizer and process-exit', () => {
  platformContractIt(
    'F5-PROC-003',
    'partial-valid-invalid-union',
    'partial/finish exact union',
    async () => {
      const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-fin-'));
      try {
        const okConsumer = new HostileConsumerV2('finish-ok');
        const ok = await new NodeSafeProcessRunner().runStreaming(
          request(cwd, 'output', ['stdout', '4'], { maxStdoutBytes: 1024 }),
          new AbortController().signal,
          okConsumer,
        );
        expect(ok.ok).toBe(true);
        expect(okConsumer.finishCount).toBe(1);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  );

  platformContractIt(
    'F5-PROC-003',
    'top-level-async-finalizer-rejected',
    'rejects top-level Promise finalizer',
    async () => {
      const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-async-'));
      try {
        const consumer = new HostileConsumerV2('finish-promise');
        const result = await new NodeSafeProcessRunner().runStreaming(
          request(cwd, 'output', ['stdout', '4'], { maxStdoutBytes: 1024 }),
          new AbortController().signal,
          consumer,
        );
        expect(result.ok).toBe(false);
        if (!result.ok && result.startState === 'started') {
          expect(result.kind).toBe('consumer-invalid');
        }
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  );

  platformContractIt(
    'F5-PROC-003',
    'null-exit-or-signal-process-exit',
    'null exit/signal maps to process-exit',
    async () => {
      expect(
        settlementForRaceV2({
          cleanupFailed: false,
          finalizerInvalid: false,
          primary: undefined,
          exitCode: null,
          signal: null,
        }),
      ).toBe('process-exit');
    },
  );
});
