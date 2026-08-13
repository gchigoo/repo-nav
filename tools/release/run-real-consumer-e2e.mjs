import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';

import {
  captureControlledTree,
  removeControlledTree,
} from './real-consumer-cleanup.mjs';
import {
  strictCompactJson,
  validateRealConsumerConfirmation,
} from './real-consumer-contracts.mjs';
import {
  assertRealConsumerObservation,
  reloadLocateResultSchema,
  scanForbiddenOutput,
} from './real-consumer-evaluator.mjs';
import {
  assertCandidateProcessCleanupSupported,
  reapCandidateProcessGroup,
} from './real-consumer-process.mjs';
import {
  captureRepositoryState,
  runWithRepositoryStateGuard,
} from './real-consumer-snapshot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const REPO_NAV_LOCATE_TOOL_NAME = 'repo_nav_locate';
const defaultConfirmation =
  'docs/superpowers/evidence/release-runtime/public-beta-real-consumer-confirmation.json';

function fail(code, residual, message, extra = {}) {
  process.stderr.write(
    `${JSON.stringify({ ok: false, residual, message, ...extra })}\n`,
  );
  process.exit(code);
}

const SAFE_FAILURE_RESIDUALS = new Map([
  [
    'Windows candidate cleanup is unsupported without Job Object authority',
    'real-consumer-process-cleanup-unsupported',
  ],
  ['fresh candidate build failed', 'real-consumer-build-failed'],
  ['candidate pack failed', 'real-consumer-pack-failed'],
  [
    'candidate pack did not report a safe tarball',
    'real-consumer-pack-report-invalid',
  ],
  ['fresh locate schema is unavailable', 'real-consumer-schema-unavailable'],
  [
    'owner confirmation candidate does not match fresh tarball',
    'real-consumer-candidate-mismatch',
  ],
  ['candidate install failed', 'real-consumer-install-failed'],
  [
    'candidate installation closure could not be measured',
    'real-consumer-install-closure-unmeasured',
  ],
  [
    'candidate installation closure changed during execution',
    'real-consumer-install-closure-changed',
  ],
  [
    'owner-confirmed repository revision changed',
    'real-consumer-owner-revision-changed',
  ],
  [
    'owner-confirmed repository changed during execution',
    'real-consumer-repository-changed',
  ],
  [
    'owner repository after-state could not be measured',
    'real-consumer-repository-after-state-unmeasured',
  ],
  [
    'controlled consumer cleanup inventory unavailable',
    'real-consumer-cleanup-inventory-unavailable',
  ],
  [
    'controlled tree topology changed',
    'real-consumer-cleanup-topology-changed',
  ],
  [
    'controlled tree identity changed',
    'real-consumer-cleanup-identity-changed',
  ],
  [
    'controlled tree removal could not be verified',
    'real-consumer-cleanup-unverified',
  ],
  [
    'candidate process cleanup could not be verified',
    'real-consumer-process-cleanup-unverified',
  ],
  ['candidate process stdio failed', 'real-consumer-process-stdio-failed'],
  [
    'candidate process output exceeded limit',
    'real-consumer-process-output-limit',
  ],
  ['candidate MCP stdio failed', 'real-consumer-mcp-stdio-failed'],
  ['candidate MCP output exceeded limit', 'real-consumer-mcp-output-limit'],
  ['candidate MCP session timed out', 'real-consumer-mcp-timeout'],
]);

function failureReport(error) {
  if (
    error instanceof Error &&
    Array.isArray(error.failures) &&
    error.failures.every((value) => typeof value === 'string')
  ) {
    return {
      residual: 'real-consumer-observation-rejected',
      message: 'Real-consumer observation failed closed.',
      failures: error.failures,
    };
  }
  return {
    residual:
      error instanceof Error
        ? (SAFE_FAILURE_RESIDUALS.get(error.message) ??
          'real-consumer-evidence-rejected')
        : 'real-consumer-evidence-rejected',
    message: 'Real-consumer evidence failed closed.',
  };
}

function candidateEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) =>
        value !== undefined &&
        !key.toUpperCase().startsWith('GIT_') &&
        !/(?:token|secret|password|passwd|api[_-]?key|auth|credential)/iu.test(
          key,
        ),
    ),
  );
}

function runNode(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: options.env ?? candidateEnv(),
    shell: false,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function hashTree(rootPath) {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
        import { createHash } from 'node:crypto';
        import { lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs';
        import { join, relative } from 'node:path';
        const root = process.argv[1];
        const entries = [];
        const walk = (dir) => {
          for (const name of readdirSync(dir).sort()) {
            const path = join(dir, name);
            const stat = lstatSync(path);
            const rel = relative(root, path).replaceAll('\\\\', '/');
            if (stat.isDirectory()) {
              entries.push([rel, 'directory', Number(stat.mode & 0o7777), 0, '']);
              walk(path);
            } else if (stat.isFile()) {
              const bytes = readFileSync(path);
              entries.push([rel, 'file', Number(stat.mode & 0o7777), bytes.length,
                createHash('sha256').update(bytes).digest('hex')]);
            } else if (stat.isSymbolicLink()) {
              const target = readlinkSync(path);
              entries.push([rel, 'symlink', Number(stat.mode & 0o7777), target.length,
                createHash('sha256').update(target).digest('hex')]);
            } else {
              throw new Error('unsupported installation node');
            }
          }
        };
        walk(root);
        process.stdout.write(createHash('sha256').update(JSON.stringify(entries)).digest('hex'));
      `,
      rootPath,
    ],
    { encoding: 'utf8', shell: false },
  );
  if (result.status !== 0 || !/^[0-9a-f]{64}$/u.test(result.stdout)) {
    throw new Error('candidate installation closure could not be measured');
  }
  return result.stdout;
}

function packageCandidate(consumer) {
  const build = runNode(process.execPath, [npmCli, 'run', 'build']);
  if (build.status !== 0) {
    throw new Error('fresh candidate build failed');
  }
  const packed = runNode(process.execPath, [npmCli, 'pack', root, '--json'], {
    cwd: consumer,
  });
  if (packed.status !== 0) {
    throw new Error('candidate pack failed');
  }
  const report = JSON.parse(packed.stdout);
  const filename = Array.isArray(report)
    ? report[0]?.filename
    : report?.filename;
  if (
    typeof filename !== 'string' ||
    filename.length === 0 ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    throw new Error('candidate pack did not report a safe tarball');
  }
  const tarballPath = join(consumer, filename);
  return { tarballPath, tarballSha256: sha256File(tarballPath) };
}

function installCandidate(consumer, tarballPath) {
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'repo-nav-real-consumer', private: true }),
  );
  const install = runNode(
    process.execPath,
    [
      npmCli,
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      tarballPath,
    ],
    { cwd: consumer },
  );
  if (install.status !== 0) {
    throw new Error('candidate install failed');
  }
}

function parseMcpFrames(stdout) {
  return stdout
    .replaceAll('\r\n', '\n')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function updateMcpFrames(remainder, chunk) {
  const combined = `${remainder}${chunk}`;
  const lines = combined.split(/\r?\n/u);
  return {
    remainder: lines.pop() ?? '',
    frames: lines
      .filter((line) => line.length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }),
  };
}

async function runCandidateProcess(executable, args, options = {}) {
  assertCandidateProcessCleanupSupported();
  const child = spawn(executable, args, {
    cwd: options.cwd,
    detached: process.platform !== 'win32',
    env: options.env ?? candidateEnv(),
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stdin = options.stdin ?? '';
  let stdout = '';
  let stderr = '';
  let ioFailure = false;
  let outputExceeded = false;
  const maxOutputBytes = options.maxOutputBytes ?? 4 * 1024 * 1024;
  const terminate = () => {
    if (child.pid !== undefined) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        // Mandatory cleanup below remains authoritative.
      }
    }
  };
  const collect = (current, value) => {
    const next = `${current}${value}`;
    if (Buffer.byteLength(next) > maxOutputBytes) {
      outputExceeded = true;
      terminate();
      return current;
    }
    return next;
  };
  const recordIoFailure = () => {
    ioFailure = true;
    terminate();
  };
  child.stdin.on('error', recordIoFailure);
  child.stdout.on('error', recordIoFailure);
  child.stderr.on('error', recordIoFailure);
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (value) => {
    stdout = collect(stdout, value);
  });
  child.stderr.on('data', (value) => {
    stderr = collect(stderr, value);
  });
  try {
    child.stdin.end(stdin);
  } catch {
    recordIoFailure();
  }
  const timeoutMs = options.timeoutMs ?? 60_000;
  const outcome = await new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };
    const timeout = setTimeout(async () => {
      try {
        if (child.pid !== undefined) {
          await reapCandidateProcessGroup(child.pid);
        }
        settle(resolve, { exitCode: null, signal: 'TIMEOUT' });
      } catch (error) {
        settle(reject, error);
      }
    }, timeoutMs);
    child.once('close', (exitCode, signal) =>
      settle(resolve, { exitCode, signal }),
    );
    child.once('error', (error) => settle(reject, error));
  });
  if (child.pid !== undefined && outcome.signal !== 'TIMEOUT') {
    await reapCandidateProcessGroup(child.pid);
  }
  if (ioFailure) {
    throw new Error('candidate process stdio failed');
  }
  if (outputExceeded) {
    throw new Error('candidate process output exceeded limit');
  }
  return { ...outcome, stdout, stderr };
}

async function runMcpSession(installedMcp, consumer, request) {
  assertCandidateProcessCleanupSupported();
  const child = spawn(process.execPath, [installedMcp], {
    cwd: consumer,
    detached: process.platform !== 'win32',
    env: candidateEnv(),
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const requests = [];
  const frames = [];
  let stdout = '';
  let stderr = '';
  let remainder = '';
  let completed = false;
  let timeout;
  const maxOutputBytes = 4 * 1024 * 1024;
  const finish = async (resolvePromise, rejectPromise, exitCode, signal) => {
    if (completed) return;
    completed = true;
    clearTimeout(timeout);
    try {
      if (child.pid !== undefined) {
        await reapCandidateProcessGroup(child.pid);
      }
      resolvePromise({
        exitCode,
        signal,
        stdin: `${requests.map((frame) => JSON.stringify(frame)).join('\n')}\n`,
        stdout,
        stderr,
        requests,
        frames,
      });
    } catch (error) {
      rejectPromise(error);
    }
  };
  return new Promise((resolvePromise, rejectPromise) => {
    const failIo = async (message) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      try {
        if (child.pid !== undefined) {
          await reapCandidateProcessGroup(child.pid);
        }
        rejectPromise(new Error(message));
      } catch (error) {
        rejectPromise(error);
      }
    };
    const send = (frame) => {
      requests.push(frame);
      try {
        child.stdin.write(`${JSON.stringify(frame)}\n`, (error) => {
          if (error) void failIo('candidate MCP stdio failed');
        });
      } catch {
        void failIo('candidate MCP stdio failed');
      }
    };
    timeout = setTimeout(async () => {
      try {
        if (child.pid !== undefined) {
          await reapCandidateProcessGroup(child.pid);
        }
        if (!completed) {
          completed = true;
          rejectPromise(new Error('candidate MCP session timed out'));
        }
      } catch (error) {
        if (!completed) {
          completed = true;
          rejectPromise(error);
        }
      }
    }, 60_000);
    child.stdin.on('error', () => {
      void failIo('candidate MCP stdio failed');
    });
    child.stdout.on('error', () => {
      void failIo('candidate MCP stdio failed');
    });
    child.stderr.on('error', () => {
      void failIo('candidate MCP stdio failed');
    });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (
        Buffer.byteLength(stdout) + Buffer.byteLength(chunk) >
        maxOutputBytes
      ) {
        void failIo('candidate MCP output exceeded limit');
        return;
      }
      stdout += chunk;
      const parsed = updateMcpFrames(remainder, chunk);
      remainder = parsed.remainder;
      for (const frame of parsed.frames) {
        frames.push(frame);
        if (frame?.id === 1) {
          send({ jsonrpc: '2.0', method: 'notifications/initialized' });
          send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
        } else if (frame?.id === 2) {
          send({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: { name: REPO_NAV_LOCATE_TOOL_NAME, arguments: request },
          });
        } else if (frame?.id === 3) {
          child.stdin.end();
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      if (
        Buffer.byteLength(stderr) + Buffer.byteLength(chunk) >
        maxOutputBytes
      ) {
        void failIo('candidate MCP output exceeded limit');
        return;
      }
      stderr += chunk;
    });
    child.once('spawn', () => {
      send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'repo-nav-e2e', version: '1.0.0' },
        },
      });
    });
    child.once('error', (error) => {
      if (!completed) {
        completed = true;
        clearTimeout(timeout);
        rejectPromise(error);
      }
    });
    child.once('close', (exitCode, signal) => {
      void finish(resolvePromise, rejectPromise, exitCode, signal);
    });
  });
}

async function main(confirmationPath) {
  const absoluteConfirmation = isAbsolute(confirmationPath)
    ? confirmationPath
    : resolve(root, confirmationPath);
  let confirmation;
  try {
    confirmation = JSON.parse(readFileSync(absoluteConfirmation, 'utf8'));
  } catch {
    throw new Error('owner confirmation is unreadable');
  }
  const validated = validateRealConsumerConfirmation(confirmation);
  if (validated.canonicalRepositoryPath === realpathSync(root)) {
    throw new Error('package source repository cannot be the consumer target');
  }
  const request = {
    repoPath: validated.canonicalRepositoryPath,
    terms: ['package.json'],
  };
  const requestSha256 = createHash('sha256')
    .update(strictCompactJson(request))
    .digest('hex');
  if (requestSha256 !== confirmation.intent.requestSha256) {
    throw new Error('owner intent does not match the exact locate request');
  }
  const before = captureRepositoryState(validated.canonicalRepositoryPath);
  if (
    before.branch !== validated.confirmedBranch ||
    before.headSha !== validated.confirmedHeadSha
  ) {
    throw new Error('owner-confirmed repository revision changed');
  }
  const consumer = realpathSync(
    mkdtempSync(join(tmpdir(), 'repo-nav-real-consumer-')),
  );
  let consumerRecord;
  let result;
  let primaryError;
  try {
    const candidate = packageCandidate(consumer);
    if (!(await reloadLocateResultSchema())) {
      throw new Error('fresh locate schema is unavailable');
    }
    const [{ readPackageMetadata }, { REPO_NAV_LOCATE_TOOL }] =
      await Promise.all([
        import('../../dist/runtime/package-metadata.js'),
        import('../../dist/mcp/locate-tool-schema.js'),
      ]);
    const packageMetadata = readPackageMetadata();
    if (
      validated.candidate.name !== packageMetadata.name ||
      validated.candidate.version !== packageMetadata.version ||
      validated.candidate.tarballSha256 !== candidate.tarballSha256
    ) {
      throw new Error(
        'owner confirmation candidate does not match fresh tarball',
      );
    }
    installCandidate(consumer, candidate.tarballPath);
    const installedPackageRoot = join(consumer, 'node_modules', 'repo-nav');
    const installedCli = join(installedPackageRoot, 'dist/cli/main.js');
    const installedMcp = join(installedPackageRoot, 'dist/main.js');
    const installedClosureSha256 = hashTree(join(consumer, 'node_modules'));
    consumerRecord = captureControlledTree(consumer);
    const execution = await runWithRepositoryStateGuard(
      validated.canonicalRepositoryPath,
      before,
      async () => {
        const cli = await runCandidateProcess(
          process.execPath,
          [
            installedCli,
            'debug',
            'locate',
            '--repo',
            validated.canonicalRepositoryPath,
            '--term',
            'package.json',
          ],
          { cwd: consumer },
        );
        const mcp = await runMcpSession(installedMcp, consumer, request);
        if (
          hashTree(join(consumer, 'node_modules')) !== installedClosureSha256
        ) {
          throw new Error(
            'candidate installation closure changed during execution',
          );
        }
        return { cli, mcp };
      },
    );
    const { cli, mcp } = execution.value;
    const { after } = execution;

    const expectedCall = {
      name: REPO_NAV_LOCATE_TOOL_NAME,
      arguments: request,
    };
    const expectedServer = {
      name: packageMetadata.name,
      version: packageMetadata.version,
      listChanged: false,
      toolDescriptor: REPO_NAV_LOCATE_TOOL,
    };
    const forbiddenStrings = [
      validated.canonicalRepositoryPath,
      before.indexPath,
      absoluteConfirmation,
      consumer,
      installedPackageRoot,
      installedCli,
      installedMcp,
      ...Object.entries(process.env)
        .filter(
          ([key, value]) =>
            typeof value === 'string' &&
            value.length >= 8 &&
            /(?:token|secret|password|passwd|api[_-]?key|auth|credential)/iu.test(
              key,
            ),
        )
        .map(([, value]) => value),
    ];
    const decodedValues = [];
    try {
      decodedValues.push(JSON.parse(cli.stdout));
    } catch {
      // Raw framing remains authoritative when CLI JSON cannot be decoded.
    }
    try {
      decodedValues.push(...parseMcpFrames(mcp.stdout));
    } catch {
      // Raw framing remains authoritative when MCP frames cannot be decoded.
    }
    const violations = scanForbiddenOutput(
      [cli.stdout, cli.stderr, mcp.stdout, mcp.stderr],
      forbiddenStrings,
      decodedValues,
    );
    const observation = {
      cli,
      mcp,
      forbiddenScan: { violations },
      repository: { before, after },
    };
    const report = assertRealConsumerObservation(
      observation,
      expectedCall,
      expectedServer,
    );
    result = {
      ok: true,
      schemaVersion: 1,
      confirmationDecisionSha256: validated.confirmationDecisionSha256,
      candidate: validated.candidate,
      measured: report.measured,
      repository: {
        headSha: before.headSha,
        indexSha256: before.indexSha256,
        worktreeTreeSha256: before.worktreeTreeSha256,
        worktreeEntryCount: before.worktreeEntryCount,
      },
    };
  } catch (error) {
    primaryError = error;
  }
  if (consumerRecord !== undefined) {
    removeControlledTree(consumerRecord);
  } else {
    const emptyRecord = captureControlledTree(consumer);
    if (emptyRecord.entries.length !== 0) {
      throw new Error('controlled consumer cleanup inventory unavailable');
    }
    removeControlledTree(emptyRecord);
  }
  if (primaryError !== undefined) {
    throw primaryError;
  }
  return result;
}

const args = process.argv.slice(2);
const index = args.indexOf('--confirmation');
const confirmationPath = index >= 0 ? args[index + 1] : defaultConfirmation;
if (typeof confirmationPath !== 'string' || confirmationPath.length === 0) {
  fail(
    2,
    'real-consumer-confirmation-missing',
    'Owner confirmation is required.',
  );
}
const absoluteConfirmation = isAbsolute(confirmationPath)
  ? confirmationPath
  : resolve(root, confirmationPath);
if (!existsSync(absoluteConfirmation)) {
  fail(
    2,
    'real-consumer-confirmation-missing',
    'Owner must supply RealConsumerConfirmationV1; refusing to invent confirmation JSON.',
  );
}

try {
  const report = await main(confirmationPath);
  process.stdout.write(`${JSON.stringify(report)}\n`);
} catch (error) {
  const report = failureReport(error);
  fail(1, report.residual, report.message, {
    failures: report.failures,
  });
}
