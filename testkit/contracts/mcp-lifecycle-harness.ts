import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
      bin: z.strictObject({ 'repo-nav-mcp': z.string().min(1) }),
    })
    .parse(packageJson).bin['repo-nav-mcp'];
  return { projectRoot, childPath: resolve(projectRoot, packageBin) };
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

export async function runMcpLifecycleCase(
  caseInput: McpLifecycleCase,
): Promise<McpLifecycleObservation> {
  const lifecycleCase = McpLifecycleCaseSchema.parse(caseInput);
  const { childPath, projectRoot } = resolveProductionBin();
  const startedAt = performance.now();

  return await new Promise<McpLifecycleObservation>((resolveObservation, reject) => {
    const child = spawn(
      process.execPath,
      [childPath],
      {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let stdoutRemainder = '';
    let shutdownTriggered = false;

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
                  terms: [],
                },
              },
            })}\n`,
          );
        }
        if (frame.id === 3 && !shutdownTriggered) {
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

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, lifecycleCase.expected.maxShutdownMs);

    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
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
      clearTimeout(timeout);
      const elapsedMs = performance.now() - startedAt;
      if (timedOut) {
        reject(
          new Error(
            `MCP lifecycle case exceeded ${lifecycleCase.expected.maxShutdownMs}ms.`,
          ),
        );
        return;
      }
      if (code !== lifecycleCase.expected.exitCode) {
        reject(
          new Error(
            `MCP lifecycle exit code ${code ?? 'null'} did not match ${lifecycleCase.expected.exitCode}.`,
          ),
        );
        return;
      }

      try {
        resolveObservation({
          exitCode: code,
          stdoutFrames: parseMcpStdoutFrames(stdout),
          stderr,
          elapsedMs,
        });
      } catch (error: unknown) {
        reject(error);
      }
    });
  });
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
      });
    });
  });
}
