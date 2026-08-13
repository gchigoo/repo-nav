import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import type {
  SafeProcessRequest,
  SafeProcessResult,
} from '../../src/contracts/index.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
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
    maxStdoutBytes: 16 * 1024,
    maxStderrBytes: 16 * 1024,
    terminateGraceMs: 100,
    ...overrides,
  };
}

function outputText(
  result: SafeProcessResult,
  stream: 'stdout' | 'stderr',
): string {
  return Buffer.from(result[stream]).toString('utf8');
}

const contractIdentity = {
  group: 'process-contract',
  caseId: 'process-contract',
} as const;

describe.runIf(isSelected(contractIdentity))('safe process contract', () => {
  it('preserves special argv boundaries without a shell', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav process '));
    try {
      const expected = ['', 'space value', '"quoted"', '&|;[]'];
      const result = await new NodeSafeProcessRunner().run(
        request(cwd, 'echo-argv', expected),
        new AbortController().signal,
      );

      expect(result.ok).toBe(true);
      expect(JSON.parse(outputText(result, 'stdout')) as unknown).toEqual(
        expected,
      );
      expect(outputText(result, 'stderr')).toBe('');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('inherits only allowlisted environment and applies explicit additions', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-process-env-'));
    const previousSecret = process.env['REPO_NAV_SHOULD_NOT_LEAK'];
    process.env['REPO_NAV_SHOULD_NOT_LEAK'] = 'parent-secret';
    try {
      const result = await new NodeSafeProcessRunner().run(
        request(cwd, 'env', [], { env: { REPO_NAV_EXPLICIT: 'yes' } }),
        new AbortController().signal,
      );
      const output: unknown = JSON.parse(outputText(result, 'stdout'));

      expect(result.ok).toBe(true);
      expect(output).toEqual({
        explicit: 'yes',
        leaked: null,
        inheritedPath: true,
      });
    } finally {
      if (previousSecret === undefined) {
        delete process.env['REPO_NAV_SHOULD_NOT_LEAK'];
      } else {
        process.env['REPO_NAV_SHOULD_NOT_LEAK'] = previousSecret;
      }
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('distinguishes invalid request, spawn error, and non-zero exit', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-process-failure-'));
    try {
      const runner = new NodeSafeProcessRunner();
      const invalid = await runner.run(
        { ...request(cwd, 'echo-argv'), timeoutMs: Number.NaN },
        new AbortController().signal,
      );
      expect(invalid).toMatchObject({
        ok: false,
        kind: 'invalid-request',
        exitCode: null,
        terminationSignal: null,
      });
      expect(invalid.stdout).toHaveLength(0);
      expect(invalid.stderr).toHaveLength(0);

      const missing = await runner.run(
        { ...request(cwd, 'echo-argv'), executable: 'repo-nav-does-not-exist' },
        new AbortController().signal,
      );
      expect(missing).toMatchObject({
        ok: false,
        kind: 'spawn-error',
        exitCode: null,
        terminationSignal: null,
      });
      expect(missing.stdout).toHaveLength(0);
      expect(missing.stderr).toHaveLength(0);

      const nonZero = await runner.run(
        request(cwd, 'non-zero'),
        new AbortController().signal,
      );
      expect(nonZero).toMatchObject({
        ok: false,
        kind: 'non-zero-exit',
        exitCode: 7,
      });
      expect(outputText(nonZero, 'stderr')).toBe('synthetic failure');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

const isolationIdentity = {
  group: 'process-output-isolation',
  caseId: 'process-output-isolation',
} as const;

describe.runIf(isSelected(isolationIdentity))(
  'safe process output isolation',
  () => {
    it.each([
      ['stdout', 'stdout-limit'],
      ['stderr', 'stderr-limit'],
    ] as const)(
      'terminates the tree on %s N+1 overflow',
      async (stream, kind) => {
        const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-process-limit-'));
        try {
          const exact = await new NodeSafeProcessRunner().run(
            request(cwd, 'output', [stream, '1024'], {
              maxStdoutBytes: 1024,
              maxStderrBytes: 1024,
            }),
            new AbortController().signal,
          );
          expect(exact.ok).toBe(true);
          expect(exact[stream]).toHaveLength(1024);

          const result = await new NodeSafeProcessRunner().run(
            request(cwd, 'output', [stream, '1025'], {
              maxStdoutBytes: 1024,
              maxStderrBytes: 1024,
            }),
            new AbortController().signal,
          );

          expect(result).toMatchObject({ ok: false, kind });
          expect(result[stream]).toHaveLength(1024);
        } finally {
          rmSync(cwd, { recursive: true, force: true });
        }
      },
    );

    it('captures child output without writing it to parent stdout', async () => {
      const cwd = mkdtempSync(resolve(tmpdir(), 'repo-nav-process-stdout-'));
      const parentWrites: string[] = [];
      const stdoutSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation((chunk: string | Uint8Array) => {
          parentWrites.push(String(chunk));
          return true;
        });
      try {
        const marker = 'CHILD_ONLY_MARKER';
        const result = await new NodeSafeProcessRunner().run(
          request(cwd, 'echo-argv', [marker]),
          new AbortController().signal,
        );
        expect(result.ok).toBe(true);
        expect(outputText(result, 'stdout')).toContain(marker);
        expect(parentWrites.join('')).not.toContain(marker);
      } finally {
        stdoutSpy.mockRestore();
        rmSync(cwd, { recursive: true, force: true });
      }
    });
  },
);
