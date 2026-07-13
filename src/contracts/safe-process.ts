import { Buffer } from 'node:buffer';

import { z } from 'zod';

export const SAFE_PROCESS_FAILURE_KINDS = [
  'invalid-request',
  'spawn-error',
  'non-zero-exit',
  'aborted',
  'timeout',
  'stdout-limit',
  'stderr-limit',
] as const;

export const DEFAULT_SAFE_PROCESS_LIMITS = Object.freeze({
  timeoutMs: 10_000,
  maxStdoutBytes: 4 * 1024 * 1024,
  maxStderrBytes: 1024 * 1024,
  terminateGraceMs: 500,
} as const);

const utf8Length = (value: string): number => Buffer.byteLength(value, 'utf8');

const boundedString = (name: string, maximumBytes: number) =>
  z
    .string()
    .refine((value) => value.length > 0, `${name} must not be empty.`)
    .refine(
      (value) => !value.includes('\u0000'),
      `${name} must not contain NUL.`,
    )
    .refine(
      (value) => utf8Length(value) <= maximumBytes,
      `${name} exceeds ${maximumBytes} UTF-8 bytes.`,
    );

const argvSchema = z
  .array(
    z
      .string()
      .refine((value) => !value.includes('\u0000'))
      .refine((value) => utf8Length(value) <= 4096),
  )
  .max(256)
  .superRefine((argv, context) => {
    if (argv.reduce((total, value) => total + utf8Length(value), 0) > 64 * 1024) {
      context.addIssue({
        code: 'custom',
        message: 'argv exceeds 64 KiB in total.',
      });
    }
  })
  .readonly();

const envSchema = z
  .record(z.string(), z.string())
  .superRefine((env, context) => {
    const entries = Object.entries(env);
    if (entries.length > 64) {
      context.addIssue({ code: 'custom', message: 'env exceeds 64 entries.' });
    }
    let totalBytes = 0;
    for (const [key, value] of entries) {
      totalBytes += utf8Length(key) + utf8Length(value);
      if (
        key.length === 0 ||
        key.includes('=') ||
        key.includes('\u0000') ||
        utf8Length(key) > 128
      ) {
        context.addIssue({
          code: 'custom',
          message: 'env contains an invalid key.',
          path: [key],
        });
      }
      if (value.includes('\u0000') || utf8Length(value) > 4096) {
        context.addIssue({
          code: 'custom',
          message: 'env contains an invalid value.',
          path: [key],
        });
      }
    }
    if (totalBytes > 64 * 1024) {
      context.addIssue({
        code: 'custom',
        message: 'env exceeds 64 KiB in total.',
      });
    }
  })
  .readonly();

export const SafeProcessRequestSchema = z
  .strictObject({
    executable: boundedString('executable', 4096),
    argv: argvSchema,
    cwd: boundedString('cwd', 4096),
    env: envSchema.optional(),
    timeoutMs: z.int().min(100).max(30_000),
    maxStdoutBytes: z.int().min(1024).max(8 * 1024 * 1024),
    maxStderrBytes: z.int().min(1024).max(2 * 1024 * 1024),
    terminateGraceMs: z.int().min(50).max(2_000),
  })
  .readonly();
export type SafeProcessRequest = z.infer<typeof SafeProcessRequestSchema>;

export const SafeProcessSuccessSchema = z
  .strictObject({
    ok: z.literal(true),
    exitCode: z.literal(0),
    stdout: z.instanceof(Uint8Array),
    stderr: z.instanceof(Uint8Array),
  })
  .readonly();
export type SafeProcessSuccess = z.infer<typeof SafeProcessSuccessSchema>;

export const SafeProcessFailureSchema = z
  .strictObject({
    ok: z.literal(false),
    kind: z.enum(SAFE_PROCESS_FAILURE_KINDS),
    exitCode: z.number().int().nullable(),
    terminationSignal: z.string().nullable(),
    stdout: z.instanceof(Uint8Array),
    stderr: z.instanceof(Uint8Array),
  })
  .readonly();
export type SafeProcessFailure = z.infer<typeof SafeProcessFailureSchema>;

export const SafeProcessResultSchema = z.discriminatedUnion('ok', [
  SafeProcessSuccessSchema,
  SafeProcessFailureSchema,
]);
export type SafeProcessResult = z.infer<typeof SafeProcessResultSchema>;

export interface SafeProcessRunner {
  run(
    request: SafeProcessRequest,
    signal: AbortSignal,
  ): Promise<SafeProcessResult>;
}
