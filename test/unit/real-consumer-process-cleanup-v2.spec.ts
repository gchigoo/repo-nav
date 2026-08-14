import { spawn } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { isSelected } from '../../testkit/testing/selection.js';
import {
  assertCandidateProcessCleanupSupported,
  isProcessGroupAlive,
  reapCandidateProcessGroup,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/real-consumer-process.mjs';

const selected = isSelected({
  group: 'public-beta-release',
  caseId: 'real-consumer-read-only',
});

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

describe.runIf(selected)('H1 real-consumer candidate cleanup', () => {
  it.runIf(process.platform !== 'win32')(
    'reaps a detached candidate process group including descendants',
    async () => {
      const child = spawn(
        process.execPath,
        [
          '-e',
          `
            const { spawn } = require('node:child_process');
            const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
              detached: false,
              stdio: 'ignore',
            });
            process.stdout.write(String(descendant.pid));
            setInterval(() => {}, 1000);
          `,
        ],
        { detached: true, stdio: ['ignore', 'pipe', 'ignore'] },
      );
      child.stdout.setEncoding('utf8');
      const descendantPid = await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Candidate fixture timed out.')),
          1_000,
        );
        child.stdout.once('data', (value: string) => {
          clearTimeout(timeout);
          resolve(Number(value.trim()));
        });
      });
      const leaderPid = child.pid;
      if (!Number.isInteger(leaderPid) || !Number.isInteger(descendantPid)) {
        throw new Error('Candidate fixture did not expose process IDs.');
      }

      await reapCandidateProcessGroup(leaderPid, {
        timeoutMs: 2_000,
        pollIntervalMs: 20,
      });

      expect(isProcessGroupAlive(leaderPid)).toBe('absent');
      expect(processExists(descendantPid)).toBe(false);
    },
  );

  it('fails closed when process-group absence cannot be proven', async () => {
    await expect(
      reapCandidateProcessGroup(12345, {
        platform: 'linux',
        timeoutMs: 0,
        pollIntervalMs: 0,
        probe: () => 'unknown',
        signal: () => 'unknown',
      }),
    ).rejects.toThrow(/candidate process cleanup could not be verified/iu);
  });

  it('refuses Windows candidate execution without Job Object authority', async () => {
    expect(() => assertCandidateProcessCleanupSupported('win32')).toThrow(
      /Job Object authority/iu,
    );
    await expect(
      reapCandidateProcessGroup(12345, {
        platform: 'win32',
        probe: () => 'absent',
        signal: () => 'absent',
      }),
    ).rejects.toThrow(/Job Object authority/iu);
  });
});
