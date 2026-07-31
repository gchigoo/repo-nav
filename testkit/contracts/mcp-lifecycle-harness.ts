import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import {
  McpLifecycleCaseSchema,
  type McpLifecycleCase,
} from './mcp-lifecycle-case.js';

const JsonRpcRequestIdSchema = z.union([z.string(), z.number()]);
const JsonRpcResponseIdSchema = z.union([JsonRpcRequestIdSchema, z.null()]);
const JsonRpcParamsSchema = z.union([
  z.record(z.string(), z.json()),
  z.array(z.json()),
]);

const McpFrameSchema = z.union([
  z.strictObject({
    jsonrpc: z.literal('2.0'),
    id: JsonRpcRequestIdSchema,
    method: z.string().min(1),
    params: JsonRpcParamsSchema.optional(),
  }),
  z.strictObject({
    jsonrpc: z.literal('2.0'),
    method: z.string().min(1),
    params: JsonRpcParamsSchema.optional(),
  }),
  z.strictObject({
    jsonrpc: z.literal('2.0'),
    id: JsonRpcResponseIdSchema,
    result: z.json(),
  }),
  z.strictObject({
    jsonrpc: z.literal('2.0'),
    id: JsonRpcResponseIdSchema,
    error: z.strictObject({
      code: z.int(),
      message: z.string(),
      data: z.json().optional(),
    }),
  }),
]);

export interface McpLifecycleObservation {
  readonly exitCode: number;
  readonly stdoutFrames: readonly Readonly<Record<string, unknown>>[];
  readonly stderr: string;
  readonly elapsedMs: number;
  readonly contextClosed: boolean | null;
  readonly childrenCleaned: boolean | null;
}

export interface McpLifecycleEvaluationIssue {
  readonly path: string;
  readonly message: string;
}

export type McpLifecycleProbeFault =
  | 'skip-context-close'
  | 'leave-child-running'
  | 'force-timeout'
  | 'force-nonzero-exit';

export interface McpLifecycleProbeAudit {
  readonly directory: string;
  readonly contextMarker: string;
  readonly pidFile: string;
  readonly directPid: number | null;
  readonly descendantPid: number | null;
}

export interface McpLifecycleCaseRunnerOptions {
  readonly probeFault?: McpLifecycleProbeFault;
  readonly onProbeAudit?: (audit: McpLifecycleProbeAudit) => void;
}

export function evaluateMcpLifecycleCase(
  caseInput: McpLifecycleCase,
  observation: McpLifecycleObservation,
): readonly McpLifecycleEvaluationIssue[] {
  const lifecycleCase = McpLifecycleCaseSchema.parse(caseInput);
  const issues: McpLifecycleEvaluationIssue[] = [];
  if (observation.exitCode !== lifecycleCase.expected.exitCode) {
    issues.push({ path: 'exitCode', message: 'Lifecycle exit code differs.' });
  }
  if (observation.elapsedMs > lifecycleCase.expected.maxShutdownMs) {
    issues.push({ path: 'elapsedMs', message: 'Shutdown budget was exceeded.' });
  }
  if (observation.stdoutFrames.length === 0) {
    issues.push({ path: 'stdoutFrames', message: 'No MCP frames were observed.' });
  }
  if (lifecycleCase.scenario === 'shutdown-cleanup-probe') {
    if (observation.contextClosed !== true) {
      issues.push({
        path: 'contextClosed',
        message: 'Application context close probe was not observed.',
      });
    }
    if (observation.childrenCleaned !== true) {
      issues.push({
        path: 'childrenCleaned',
        message: 'Direct/descendant cleanup probe remained alive.',
      });
    }
  }
  return issues;
}

export class McpLifecycleCaseRunner {
  public constructor(
    private readonly options: McpLifecycleCaseRunnerOptions = {},
  ) {}

  public async run(caseInput: McpLifecycleCase): Promise<McpLifecycleObservation> {
    const observation = await runMcpLifecycleProcess(
      caseInput,
      this.options.probeFault,
      this.options.onProbeAudit,
    );
    const issues = evaluateMcpLifecycleCase(caseInput, observation);
    if (issues.length > 0) {
      throw new Error(
        issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'),
      );
    }
    return observation;
  }
}

