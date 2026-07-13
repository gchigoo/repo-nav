import { z } from 'zod';

import {
  BackendReasonCodeSchema,
  CandidateReasonCodeSchema,
  ConfirmedReasonCodeSchema,
  EVIDENCE_SCHEMA_VERSION,
  EvidenceRoleSchema,
  ExclusionReasonCodeSchema,
  LimitReasonCodeSchema,
  LocateRequestSchema,
  LocateResultSchema,
  LocateStatusSchema,
  RepoNavToolErrorSchema,
} from '../../src/contracts/index.js';

const evidenceId = z.string().regex(/^evidence:v1:[a-f0-9]{64}$/u);

export const EvidenceExpectationSchema = z
  .strictObject({
    file: z.string().min(1),
    contains: z.string().min(1),
    role: EvidenceRoleSchema.optional(),
    reasonCodes: z
      .array(z.union([ConfirmedReasonCodeSchema, CandidateReasonCodeSchema]))
      .readonly()
      .optional(),
  })
  .readonly();
export type EvidenceExpectation = z.infer<typeof EvidenceExpectationSchema>;

const GoldenCaseBaseShape = {
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  id: z.string().min(1),
  fixtureRoot: z.string().min(1),
} as const;

export const GoldenSuccessCaseSchema = z
  .strictObject({
    ...GoldenCaseBaseShape,
    kind: z.literal('success'),
    request: LocateRequestSchema,
    expected: z
      .strictObject({
        ok: z.literal(true),
        status: LocateStatusSchema,
        confirmed: z.array(EvidenceExpectationSchema).readonly(),
        candidates: z.array(EvidenceExpectationSchema).readonly(),
        forbiddenEvidenceIds: z.array(evidenceId).readonly(),
        requiredCoverageCodes: z
          .array(z.union([BackendReasonCodeSchema, LimitReasonCodeSchema]))
          .readonly(),
        minimumExclusionCounts: z
          .partialRecord(ExclusionReasonCodeSchema, z.int().nonnegative())
          .readonly(),
      })
      .readonly(),
  })
  .readonly();
export type GoldenSuccessCase = z.infer<typeof GoldenSuccessCaseSchema>;

export const GoldenErrorCaseSchema = z
  .strictObject({
    ...GoldenCaseBaseShape,
    kind: z.literal('error'),
    requestJson: z.unknown(),
    expected: z
      .strictObject({
        ok: z.literal(false),
        error: RepoNavToolErrorSchema.unwrap().pick({
          code: true,
          recoverable: true,
          suggestedAction: true,
        }),
        mcpIsError: z.literal(true),
        structuredTextParity: z.literal(true),
      })
      .readonly(),
  })
  .readonly();
export type GoldenErrorCase = z.infer<typeof GoldenErrorCaseSchema>;

export const GoldenCaseSchema = z.discriminatedUnion('kind', [
  GoldenSuccessCaseSchema,
  GoldenErrorCaseSchema,
]);
export type GoldenCase = z.infer<typeof GoldenCaseSchema>;

export const GoldenObservationSchema = z
  .strictObject({
    result: LocateResultSchema,
    mcpIsError: z.boolean(),
    structuredContent: LocateResultSchema,
    textContent: z.string(),
  })
  .readonly();
export type GoldenObservation = z.infer<typeof GoldenObservationSchema>;
