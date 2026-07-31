import { setTimeout as delay } from 'node:timers/promises';

import { describe, expect } from 'vitest';

import {
  connectMcpStdioFixture,
  type McpStdioFixtureSession,
} from '../../testkit/contracts/index.js';
import { platformContractIt } from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'mcp-surface',
  caseId: 'request-cancellation-cleanup',
} as const;

async function waitForStderr(
  session: McpStdioFixtureSession,
  marker: string,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (session.readStderr().includes(marker)) {
      return;
    }
    await delay(20);
  }
  throw new Error(`MCP fixture did not emit ${marker}.`);
}

function cancellationArguments(): Readonly<Record<string, unknown>> {
  return {
    repoPath: 'D:/fixture/repository',
    question: 'wait-for-cancellation',
    terms: ['hcp_id'],
  };
}

describe.runIf(isSelected(identity))('MCP request cancellation cleanup', () => {
  platformContractIt(
    'F4-MCP-001',
    'pre-handler-cancel',
    'does not lose cancellation sent before the handler starts work',
    async () => {
      const session = await connectMcpStdioFixture();
      const controller = new AbortController();
      try {
        const call = session.client.callTool(
          { name: 'repo_nav_locate', arguments: cancellationArguments() },
          undefined,
          { signal: controller.signal },
        );
        controller.abort();
        await expect(call).rejects.toThrow();
        await delay(100);

        const stderr = session.readStderr();
        expect(
          stderr.length === 0 ||
            (stderr.includes('MCP_FIXTURE_STARTED') &&
              stderr.includes('MCP_FIXTURE_ABORTED')),
        ).toBe(true);
      } finally {
        await session.close();
      }
    },
  );

  platformContractIt(
    'F4-MCP-001',
    'inflight-signal',
    'propagates the SDK request signal to the application service',
    async () => {
      const session = await connectMcpStdioFixture();
      const controller = new AbortController();
      try {
        const call = session.client.callTool(
          { name: 'repo_nav_locate', arguments: cancellationArguments() },
          undefined,
          { signal: controller.signal },
        );
        await waitForStderr(session, 'MCP_FIXTURE_STARTED');
        controller.abort();
        await expect(call).rejects.toThrow();
        await waitForStderr(session, 'MCP_FIXTURE_ABORTED');
      } finally {
        await session.close();
      }
    },
  );

  platformContractIt(
    'F4-MCP-001',
    'eof-abort',
    'aborts an in-flight locate when stdin reaches EOF',
    async () => {
      const session = await connectMcpStdioFixture();
      const call = session.client
        .callTool({
          name: 'repo_nav_locate',
          arguments: cancellationArguments(),
        })
        .catch(() => undefined);
      await waitForStderr(session, 'MCP_FIXTURE_STARTED');
      await session.close();
      await call;
      expect(session.readStderr()).toContain('MCP_FIXTURE_ABORTED');
    },
  );
});
