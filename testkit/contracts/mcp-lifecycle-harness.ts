import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

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
  const childPath = resolve(
    import.meta.dirname,
    '..',
    'fixtures',
    'mcp',
    'synthetic-stdio-child.ts',
  );
  const startedAt = performance.now();

  return await new Promise<McpLifecycleObservation>((resolveObservation, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', childPath, lifecycleCase.scenario],
      {
        cwd: resolve(import.meta.dirname, '..', '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
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
    }, lifecycleCase.expected.maxShutdownMs);

    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('spawn', () => {
      if (lifecycleCase.scenario === 'graceful-shutdown') {
        child.stdin.end('shutdown\n');
      } else {
        child.stdin.end();
      }
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
