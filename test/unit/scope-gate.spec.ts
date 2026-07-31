import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isSelected } from '../../testkit/testing/selection.js';

interface GateOutput {
  readonly status: string;
  readonly blocking: readonly string[];
  readonly evidence: readonly unknown[];
}

interface PythonInvocation {
  readonly command: string;
  readonly prefixArgs: readonly string[];
}

const identity = { group: 'contract', caseId: 'scope-gate-runtime' } as const;
const gateScript = resolve(
  import.meta.dirname,
  '..',
  '..',
  '.codestable',
  'tools',
  'codestable-scope-gate.py',
);

/**
 * 在当前平台探测可用的 Python 3 启动方式。
 * Windows 优先 python3/python（CI 由 setup-python 提供），避免 py launcher 在跑脚本时 ACCESS_VIOLATION。
 */
function resolvePythonInvocation(): PythonInvocation {
  const candidates: readonly PythonInvocation[] =
    process.platform === 'win32'
      ? [
          { command: 'python3', prefixArgs: [] },
          { command: 'python', prefixArgs: [] },
          { command: 'py', prefixArgs: ['-3'] },
        ]
      : [
          { command: 'python3', prefixArgs: [] },
          { command: 'python', prefixArgs: [] },
        ];
  for (const candidate of candidates) {
    const probe = spawnSync(
      candidate.command,
      [...candidate.prefixArgs, '-c', 'print(1)'],
      {
        encoding: 'utf8',
        windowsHide: true,
      },
    );
    if (probe.status === 0 && probe.stdout.trim() === '1') {
      return candidate;
    }
  }
  throw new Error(
    `Unable to locate a working Python 3 interpreter (tried ${candidates
      .map((candidate) =>
        [candidate.command, ...candidate.prefixArgs].join(' '),
      )
      .join(', ')}).`,
  );
}

let cachedPython: PythonInvocation | undefined;

function pythonInvocation(): PythonInvocation {
  cachedPython ??= resolvePythonInvocation();
  return cachedPython;
}

function run(command: string, args: readonly string[], cwd: string) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: '1',
    },
  });
}

/**
 * 解析 scope-gate JSON 输出；stdout 为空时带上 stderr/status 失败。
 */
function parseGateOutput(result: SpawnSyncReturns<string>): GateOutput {
  const stdout = result.stdout.trim();
  if (stdout.length === 0) {
    throw new Error(
      `Scope gate produced empty stdout (status=${String(result.status)}, error=${result.error?.message ?? 'none'}, stderr=${JSON.stringify(result.stderr)}).`,
    );
  }
  const parsed: unknown = JSON.parse(stdout);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('status' in parsed) ||
    typeof parsed.status !== 'string' ||
    !('blocking' in parsed) ||
    !Array.isArray(parsed.blocking) ||
    !('evidence' in parsed) ||
    !Array.isArray(parsed.evidence)
  ) {
    throw new Error('Scope gate returned an invalid result.');
  }
  return parsed as unknown as GateOutput;
}

describe.runIf(isSelected(identity))('scope gate process safety', () => {
  it('passes shell metacharacters to git as literal path arguments', () => {
    expect(existsSync(gateScript)).toBe(true);
    const root = mkdtempSync(resolve(tmpdir(), 'repo-nav-scope-'));
    try {
      expect(run('git', ['init', '--quiet'], root).status).toBe(0);
      const feature = resolve(root, 'feature');
      mkdirSync(feature);
      writeFileSync(resolve(feature, 'a & b^c%d.ts'), 'export {};\n', 'utf8');

      const python = pythonInvocation();
      const result = run(
        python.command,
        [
          ...python.prefixArgs,
          gateScript,
          '--feature-dir',
          'feature',
          '--allow',
          'feature',
          '--check-path',
          '.',
        ],
        root,
      );
      const gate = parseGateOutput(result);

      expect(result.status).toBe(0);
      expect(gate.status).toBe('passed');
      expect(JSON.stringify(gate.evidence)).toContain('feature/a & b^c%d.ts');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('blocks when git status cannot inspect the current directory', () => {
    expect(existsSync(gateScript)).toBe(true);
    const root = mkdtempSync(resolve(tmpdir(), 'repo-nav-scope-no-git-'));
    try {
      const python = pythonInvocation();
      const result = run(
        python.command,
        [
          ...python.prefixArgs,
          gateScript,
          '--feature-dir',
          'feature',
          '--check-path',
          '.',
        ],
        root,
      );
      const gate = parseGateOutput(result);

      expect(result.status).not.toBe(0);
      expect(gate.status).toBe('blocked');
      expect(gate.blocking.join('\n')).toMatch(/git status failed/iu);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
