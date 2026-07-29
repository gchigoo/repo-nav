import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';

import { LocateResultV2Schema } from '../../src/contracts/v2/locate-result-v2.js';
import {
  REPO_NAV_LOCATE_INPUT_SCHEMA,
  REPO_NAV_LOCATE_OUTPUT_SCHEMA,
  REPO_NAV_LOCATE_TOOL_NAME,
} from '../../src/mcp/locate-tool-schema.js';
import { ProbeOutputSchema } from '../../src/cli/contracts.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { parseLocateToolResultParity } from '../contracts/mcp-tool-result.js';
import { buildSchemaReferenceProjection } from './schema-reference.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const docPaths = [
  'docs/getting-started-mcp.md',
  'docs/debug-cli.md',
  'docs/reference/repo-nav-locate.md',
  'docs/acceptance/mvp.md',
] as const;
const requiredBlocks = new Set([
  'mcp-config', 'mcp-success-request', 'mcp-recoverable-request', 'mcp-error-request',
  'cli-help', 'cli-locate', 'cli-probe', 'schema-reference',
  'acceptance-contract',
]);

const CliSnippetSchema = z.strictObject({
  args: z.array(z.string()),
  expectedExit: z.int().min(0).max(3),
  schema: z.enum(['help', 'locate', 'probe']),
});
const McpConfigSchema = z.strictObject({
  command: z.literal('node'),
  args: z.tuple([z.string()]),
  cwd: z.string(),
});
const McpRequestSchema = z.strictObject({
  name: z.literal(REPO_NAV_LOCATE_TOOL_NAME),
  arguments: z.record(z.string(), z.unknown()),
});

function replaceRoot(value: string): string {
  return value.replaceAll('{{REPO_ROOT}}', repositoryRoot.replaceAll('\\', '/'));
}

function parseJsonBlock<T>(raw: string, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(replaceRoot(raw)) as unknown);
}

function readBlocks(): ReadonlyMap<string, string> {
  const blocks = new Map<string, string>();
  const pattern = /```(?:json|text) docs-smoke:([a-z0-9-]+)\r?\n([\s\S]*?)```/gu;
  for (const docPath of docPaths) {
    const contents = readFileSync(resolve(repositoryRoot, docPath), 'utf8');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(contents)) !== null) {
      const id = match[1];
      const body = match[2];
      if (id === undefined || body === undefined) throw new Error(`Malformed docs-smoke block in ${docPath}.`);
      if (!requiredBlocks.has(id)) throw new Error(`Unknown docs-smoke block: ${id}.`);
      if (blocks.has(id)) throw new Error(`Duplicate docs-smoke block: ${id}.`);
      blocks.set(id, body.trim());
    }
  }
  const missing = [...requiredBlocks].filter((id) => !blocks.has(id));
  if (missing.length > 0) throw new Error(`Missing docs-smoke blocks: ${missing.join(', ')}.`);
  return blocks;
}

