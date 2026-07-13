import { z } from 'zod';

import {
  BackendHealthSchema,
  LocateToolOutputSchema,
  SearchBackendIdSchema,
} from '../../src/contracts/index.js';

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

export const GoldenOutputSchema = z
  .strictObject({
    schemaVersion: z.literal(CLI_SCHEMA_VERSION),
    selection: z.array(z.string().min(1)).readonly(),
    counts: z
      .strictObject({
        passed: z.int().nonnegative(),
        failed: z.int().nonnegative(),
        skipped: z.int().nonnegative(),
        total: z.int().nonnegative(),
      })
      .readonly(),
    failures: z.array(z.string()).readonly(),
    artifactPaths: z.array(z.string().min(1)).readonly(),
  })
  .readonly();
export type GoldenOutput = z.infer<typeof GoldenOutputSchema>;

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
  LocateToolOutputSchema,
  ProbeOutputSchema,
  GoldenOutputSchema,
  CliErrorOutputSchema,
]);

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
