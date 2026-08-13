import { spawnSync } from 'node:child_process';

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function assertCandidateProcessCleanupSupported(
  platform = process.platform,
) {
  if (platform === 'win32') {
    throw new Error(
      'Windows candidate cleanup is unsupported without Job Object authority',
    );
  }
}

export function isProcessGroupAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return 'unknown';
  }
  if (process.platform === 'win32') {
    const result = spawnSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], {
      encoding: 'utf8',
      shell: false,
    });
    if (result.status !== 0) {
      return 'unknown';
    }
    return result.stdout.includes(String(pid)) ? 'alive' : 'absent';
  }
  try {
    process.kill(-pid, 0);
    return 'alive';
  } catch (error) {
    const code = error?.code;
    if (code === 'ESRCH') {
      return 'absent';
    }
    return 'unknown';
  }
}

function signalProcessGroup(pid, signal) {
  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      encoding: 'utf8',
      shell: false,
    });
    return result.status === 0 ? 'sent' : 'unknown';
  }
  try {
    process.kill(-pid, signal);
    return 'sent';
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return 'absent';
    }
    return 'unknown';
  }
}

export async function reapCandidateProcessGroup(pid, options = {}) {
  assertCandidateProcessCleanupSupported(options.platform ?? process.platform);
  const timeoutMs = options.timeoutMs ?? 2_000;
  const pollIntervalMs = options.pollIntervalMs ?? 25;
  const probe = options.probe ?? isProcessGroupAlive;
  const signal = options.signal ?? signalProcessGroup;

  const firstProbe = probe(pid);
  if (firstProbe === 'absent') {
    return;
  }
  if (signal(pid, 'SIGTERM') === 'unknown') {
    throw new Error('candidate process cleanup could not be verified');
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const state = probe(pid);
    if (state === 'absent') {
      return;
    }
    if (state === 'unknown') {
      break;
    }
    await delay(pollIntervalMs);
  }
  if (signal(pid, 'SIGKILL') === 'unknown') {
    throw new Error('candidate process cleanup could not be verified');
  }
  const killDeadline = Date.now() + timeoutMs;
  while (Date.now() <= killDeadline) {
    const state = probe(pid);
    if (state === 'absent') {
      return;
    }
    if (state === 'unknown') {
      break;
    }
    await delay(pollIntervalMs);
  }
  throw new Error('candidate process cleanup could not be verified');
}