function requiredBlock(blocks: ReadonlyMap<string, string>, id: string): string {
  const value = blocks.get(id);
  if (value === undefined) throw new Error(`Missing docs-smoke block: ${id}.`);
  return value;
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 30_000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function verifyMcp(blocks: ReadonlyMap<string, string>): Promise<Readonly<Record<string, unknown>>> {
  const config = parseJsonBlock(requiredBlock(blocks, 'mcp-config'), McpConfigSchema);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: config.args,
    cwd: config.cwd,
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (chunk: Buffer | string) => { stderr += chunk.toString(); });
  const client = new Client({ name: 'repo-nav-docs-smoke', version: '0.2.0-beta.1' });
  let observation: Readonly<Record<string, unknown>> | undefined;
  try {
    await withTimeout(client.connect(transport), 'MCP connect');
    const listed = await withTimeout(client.listTools(), 'MCP tools/list');
    if (listed.tools.length !== 1 || listed.tools[0]?.name !== REPO_NAV_LOCATE_TOOL_NAME) {
      throw new Error('MCP docs config did not expose exactly repo_nav_locate.');
    }
    if (!isDeepStrictEqual(listed.tools[0].inputSchema, REPO_NAV_LOCATE_INPUT_SCHEMA) ||
        !isDeepStrictEqual(listed.tools[0].outputSchema, REPO_NAV_LOCATE_OUTPUT_SCHEMA)) {
      throw new Error('MCP docs config exposed a drifted tool schema.');
    }

    const parsedResults = [];
    for (const id of ['mcp-success-request', 'mcp-recoverable-request', 'mcp-error-request'] as const) {
      const request = parseJsonBlock(requiredBlock(blocks, id), McpRequestSchema);
      const raw = await withTimeout(client.callTool(request), id, 45_000);
      parsedResults.push({ id, parsed: parseLocateToolResultParity(raw) });
    }
    const success = parsedResults[0]?.parsed;
    const recoverable = parsedResults[1]?.parsed;
    const error = parsedResults[2]?.parsed;
    if (success === undefined || !success.output.ok || success.isError) {
      throw new Error('MCP success snippet did not return ok=true parity output.');
    }
    if (
      recoverable === undefined ||
      !recoverable.output.ok ||
      recoverable.isError ||
      recoverable.output.evidence.confirmed.length !== 0
    ) {
      throw new Error(
        'MCP recoverable snippet did not return ok=true empty-confirmed with isError=false.',
      );
    }
    if (error === undefined || error.output.ok || !error.isError || error.output.error.code !== 'INVALID_INPUT') {
      throw new Error('MCP error snippet did not return INVALID_INPUT parity output.');
    }
    observation = {
      toolCount: listed.tools.length,
      statuses: [success.output.evidence.status, recoverable.output.evidence.status],
      errorCode: error.output.error.code,
      schemaVersion: success.output.evidence.schemaVersion,
    };
  } finally {
    await withTimeout(client.close(), 'MCP close');
  }
  if (stderr.length !== 0) throw new Error('Production MCP wrote unexpected diagnostics to stderr.');
  if (observation === undefined) throw new Error('MCP docs smoke did not produce an observation.');
  return { ...observation, stderrClean: true };
}

interface SpawnResult { readonly exitCode: number; readonly stdout: string; readonly stderr: string }

async function runCli(args: readonly string[]): Promise<SpawnResult> {
  const wrapperPath = resolve(repositoryRoot, 'testkit', 'docs', 'cli-open-stdin-child.ts');
  const cliPath = resolve(repositoryRoot, 'dist', 'cli', 'main.js');
  const result = await new NodeSafeProcessRunner().run(
    {
      executable: process.execPath,
      argv: ['--import', 'tsx', wrapperPath, cliPath, ...args],
      cwd: repositoryRoot,
      timeoutMs: 30_000,
      maxStdoutBytes: 8 * 1024 * 1024,
      maxStderrBytes: 2 * 1024 * 1024,
      terminateGraceMs: 500,
    },
    new AbortController().signal,
  );
  if (!result.ok && result.kind !== 'non-zero-exit') {
    throw new Error(`CLI snippet failed (${result.kind}) after process-tree cleanup.`);
  }
  return {
    exitCode: result.exitCode ?? 1,
    stdout: Buffer.from(result.stdout).toString('utf8').trim(),
    stderr: Buffer.from(result.stderr).toString('utf8').trim(),
  };
}

async function verifyCli(blocks: ReadonlyMap<string, string>): Promise<Readonly<Record<string, unknown>>> {
  const transcripts: Readonly<Record<string, unknown>>[] = [];
  for (const id of ['cli-help', 'cli-locate', 'cli-probe'] as const) {
    const snippet = parseJsonBlock(requiredBlock(blocks, id), CliSnippetSchema);
    const result = await runCli(snippet.args);
    if (result.exitCode !== snippet.expectedExit) {
      throw new Error(`${id} exited ${result.exitCode}, expected ${snippet.expectedExit}: ${result.stderr}`);
    }
    if (result.stderr !== '') throw new Error(`${id} wrote unexpected diagnostics to stderr.`);
    if (snippet.schema === 'help') {
      if (!result.stdout.startsWith('repo-nav debug')) throw new Error('CLI help snippet returned unexpected text.');
    } else {
      const parsed: unknown = JSON.parse(result.stdout);
      if (snippet.schema === 'locate') LocateResultV2Schema.parse(parsed);
      if (snippet.schema === 'probe') ProbeOutputSchema.parse(parsed);
    }
    transcripts.push({ id, exitCode: result.exitCode, schema: snippet.schema });
  }
  return { transcripts };
}

