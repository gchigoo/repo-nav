import { describe, expect, it } from 'vitest';

import type { LocateResultV2 } from '../../src/contracts/v2/locate-result-v2.js';
import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import {
  LocateAgentViewV2Schema,
  projectLocateAgentViewV2,
} from '../../src/mcp/locate-agent-view-v2.js';
import { serializeLocateTransportView } from '../../src/mcp/locate-tool-output.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'mcp-surface',
    caseId: 'locate-agent-view',
  }),
)('MCP locate agent view', () => {
  it('projects a lean success view without coverage', () => {
    const transport = finalizeLocateResultV2(
      locateExecutionFinalizerInputFromUnsafePublicSourceV2(
        createUnsafeLocateSuccessV2(),
      ),
    );
    const request = {
      repoPath: '/workspace/repository',
      question: 'Where is resolveMapping used for hcp_id?',
      terms: ['mapping'],
    };
    const view = projectLocateAgentViewV2(transport.value, request);
    expect(LocateAgentViewV2Schema.parse(view)).toEqual(view);
    expect(view.ok).toBe(true);
    if (!view.ok) {
      throw new Error('Expected agent success view.');
    }
    expect(view.schemaVersion).toBe('2.0-agent');
    expect(view.confirmed).toHaveLength(1);
    expect(view.confirmed[0]).toMatchObject({
      file: 'src/server/mapping.ts',
      excerpt: 'export const resolveMapping = true;',
    });
    expect(view).not.toHaveProperty('coverage');
    const serialized = serializeLocateTransportView(transport, request);
    expect(serialized.structuredContent).toEqual(transport.value);
    const textEntry = serialized.content[0];
    expect(textEntry?.type).toBe('text');
    if (textEntry?.type !== 'text') {
      throw new Error('Expected MCP text content.');
    }
    expect(JSON.parse(textEntry.text)).toEqual(view);
  });

  it('suggests question identifiers and candidate ids', () => {
    const noResult = {
      ok: true,
      evidence: {
        status: 'no_result',
        confirmed: [],
        candidates: [],
        nextActions: ['ADD_TERM', 'ADD_SYMBOL_ANCHOR'],
      },
    } as unknown as LocateResultV2;
    const noResultView = projectLocateAgentViewV2(noResult, {
      question: 'Find resolveMapping and HcpRecord mapping',
      terms: ['mapping'],
    });
    expect(noResultView).toMatchObject({
      ok: true,
      nextActions: [
        { code: 'ADD_TERM', terms: ['resolveMapping', 'HcpRecord'] },
        {
          code: 'ADD_SYMBOL_ANCHOR',
          symbols: ['resolveMapping', 'HcpRecord', 'mapping'],
        },
      ],
    });

    const candidateView = projectLocateAgentViewV2({
      ok: true,
      evidence: {
        status: 'partial',
        confirmed: [],
        candidates: [
          {
            id: 'evidence:v2:0002',
            evidenceClass: 'candidate',
            role: 'related',
            location: {
              file: 'src/server/neighbor.ts',
              resolvable: true,
              lines: [2, 2],
              excerpt: 'const resolveMappingAlt = 1;',
            },
            reasonCodes: ['SAME_SCOPE_SIMILAR_IDENTIFIER'],
          },
        ],
        nextActions: ['CONFIRM_CANDIDATE'],
      },
    } as unknown as LocateResultV2);
    expect(candidateView).toMatchObject({
      ok: true,
      nextActions: [
        { code: 'CONFIRM_CANDIDATE', evidenceIds: ['evidence:v2:0002'] },
      ],
    });
  });

  it('projects typed errors without coverage', () => {
    const transport = finalizeLocateResultV2({
      ok: false,
      error: { code: 'INVALID_INPUT', suggestedAction: 'ADD_TERM' },
    });
    const view = projectLocateAgentViewV2(transport.value, {
      terms: [],
    });
    expect(view).toEqual({
      ok: false,
      schemaVersion: '2.0-agent',
      error: {
        code: 'INVALID_INPUT',
        message: 'Locate request does not match the required schema.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    });
  });
});