function resolveProductionBin(): {
  readonly projectRoot: string;
  readonly childPath: string;
} {
  const projectRoot = resolve(import.meta.dirname, '..', '..');
  const packageJson: unknown = JSON.parse(
    readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
  );
  const packageBin = z
    .object({
      bin: z.strictObject({
        'repo-nav-mcp': z.string().min(1),
        'repo-nav': z.string().min(1),
      }),
    })
    .parse(packageJson).bin['repo-nav-mcp'];
  return { projectRoot, childPath: resolve(projectRoot, packageBin) };
}

interface LifecycleProbePaths {
  readonly directory: string;
  readonly contextMarker: string;
  readonly pidFile: string;
}

interface LifecycleProcess {
  readonly projectRoot: string;
  readonly argv: readonly string[];
  readonly environment: NodeJS.ProcessEnv;
  readonly probe: LifecycleProbePaths | null;
}

function resolveLifecycleProcess(
  lifecycleCase: McpLifecycleCase,
  probeFault: McpLifecycleProbeFault | undefined,
): LifecycleProcess {
  const { childPath, projectRoot } = resolveProductionBin();
  if (lifecycleCase.scenario !== 'shutdown-cleanup-probe') {
    return {
      projectRoot,
      argv: [childPath],
      environment: process.env,
      probe: null,
    };
  }
  const directory = mkdtempSync(resolve(tmpdir(), 'repo-nav-lifecycle-probe-'));
  const probe = {
    directory,
    contextMarker: resolve(directory, 'context-closed.txt'),
    pidFile: resolve(directory, 'children.json'),
  } as const;
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    REPO_NAV_LIFECYCLE_CONTEXT_MARKER: probe.contextMarker,
    REPO_NAV_LIFECYCLE_PID_FILE: probe.pidFile,
  };
  delete environment['REPO_NAV_LIFECYCLE_PROBE_FAULT'];
  if (probeFault !== undefined) {
    environment['REPO_NAV_LIFECYCLE_PROBE_FAULT'] = probeFault;
  }
  return {
    projectRoot,
    argv: [
      '--import',
      'tsx',
      resolve(
        projectRoot,
        'testkit',
        'fixtures',
        'mcp',
        'lifecycle-probe.ts',
      ),
    ],
    environment,
    probe,
  };
}

const ProbePidSchema = z.strictObject({
  directPid: z.int().positive(),
  descendantPid: z.int().positive(),
});

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForProbeChildrenToExit(
  pids: readonly number[],
): Promise<boolean> {
  const deadline = performance.now() + 2_000;
  while (pids.some(processIsAlive) && performance.now() < deadline) {
    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 20));
  }
  return pids.every((pid) => !processIsAlive(pid));
}

async function inspectLifecycleProbe(
  probe: LifecycleProbePaths | null,
  waitForNaturalExit: boolean,
  onProbeAudit: ((audit: McpLifecycleProbeAudit) => void) | undefined,
): Promise<{
  readonly contextClosed: boolean | null;
  readonly childrenCleaned: boolean | null;
}> {
  if (probe === null) {
    return { contextClosed: null, childrenCleaned: null };
  }
  let pids: readonly number[] = [];
  try {
    const parsed = ProbePidSchema.safeParse(
      existsSync(probe.pidFile)
        ? (JSON.parse(readFileSync(probe.pidFile, 'utf8')) as unknown)
        : undefined,
    );
    if (parsed.success) {
      pids = [parsed.data.directPid, parsed.data.descendantPid];
    }
    onProbeAudit?.({
      directory: probe.directory,
      contextMarker: probe.contextMarker,
      pidFile: probe.pidFile,
      directPid: parsed.success ? parsed.data.directPid : null,
      descendantPid: parsed.success ? parsed.data.descendantPid : null,
    });
    return {
      contextClosed:
        existsSync(probe.contextMarker) &&
        readFileSync(probe.contextMarker, 'utf8').trim() === 'closed',
      childrenCleaned:
        pids.length === 2 &&
        (waitForNaturalExit
          ? await waitForProbeChildrenToExit(pids)
          : pids.every((pid) => !processIsAlive(pid))),
    };
  } finally {
    for (const pid of [...pids].reverse()) {
      if (processIsAlive(pid)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // The process may exit between the liveness probe and cleanup.
        }
      }
    }
    const cleaned = await waitForProbeChildrenToExit(pids);
    rmSync(probe.directory, { recursive: true, force: true });
    if (!cleaned) {
      throw new Error('Lifecycle probe final cleanup left a child process alive.');
    }
  }
}

