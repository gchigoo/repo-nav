import { z } from 'zod';

import {
  BackendHealthSchema,
  SearchBackendIdSchema,
} from '../contracts/index.js';
import { LocateResultV2Schema } from '../contracts/v2/locate-result-v2.js';

export const CLI_SCHEMA_VERSION = '1.0' as const;

export const ProbeBackendDiagnosticSchema = z
  .strictObject({
    backend: SearchBackendIdSchema,
    health: BackendHealthSchema,
  })
  .readonly();

export const ProbeOutputSchema = z
  .strictObject({
    schemaVersion: z.literal(CLI_SCHEMA_VERSION),
    repositoryRootRedacted: z.literal('<repository-root>'),
    backends: z.array(ProbeBackendDiagnosticSchema).readonly(),
  })
  .readonly();
export type ProbeOutput = z.infer<typeof ProbeOutputSchema>;

export const CliErrorOutputSchema = z
  .strictObject({
    schemaVersion: z.literal(CLI_SCHEMA_VERSION),
    ok: z.literal(false),
    error: z
      .strictObject({
        code: z.enum(['CLI_USAGE', 'INVALID_REPOSITORY', 'CLI_INTERNAL']),
        message: z.string().min(1),
      })
      .readonly(),
  })
  .readonly();
export type CliErrorOutput = z.infer<typeof CliErrorOutputSchema>;

export const CliFormalOutputSchema = z.union([
  LocateResultV2Schema,
  ProbeOutputSchema,
  CliErrorOutputSchema,
]);

/**
 * Create a CLI-private error envelope (usage/internal/probe only).
 */
export function createCliError(
  code: CliErrorOutput['error']['code'],
  message: string,
): CliErrorOutput {
  return CliErrorOutputSchema.parse({
    schemaVersion: CLI_SCHEMA_VERSION,
    ok: false,
    error: { code, message },
  });
}

/** Removed from public CLI; retained stub for source-checkout docs smoke imports. */
export const GoldenOutputSchema = z
  .object({
    schemaVersion: z.literal(CLI_SCHEMA_VERSION),
    selection: z.array(z.string()),
    counts: z.object({
      passed: z.number(),
      failed: z.number(),
      skipped: z.number(),
      total: z.number(),
    }),
    failures: z.array(z.string()),
    artifactPaths: z.array(z.string()),
  })
  .readonly();
