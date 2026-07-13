import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isSelected } from '../../testkit/testing/selection.js';

interface GateOutput {
  readonly status: string;
  readonly blocking: readonly string[];
  readonly evidence: readonly unknown[];
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
const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

function run(command: string, args: readonly string[], cwd: string) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });
}

function parseGateOutput(stdout: string): GateOutput {
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
    const root = mkdtempSync(resolve(tmpdir(), 'repo-nav-scope-'));
    try {
      expect(run('git', ['init', '--quiet'], root).status).toBe(0);
      const feature = resolve(root, 'feature');
      mkdirSync(feature);
      writeFileSync(resolve(feature, 'a & b^c%d.ts'), 'export {};\n', 'utf8');

      const result = run(
        pythonCommand,
        [
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
      const gate = parseGateOutput(result.stdout);

      expect(result.status).toBe(0);
      expect(gate.status).toBe('passed');
      expect(JSON.stringify(gate.evidence)).toContain('feature/a & b^c%d.ts');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('blocks when git status cannot inspect the current directory', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'repo-nav-scope-no-git-'));
    try {
      const result = run(
        pythonCommand,
        [gateScript, '--feature-dir', 'feature', '--check-path', '.'],
        root,
      );
      const gate = parseGateOutput(result.stdout);

      expect(result.status).not.toBe(0);
      expect(gate.status).toBe('blocked');
      expect(gate.blocking.join('\n')).toMatch(/git status failed/iu);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