async function cleanupLifecycleProbeAfterSpawnError(
  probe: LifecycleProbePaths | null,
  onProbeAudit: ((audit: McpLifecycleProbeAudit) => void) | undefined,
): Promise<void> {
  if (probe === null) {
    return;
  }
  await inspectLifecycleProbe(probe, false, onProbeAudit);
}

export function parseMcpStdoutFrames(
  stdout: string,
): readonly Readonly<Record<string, unknown>>[] {
  const lines = stdout.replaceAll('\r\n', '\n').split('\n');
  if (lines.at(-1) === '') {
    lines.pop();
  }
  if (lines.length === 0) {
    throw new Error('Synthetic MCP child produced no stdout frames.');
  }
  if (lines.some((line) => line.length === 0)) {
    throw new Error('MCP stdout contains a blank line between protocol frames.');
  }
  return lines.map((line, index) => {
    let value: unknown;
    try {
      value = JSON.parse(line) as unknown;
    } catch {
      throw new Error(`MCP stdout line ${index + 1} is not JSON.`);
    }
    return McpFrameSchema.parse(value);
  });
}

async function runMcpLifecycleProcess(
  caseInput: McpLifecycleCase,
  probeFault?: McpLifecycleProbeFault,
  onProbeAudit?: (audit: McpLifecycleProbeAudit) => void,
): Promise<McpLifecycleObservation> {
  const lifecycleCase = McpLifecycleCaseSchema.parse(caseInput);
  const lifecycleProcess = resolveLifecycleProcess(lifecycleCase, probeFault);
  const { projectRoot } = lifecycleProcess;
  const startedAt = performance.now();

  return await new Promise<McpLifecycleObservation>((resolveObservation, reject) => {
    const child = spawn(
      process.execPath,
      [...lifecycleProcess.argv],
      {
        cwd: projectRoot,
        env: lifecycleProcess.environment,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let stdoutRemainder = '';
    let shutdownTriggered = false;
    let completed = false;
    // Probe cases measure shutdown budget from stdin close, not Nest boot.
    let shutdownStartedAt = startedAt;
    let killTimeout: ReturnType<typeof setTimeout> | undefined;
    const armKillTimeout = (): void => {
      if (killTimeout !== undefined) {
        return;
      }
      killTimeout = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, lifecycleCase.expected.maxShutdownMs);
    };
    // Probe cases arm the budget after children.json appears so slow darwin Nest
    // boot cannot race force-timeout before directPid is written.
    if (lifecycleProcess.probe === null) {
      armKillTimeout();
    }
    const probeBootstrapTimeout =
      lifecycleProcess.probe === null
        ? undefined
        : setTimeout(() => {
            if (!shutdownTriggered) {
              timedOut = true;
              child.kill();
            }
          }, Math.max(lifecycleCase.expected.maxShutdownMs * 4, 20_000));
    const probePoll =
      lifecycleProcess.probe === null
        ? undefined
        : setInterval(() => {
            if (
              !shutdownTriggered &&
              existsSync(lifecycleProcess.probe?.pidFile ?? '')
            ) {
              shutdownTriggered = true;
              shutdownStartedAt = performance.now();
              armKillTimeout();
              child.stdin.end();
            }
          }, 10);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      stdoutRemainder += chunk;
      const lines = stdoutRemainder.split(/\r?\n/u);
      stdoutRemainder = lines.pop() ?? '';
      for (const line of lines) {
        if (line.length === 0) {
          continue;
        }
        const frame = JSON.parse(line) as Readonly<Record<string, unknown>>;
        if (frame.id === 1) {
          child.stdin.write(
            `${JSON.stringify({
              jsonrpc: '2.0',
              method: 'notifications/initialized',
            })}\n`,
          );
          child.stdin.write(
            `${JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/list',
            })}\n`,
          );
        }
        if (frame.id === 2) {
          child.stdin.write(
            `${JSON.stringify({
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: {
                name: 'repo_nav_locate',
                arguments: {
                  repoPath: projectRoot,
                  question: 'production-bin-lifecycle',
                  terms:
                    lifecycleProcess.probe === null
                      ? []
                      : ['lifecycle-probe'],
                },
              },
            })}\n`,
          );
        }
        if (
          frame.id === 3 &&
          lifecycleProcess.probe === null &&
          !shutdownTriggered
        ) {
          shutdownTriggered = true;
          if (
            lifecycleCase.scenario === 'graceful-shutdown' &&
            process.platform !== 'win32'
          ) {
            child.kill('SIGINT');
          } else {
            child.stdin.end();
          }
        }
      }
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.once('error', (error) => {
      if (completed) {
        return;
      }
      completed = true;
      if (killTimeout !== undefined) {
        clearTimeout(killTimeout);
      }
      if (probeBootstrapTimeout !== undefined) {
        clearTimeout(probeBootstrapTimeout);
      }
      if (probePoll !== undefined) {
        clearInterval(probePoll);
      }
      void cleanupLifecycleProbeAfterSpawnError(
        lifecycleProcess.probe,
        onProbeAudit,
      ).then(
        () => reject(error),
        (cleanupError: unknown) =>
          reject(
            new AggregateError(
              [error, cleanupError],
              'Lifecycle process spawn and probe cleanup both failed.',
            ),
          ),
      );
    });
    child.once('spawn', () => {
      child.stdin.write(
        `${JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: LATEST_PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: 'repo-nav-lifecycle', version: '0.1.0' },
          },
        })}\n`,
      );
    });
    child.once('close', (code) => {
      if (completed) {
        return;
      }
      completed = true;
      if (killTimeout !== undefined) {
        clearTimeout(killTimeout);
      }
      if (probeBootstrapTimeout !== undefined) {
        clearTimeout(probeBootstrapTimeout);
      }
      if (probePoll !== undefined) {
        clearInterval(probePoll);
      }
      void (async () => {
        const elapsedMs = performance.now() - shutdownStartedAt;
        const probeState =
          lifecycleProcess.probe === null
            ? 'no-probe'
            : `pidFile=${existsSync(lifecycleProcess.probe.pidFile)},contextMarker=${existsSync(lifecycleProcess.probe.contextMarker)}`;
        const probe = await inspectLifecycleProbe(
          lifecycleProcess.probe,
          !timedOut && code === lifecycleCase.expected.exitCode,
          onProbeAudit,
        );
        if (timedOut) {
          throw new Error(
            `MCP lifecycle case exceeded ${lifecycleCase.expected.maxShutdownMs}ms (${probeState}, observed=${JSON.stringify(probe)}, stderr=${JSON.stringify(stderr)}, stdout=${JSON.stringify(stdout)}).`,
          );
        }
        if (code !== lifecycleCase.expected.exitCode) {
          throw new Error(
            `MCP lifecycle exit code ${code ?? 'null'} did not match ${lifecycleCase.expected.exitCode}.`,
          );
        }
        resolveObservation({
          exitCode: code,
          stdoutFrames: parseMcpStdoutFrames(stdout),
          stderr,
          elapsedMs,
          ...probe,
        });
      })().catch(reject);
    });
  });
}

export async function runMcpLifecycleCase(
  caseInput: McpLifecycleCase,
): Promise<McpLifecycleObservation> {
  return await new McpLifecycleCaseRunner().run(caseInput);
}

export async function runMcpTransportErrorCase(
  maxShutdownMs: number,
): Promise<McpLifecycleObservation> {
  const { childPath, projectRoot } = resolveProductionBin();
  const startedAt = performance.now();

  return await new Promise<McpLifecycleObservation>((resolveObservation, reject) => {
    const child = spawn(process.execPath, [childPath], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, maxShutdownMs);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('spawn', () => {
      child.stdin.write('{"jsonrpc":\n');
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      child.stdin.destroy();
      if (timedOut) {
        reject(
          new Error(`MCP transport error case exceeded ${maxShutdownMs}ms.`),
        );
        return;
      }
      if (code !== 1) {
        reject(
          new Error(
            `MCP transport error exit code ${code ?? 'null'} did not match 1.`,
          ),
        );
        return;
      }
      resolveObservation({
        exitCode: code,
        stdoutFrames: stdout.length === 0 ? [] : parseMcpStdoutFrames(stdout),
        stderr,
        elapsedMs: performance.now() - startedAt,
        contextClosed: null,
        childrenCleaned: null,
      });
    });
  });
}
