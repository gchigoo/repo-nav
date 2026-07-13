import { describe, expect, it } from 'vitest';

import {
  connectMcpStdioFixture,
  parseLocateToolResultParity,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const FORBIDDEN = [
  'rawSecretValue',
  'my secret value',
  'abc,def',
  'my backtick secret',
  'backtick,comma',
  'malformed shared value',
  'escaped',
  'dbPassword',
  'querySecret',
  'stan.guo@mail.ru',
  '138-0013-8000',
  'rawDiagnosticSecret',
  'C:\\private\\repo\\secret.ts',
] as const;

describe.runIf(
  isSelected({
    group: 'mcp-surface',
    caseId: 'redaction-output-parity',
  }),
)('MCP redaction output parity', () => {
  it('keeps forbidden values out of structured, text, stdout protocol, and stderr', async () => {
    const session = await connectMcpStdioFixture();
    try {
      const callResult = await session.client.callTool({
        name: 'repo_nav_locate',
        arguments: {
          repoPath: 'D:/fixture/repository',
          question: 'redaction-output-parity',
          terms: ['api_key'],
        },
      });
      const parity = parseLocateToolResultParity(callResult);
      expect(parity.isError).toBe(false);
      expect(parity.output.ok).toBe(true);
      if (!parity.output.ok) {
        throw new Error('Expected a redacted success output.');
      }
      const evidence = parity.output.evidence.confirmed[0];
      expect(evidence?.location.redaction).toEqual({
        applied: true,
        reasonCodes: [
          'SECRET_LIKE_VALUE',
          'CONNECTION_STRING',
          'PERSONAL_DATA',
        ],
      });
      expect(
        parity.output.evidence.confirmed[1]?.location.excerpt,
      ).toBe('[REDACTED:BINARY_OR_OVERSIZED_CONTENT]');
      expect(
        parity.output.evidence.candidates[0]?.location.excerpt,
      ).toBe('const alias = "[REDACTED]";');
      const allPublicOutput = JSON.stringify(callResult);
      const stderr = session.readStderr();
      for (const value of FORBIDDEN) {
        expect(allPublicOutput).not.toContain(value);
        expect(stderr).not.toContain(value);
      }
      expect(stderr).toContain('[REDACTED]');
      expect(stderr).toContain('[REDACTED_PATH]');
    } finally {
      await session.close();
    }
  });
});
