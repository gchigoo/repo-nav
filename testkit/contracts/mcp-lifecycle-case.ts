import { z } from 'zod';

import { EVIDENCE_SCHEMA_VERSION } from '../../src/contracts/index.js';

export const McpLifecycleCaseSchema = z
  .strictObject({
    schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
    id: z.string().min(1),
    scenario: z.enum([
      'stdio-clean-output',
      'graceful-shutdown',
      'shutdown-cleanup-probe',
    ]),
    expected: z
      .strictObject({
        stdoutMode: z.literal('mcp-frames-only'),
        exitCode: z.int().min(0).max(255),
        maxShutdownMs: z.int().positive(),
      })
      .readonly(),
  })
  .readonly();

export type McpLifecycleCase = z.infer<typeof McpLifecycleCaseSchema>;
