import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ProbeOutputSchema } from '../../src/cli/contracts.js';
import { LocateResultV2Schema } from '../../src/contracts/v2/locate-result-v2.js';
import {
  assertRunnerSurface,
  isSelected,
} from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(root, 'testkit', 'fixtures', 'foundation');
const bin = resolve(root, 'dist', 'cli', 'main.js');
const identity = {
  group: 'debug-cli-lifecycle',
  caseId: 'closed-stdin-bin',
} as const;

describe.runIf(isSelected(identity))('debug CLI closed stdin lifecycle', () => {
  it('runs compiled locate and probe commands without treating EOF as cancellation', () => {
    assertRunnerSurface('mcp');

    const locate = spawnSync(
      process.execPath,
      [
        bin,
        'debug',
        'locate',
        '--repo',
        fixtureRoot,
        '--term',
        'repo_nav_closed_stdin_absent_marker_7f9c',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    expect(locate.status).toBe(0);
    expect(locate.stderr).toBe('');
    const locateResult = LocateResultV2Schema.parse(JSON.parse(locate.stdout));
    expect(locateResult.ok).toBe(true);
    if (locateResult.ok) {
      expect(locateResult.evidence.status).not.toBe('cancelled');
      expect(locateResult.evidence.status).not.toBe('timeout');
      expect(locateResult.evidence.coverage.abortSource).toBe('none');
    }

    const probe = spawnSync(
      process.execPath,
      [bin, 'debug', 'probe', '--repo', fixtureRoot],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    expect(probe.status).toBe(0);
    expect(probe.stderr).toBe('');
    expect(ProbeOutputSchema.parse(JSON.parse(probe.stdout))).toMatchObject({
      schemaVersion: '1.0',
      repositoryRootRedacted: '<repository-root>',
    });
  });
});
