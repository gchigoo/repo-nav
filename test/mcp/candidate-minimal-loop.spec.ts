import { describe, expect, it } from 'vitest';

import {
  connectMcpStdioFixture,
  parseLocateToolResultParity,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({ group: 'mcp-surface', caseId: 'candidate-minimal-loop' }),
)('MCP candidate minimal loop', () => {
  it('returns confirmed and bounded candidates with transport parity', async () => {
    const session = await connectMcpStdioFixture();
    try {
      const result = await session.client.callTool({
        name: 'repo_nav_locate',
        arguments: {
          repoPath: 'D:/fixture/repository',
          question: 'candidate-minimal-loop',
          terms: ['hcpId', 'row.hcp_id'],
          limits: { maxCandidates: 8 },
        },
      });
      const parsed = parseLocateToolResultParity(result);
      expect(parsed.isError).toBe(false);
      expect(parsed.output.ok).toBe(true);
      if (!parsed.output.ok) {
        throw new Error(
          `Candidate MCP loop failed: ${parsed.output.error.code}`,
        );
      }
      const evidence = parsed.output.evidence;
      expect(evidence.confirmed).toContainEqual(
        expect.objectContaining({
          role: 'value-mapping',
          location: expect.objectContaining({ file: 'server/mapping.fixture' }),
        }),
      );
      expect(
        evidence.candidates.map((candidate) => ({
          role: candidate.role,
          symbol: candidate.location.symbol,
          reasonCodes: candidate.reasonCodes,
        })),
      ).toEqual([
        {
          role: 'related',
          symbol: 'sourceAlias',
          reasonCodes: ['ALIAS_SOURCE_NEIGHBOR'],
        },
        {
          role: 'related',
          symbol: 'hcpId',
          reasonCodes: ['SAME_SCOPE_SIMILAR_IDENTIFIER'],
        },
        {
          role: 'related',
          symbol: 'hcpName',
          reasonCodes: ['SAME_SCOPE_SIMILAR_IDENTIFIER', 'SAME_ENTITY_SIBLING'],
        },
        {
          role: 'related',
          symbol: 'hcpEmail',
          reasonCodes: ['SAME_SCOPE_SIMILAR_IDENTIFIER', 'SAME_ENTITY_SIBLING'],
        },
      ]);
      expect(
        evidence.candidates.some((candidate) =>
          candidate.reasonCodes.includes('SECONDARY_BACKEND_HIT'),
        ),
      ).toBe(false);
    } finally {
      await session.close();
    }
  });
});
