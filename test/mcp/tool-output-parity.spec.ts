import { describe, expect, it } from 'vitest';

import { type LocateStatus } from '../../src/contracts/index.js';
import {
  connectMcpStdioFixture,
  parseLocateToolResultParity,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

function selected(caseId: string): boolean {
  return isSelected({ group: 'mcp-surface', caseId });
}

const baseArguments = {
  repoPath: 'D:/fixture/repository',
  terms: ['hcp_id', 'hcpId'],
} as const;

describe.runIf(selected('source-field-mapping'))(
  'MCP success output parity',
  () => {
    it('returns one confirmed mapping through real stdio', async () => {
      const session = await connectMcpStdioFixture();
      try {
        const result = await session.client.callTool({
          name: 'repo_nav_locate',
          arguments: {
            ...baseArguments,
            question: 'source-field-mapping',
          },
        });
        const parsed = parseLocateToolResultParity(result);
        const output = parsed.output;
        expect(parsed.isError).toBe(false);
        expect(output.ok).toBe(true);
        if (output.ok) {
          expect(output.evidence.status).toBe('ok');
          expect(output.evidence.confirmed).toHaveLength(1);
          expect(output.evidence.confirmed[0]?.role).toBe('value-mapping');
        }
      } finally {
        await session.close();
      }
    });
  },
);

describe.runIf(selected('recoverable-status-parity'))(
  'MCP recoverable status parity',
  () => {
    it('keeps all recoverable statuses out of the MCP error channel', async () => {
      const session = await connectMcpStdioFixture();
      const statuses: readonly LocateStatus[] = [
        'ok',
        'no_result',
        'partial',
        'backend_unavailable',
        'timeout',
      ];
      try {
        for (const status of statuses) {
          const result = await session.client.callTool({
            name: 'repo_nav_locate',
            arguments: {
              ...baseArguments,
              question: `status:${status}`,
            },
          });
          const parsed = parseLocateToolResultParity(result);
          const output = parsed.output;
          expect(parsed.isError).toBe(false);
          expect(output.ok).toBe(true);
          if (output.ok) {
            expect(output.evidence.status).toBe(status);
          }
        }
      } finally {
        await session.close();
      }
    });
  },
);