function verifySchemaAndAcceptance(blocks: ReadonlyMap<string, string>): Readonly<Record<string, unknown>> {
  const documentedProjection: unknown = JSON.parse(requiredBlock(blocks, 'schema-reference'));
  const generatedProjection = buildSchemaReferenceProjection();
  if (!isDeepStrictEqual(documentedProjection, generatedProjection)) {
    throw new Error('API reference projection drifted from the current schemas.');
  }
  const forbidden = new Set(['plan', 'trace', 'impact', 'session']);
  const output = (generatedProjection['output'] ?? {}) as Readonly<Record<string, unknown>>;
  const fields = output['fields'];
  if (!Array.isArray(fields) || fields.some((field) => typeof field === 'string' && forbidden.has(field))) {
    throw new Error('API reference contains a retired output field.');
  }
  const acceptance = JSON.parse(requiredBlock(blocks, 'acceptance-contract')) as unknown;
  const AcceptanceSchema = z.strictObject({
    commands: z.array(z.string()).length(7),
    artifacts: z.array(z.string()).min(4),
    minimalLoop: z.string().includes('not a publishable MVP'),
    publishableCandidate: z.string().includes('executable docs'),
  });
  const parsed = AcceptanceSchema.parse(acceptance);
  const requiredCommands = ['npm run build', 'npm run typecheck', 'npm test',
    'npm run test:golden -- --all', 'npm run test:mcp -- --all', 'npm run test:docs'];
  if (requiredCommands.some((command) => !parsed.commands.includes(command))) {
    throw new Error('MVP acceptance guide omitted a required verification command.');
  }
  const requiredArtifacts = [
    '.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-evidence-pack.md',
    '.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-gate-results.json',
    '.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-dod-results.json',
    'test-artifacts/docs/docs-smoke-v1.json',
  ];
  if (
    requiredArtifacts.some((artifact) => !parsed.artifacts.includes(artifact)) ||
    parsed.artifacts.some((artifact) => !requiredArtifacts.includes(artifact))
  ) {
    throw new Error('MVP acceptance guide artifact inventory drifted.');
  }
  for (const artifact of requiredArtifacts.slice(0, -1)) {
    if (!existsSync(resolve(repositoryRoot, artifact))) {
      throw new Error(`MVP acceptance artifact does not exist: ${artifact}.`);
    }
  }
  return { schemaProjection: 'exact', commandCount: parsed.commands.length, artifactCount: parsed.artifacts.length };
}

function walkTypeScriptFiles(directory: string): readonly string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walkTypeScriptFiles(path) : entry.name.endsWith('.ts') ? [path] : [];
  });
}

function verifyImportGraph(): Readonly<Record<string, unknown>> {
  const productionViolations = walkTypeScriptFiles(resolve(repositoryRoot, 'src')).filter((path) =>
    /from\s+['"][^'"]*(?:testkit)/u.test(readFileSync(path, 'utf8')),
  );
  const cliForbidden = /from\s+['"][^'"]*(?:classifier|fallback|redactor)/u;
  const cliViolations = walkTypeScriptFiles(resolve(repositoryRoot, 'src', 'cli')).filter((path) =>
    cliForbidden.test(readFileSync(path, 'utf8')),
  );
  if (productionViolations.length > 0 || cliViolations.length > 0) {
    throw new Error('CLI/production import graph boundary was violated.');
  }
  return {
    productionFilesChecked: walkTypeScriptFiles(resolve(repositoryRoot, 'src')).length,
    cliFilesChecked: walkTypeScriptFiles(resolve(repositoryRoot, 'src', 'cli')).length,
    violations: [],
  };
}

async function main(): Promise<void> {
  const blocks = readBlocks();
  const report = {
    schemaVersion: '2.0',
    generatedAt: new Date().toISOString(),
    docs: docPaths,
    blocks: [...blocks.keys()].sort(),
    mcp: await verifyMcp(blocks),
    cli: await verifyCli(blocks),
    drift: verifySchemaAndAcceptance(blocks),
    importGraph: verifyImportGraph(),
    result: 'passed',
  } as const;
  const artifactPath = resolve(repositoryRoot, 'test-artifacts', 'docs', 'docs-smoke-v1.json');
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`Docs smoke passed: ${relative(repositoryRoot, artifactPath).replaceAll('\\', '/')}\n`);
}

try {
  await main();
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
