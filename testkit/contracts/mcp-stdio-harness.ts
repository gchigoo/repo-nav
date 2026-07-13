import { resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface McpStdioFixtureSession {
  readonly client: Client;
  readonly transport: StdioClientTransport;
  readStderr(): string;
  close(): Promise<void>;
}

export async function connectMcpStdioFixture(): Promise<McpStdioFixtureSession> {
  const childPath = resolve(
    import.meta.dirname,
    '..',
    'fixtures',
    'mcp',
    'repo-nav-mcp-fixture.ts',
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', childPath],
    cwd: resolve(import.meta.dirname, '..', '..'),
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (chunk: Buffer | string) => {
    stderr += chunk.toString();
  });
  const client = new Client({ name: 'repo-nav-stdio-tests', version: '0.1.0' });
  await client.connect(transport);
  return {
    client,
    transport,
    readStderr: () => stderr,
    close: async () => {
      await client.close();
    },
  };
}
