import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Ajv2020, type AnySchemaObject } from 'ajv/dist/2020.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  ErrorCode,
  McpError,
  ToolSchema,
  type ClientRequest,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createRepoNavApplicationContext } from '../../src/app/create-application-context.js';
import { LocateRequestSchema } from '../../src/contracts/index.js';
import { LocateResultV2Schema } from '../../src/contracts/v2/locate-result-v2.js';
import { NodeMcpStdioHost } from '../../src/mcp/mcp-stdio-host.js';
import {
  REPO_NAV_LOCATE_INPUT_SCHEMA,
  REPO_NAV_LOCATE_OUTPUT_SCHEMA,
  REPO_NAV_LOCATE_TOOL_NAME,
} from '../../src/mcp/locate-tool-schema.js';
import { createRepoNavMcpServer } from '../../src/mcp/repo-nav-mcp-server.js';
import { MCP_STDIO_HOST } from '../../src/runtime/tokens.js';
import { isSelected } from '../../testkit/testing/selection.js';

interface ConnectedSurface {
  readonly client: Client;
  close(): Promise<void>;
}

async function connectSurface(
  handler: () => Promise<CallToolResult>,
): Promise<ConnectedSurface> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createRepoNavMcpServer(async () => await handler());
  const client = new Client({ name: 'repo-nav-tests', version: '0.1.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function selected(caseId: string): boolean {
  return isSelected({ group: 'mcp-surface', caseId });
}

function loadToolSchemaSnapshot(): z.infer<typeof ToolSchema> {
  const snapshotPath = resolve(
    import.meta.dirname,
    '..',
    '..',
    'docs',
    'superpowers',
    'archive',
    'codestable',
    'features',
    '2026-07-10-mcp-locate-surface',
    'mcp-locate-surface-tool-schema.json',
  );
  const snapshot: unknown = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  return z
    .strictObject({ sdkVersion: z.literal('1.29.0'), tool: ToolSchema })
    .parse(snapshot).tool;
}

describe.runIf(selected('initialize-tools-capability'))(
  'MCP initialize capability',
  () => {
    it('advertises only the tools capability', async () => {
      const surface = await connectSurface(async () => ({ content: [] }));
      try {
        expect(surface.client.getServerCapabilities()).toEqual({
          tools: { listChanged: false },
        });
      } finally {
        await surface.close();
      }
    });
  },
);

describe.runIf(selected('tool-list-schema'))('MCP tool schemas', () => {
  it('publishes exact object input and output schemas', async () => {
    const surface = await connectSurface(async () => ({ content: [] }));
    try {
      const listed = await surface.client.listTools();
      const tool = listed.tools[0];
      expect(listed.tools).toHaveLength(1);
      expect(tool?.name).toBe(REPO_NAV_LOCATE_TOOL_NAME);
      expect(tool?.inputSchema).toEqual(REPO_NAV_LOCATE_INPUT_SCHEMA);
      expect(tool?.outputSchema).toEqual(REPO_NAV_LOCATE_OUTPUT_SCHEMA);
      expect(tool).toEqual(loadToolSchemaSnapshot());
      expect(tool?.inputSchema.type).toBe('object');
      expect(tool?.outputSchema?.type).toBe('object');
      expect(tool?.inputSchema.$schema).toBe(
        'https://json-schema.org/draft/2020-12/schema',
      );
      expect(tool?.outputSchema?.$schema).toBe(
        'https://json-schema.org/draft/2020-12/schema',
      );
    } finally {
      await surface.close();
    }
  });

  it('publishes representable constraints and preserves runtime-only checks', () => {
    const validator = new Ajv2020({ strict: true, allErrors: true }).compile(
      REPO_NAV_LOCATE_INPUT_SCHEMA as unknown as AnySchemaObject,
    );
    const validRequest = {
      repoPath: 'D:/repository',
      question: 'locate hcp id',
      terms: ['hcp_id'],
    };

    expect(validator(validRequest)).toBe(true);
    expect(validator({ ...validRequest, repoPath: '' })).toBe(false);
    expect(validator({ ...validRequest, terms: [''] })).toBe(false);
    expect(REPO_NAV_LOCATE_INPUT_SCHEMA.$comment).toContain('UTF-8 byte budget');
    // F6：repoPath 保留空白 code units；空串仍拒绝
    expect(
      LocateRequestSchema.safeParse({ ...validRequest, repoPath: '' }).success,
    ).toBe(false);
    expect(
      LocateRequestSchema.safeParse({ ...validRequest, repoPath: '   ' }).success,
    ).toBe(true);
    expect(
      LocateRequestSchema.safeParse({
        ...validRequest,
        question: '😀'.repeat(1_025),
      }).success,
    ).toBe(false);
  });

  it('publishes output tuple arity and unique-array constraints', () => {
    const validator = new Ajv2020({ strict: true, allErrors: true }).compile(
      REPO_NAV_LOCATE_OUTPUT_SCHEMA as unknown as AnySchemaObject,
    );
    const validOutput = {
      ok: true,
      evidence: {
        schemaVersion: '2.0',
        status: 'ok',
        repositoryRef: 'local-repository',
        normalizedTerms: [{ value: 'hcp_id', caseSensitive: false }],
        confirmed: [
          {
            evidenceClass: 'confirmed',
            id: 'evidence:v2:0001',
            role: 'value-mapping',
            location: {
              file: 'server/mapping.ts',
              resolvable: true,
              lines: [1, 1],
              excerpt: 'hcpId = hcp_id;',
            },
            provenance: {
              discoveredBy: ['ripgrep'],
              verifiedBy: 'filesystem',
              operations: ['RIPGREP_SEARCH'],
            },
            reasonCodes: ['DIRECT_ALIAS_MAPPING'],
          },
        ],
        candidates: [],
        coverage: {
          backends: [
            {
              backend: 'ripgrep',
              status: 'used',
              completion: 'complete',
              termination: 'none',
              hitCount: 1,
            },
          ],
          strategyComplete: true,
          fallbackChecked: false,
          indexState: 'unknown',
          indexFreshness: 'unknown',
          limitsReached: [],
          degradations: [],
          exclusionSummary: {},
          abortSource: 'none',
          unsatisfiedAnchors: [],
          snapshot: {
            gitState: 'unknown',
            consistency: 'stable',
            filesChecked: 1,
            discardedEvidenceCount: 0,
          },
          scope: {
            requested: [],
            effective: ['client', 'server', 'db', 'config', 'unknown'],
            policyVersion: 'repo-scope-v1',
            unmatchedLayers: [],
          },
          capabilities: {
            textSearch: 'supported-text-files',
            semanticClassification: ['typescript', 'javascript', 'sql'],
            unsupportedLanguageHits: 0,
          },
        },
        nextActions: [],
      },
    };
    expect(LocateResultV2Schema.safeParse(validOutput).success).toBe(true);
    expect(validator(validOutput)).toBe(true);

    for (const invalidLines of [[], [1], [1, 2, 3]]) {
      const invalidOutput = structuredClone(validOutput);
      invalidOutput.evidence.confirmed[0]!.location.lines = invalidLines;
      expect(LocateResultV2Schema.safeParse(invalidOutput).success).toBe(false);
      expect(validator(invalidOutput)).toBe(false);
    }

    const duplicateReasons = structuredClone(validOutput);
    duplicateReasons.evidence.confirmed[0]!.reasonCodes = [
      'DIRECT_ALIAS_MAPPING',
      'DIRECT_ALIAS_MAPPING',
    ];
    expect(LocateResultV2Schema.safeParse(duplicateReasons).success).toBe(
      false,
    );
    expect(validator(duplicateReasons)).toBe(false);
  });
});

describe.runIf(selected('single-tool-readonly'))('MCP tool annotations', () => {
  it('publishes one read-only non-destructive idempotent tool', async () => {
    const surface = await connectSurface(async () => ({ content: [] }));
    try {
      const listed = await surface.client.listTools();
      expect(listed.tools.map((tool) => tool.name)).toEqual([
        REPO_NAV_LOCATE_TOOL_NAME,
      ]);
      expect(listed.tools[0]?.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
    } finally {
      await surface.close();
    }
  });

  it('mounts a standalone host without an HTTP listener', async () => {
    const application = await createRepoNavApplicationContext();
    try {
      expect(application.get(MCP_STDIO_HOST)).toBeInstanceOf(NodeMcpStdioHost);
      expect('listen' in application).toBe(false);
    } finally {
      await application.close();
    }
  });
});

describe.runIf(selected('unknown-tool-jsonrpc-boundary'))(
  'MCP unknown tool boundary',
  () => {
    it('rejects unknown names before invoking the locate handler', async () => {
      let calls = 0;
      const surface = await connectSurface(async () => {
        calls += 1;
        return { content: [] };
      });
      try {
        const call = surface.client.callTool({
          name: 'unknown_tool',
          arguments: {},
        });
        await expect(call).rejects.toBeInstanceOf(McpError);
        await expect(call).rejects.toMatchObject({
          code: ErrorCode.InvalidParams,
        });
        expect(calls).toBe(0);
      } finally {
        await surface.close();
      }
    });
  },
);

describe.runIf(selected('invalid-input'))('MCP protocol-invalid boundary', () => {
  it('leaves a non-object arguments envelope in the SDK error channel', async () => {
    let calls = 0;
    const surface = await connectSurface(async () => {
      calls += 1;
      return { content: [] };
    });
    try {
      const invalidRequest = {
        method: 'tools/call',
        params: {
          name: REPO_NAV_LOCATE_TOOL_NAME,
          arguments: 'not-an-object',
        },
      } as unknown as ClientRequest;
      const call = surface.client.request(invalidRequest, z.unknown());
      await expect(call).rejects.toBeInstanceOf(McpError);
      expect(calls).toBe(0);
    } finally {
      await surface.close();
    }
  });
});
