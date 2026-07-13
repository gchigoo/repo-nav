import { z } from 'zod';

import {
  BACKEND_REASON_CODES,
  CANDIDATE_REASON_CODES,
  CONFIRMED_REASON_CODES,
  EVIDENCE_OPERATION_CODES,
  EVIDENCE_ROLES,
  EVIDENCE_SCHEMA_VERSION,
  EVIDENCE_SOURCES,
  EXCLUSION_REASON_CODES,
  LIMIT_REASON_CODES,
  LOCATE_STATUSES,
  NEXT_ACTION_CODES,
  PROMOTION_REQUIREMENT_CODES,
  REDACTION_REASON_CODES,
  SEARCH_BACKEND_IDS,
  TOOL_ERROR_CODES,
} from './constants.js';
import { NormalizedSearchTermSchema } from './request.js';

const nonEmptyUniqueArray = <T extends z.ZodType>(schema: T) =>
  z
    .array(schema)
    .min(1)
    .refine((values) => new Set(values).size === values.length)
    .readonly();

export const LocateStatusSchema = z.enum(LOCATE_STATUSES);
export type LocateStatus = z.infer<typeof LocateStatusSchema>;

export const EvidenceSourceSchema = z.enum(EVIDENCE_SOURCES);
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const SearchBackendIdSchema = z.enum(SEARCH_BACKEND_IDS);
export type SearchBackendId = z.infer<typeof SearchBackendIdSchema>;

export const EvidenceRoleSchema = z.enum(EVIDENCE_ROLES);
export type EvidenceRole = z.infer<typeof EvidenceRoleSchema>;

export const RedactionReasonCodeSchema = z.enum(REDACTION_REASON_CODES);
export type RedactionReasonCode = z.infer<typeof RedactionReasonCodeSchema>;

export const ConfirmedReasonCodeSchema = z.enum(CONFIRMED_REASON_CODES);
export type ConfirmedReasonCode = z.infer<typeof ConfirmedReasonCodeSchema>;

export const CandidateReasonCodeSchema = z.enum(CANDIDATE_REASON_CODES);
export type CandidateReasonCode = z.infer<typeof CandidateReasonCodeSchema>;

export const PromotionRequirementCodeSchema = z.enum(
  PROMOTION_REQUIREMENT_CODES,
);
export type PromotionRequirementCode = z.infer<
  typeof PromotionRequirementCodeSchema
>;

export const NextActionCodeSchema = z.enum(NEXT_ACTION_CODES);
export type NextActionCode = z.infer<typeof NextActionCodeSchema>;

export const EvidenceOperationCodeSchema = z.enum(EVIDENCE_OPERATION_CODES);
export type EvidenceOperationCode = z.infer<
  typeof EvidenceOperationCodeSchema
>;

export const BackendReasonCodeSchema = z.enum(BACKEND_REASON_CODES);
export type BackendReasonCode = z.infer<typeof BackendReasonCodeSchema>;

export const LimitReasonCodeSchema = z.enum(LIMIT_REASON_CODES);
export type LimitReasonCode = z.infer<typeof LimitReasonCodeSchema>;

export const ExclusionReasonCodeSchema = z.enum(EXCLUSION_REASON_CODES);
export type ExclusionReasonCode = z.infer<typeof ExclusionReasonCodeSchema>;

export const EvidenceLinesSchema = z
  .tuple([z.int().positive(), z.int().positive()])
  .refine(([start, end]) => start <= end, 'Evidence line range is reversed.')
  .readonly();

export const EvidenceLocationSchema = z
  .strictObject({
    file: z.string().min(1),
    symbol: z.string().min(1).optional(),
    lines: EvidenceLinesSchema,
    excerpt: z.string().min(1),
    redaction: z
      .strictObject({
        applied: z.literal(true),
        reasonCodes: nonEmptyUniqueArray(RedactionReasonCodeSchema),
      })
      .readonly()
      .optional(),
  })
  .readonly();
export type EvidenceLocation = z.infer<typeof EvidenceLocationSchema>;

export const EvidenceProvenanceSchema = z
  .strictObject({
    discoveredBy: nonEmptyUniqueArray(EvidenceSourceSchema),
    verifiedBy: z.literal('filesystem'),
    operations: nonEmptyUniqueArray(EvidenceOperationCodeSchema),
  })
  .readonly();
export type EvidenceProvenance = z.infer<typeof EvidenceProvenanceSchema>;

const evidenceId = z.string().regex(/^evidence:v1:[a-f0-9]{64}$/u);

export const ConfirmedEvidenceSchema = z
  .strictObject({
    evidenceClass: z.literal('confirmed'),
    id: evidenceId,
    role: EvidenceRoleSchema,
    location: EvidenceLocationSchema,
    provenance: EvidenceProvenanceSchema,
    reasonCodes: nonEmptyUniqueArray(ConfirmedReasonCodeSchema),
  })
  .readonly();
export type ConfirmedEvidence = z.infer<typeof ConfirmedEvidenceSchema>;

export const CandidateEvidenceSchema = z
  .strictObject({
    evidenceClass: z.literal('candidate'),
    id: evidenceId,
    role: EvidenceRoleSchema,
    location: EvidenceLocationSchema,
    provenance: EvidenceProvenanceSchema,
    reasonCodes: nonEmptyUniqueArray(CandidateReasonCodeSchema),
    promotionRequirements: nonEmptyUniqueArray(PromotionRequirementCodeSchema),
  })
  .readonly();
export type CandidateEvidence = z.infer<typeof CandidateEvidenceSchema>;

export const BackendAttemptSchema = z
  .strictObject({
    backend: SearchBackendIdSchema,
    status: z.enum(['used', 'unavailable', 'skipped', 'failed']),
    reasonCode: BackendReasonCodeSchema.optional(),
    hitCount: z.int().nonnegative(),
  })
  .readonly();
export type BackendAttempt = z.infer<typeof BackendAttemptSchema>;

export const CoverageReportSchema = z
  .strictObject({
    backends: z.array(BackendAttemptSchema).readonly(),
    fallbackChecked: z.boolean(),
    indexState: z.enum([
      'available',
      'missing',
      'unavailable',
      'error',
      'unknown',
    ]),
    indexFreshness: z.enum([
      'not-applicable',
      'unknown',
      'possibly-stale',
    ]),
    limitsReached: z.array(LimitReasonCodeSchema).readonly(),
    exclusionSummary: z
      .partialRecord(ExclusionReasonCodeSchema, z.int().nonnegative())
      .readonly(),
  })
  .readonly();
export type CoverageReport = z.infer<typeof CoverageReportSchema>;

export const EvidencePackSchema = z
  .strictObject({
    schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
    status: LocateStatusSchema,
    repositoryRoot: z.string().min(1),
    normalizedTerms: z.array(NormalizedSearchTermSchema).min(1).readonly(),
    confirmed: z.array(ConfirmedEvidenceSchema).readonly(),
    candidates: z.array(CandidateEvidenceSchema).readonly(),
    coverage: CoverageReportSchema,
    nextActions: z.array(NextActionCodeSchema).readonly(),
  })
  .readonly()
  .superRefine((pack, context) => {
    const confirmedIds = new Set(pack.confirmed.map((item) => item.id));
    const duplicateId = pack.candidates.find((item) => confirmedIds.has(item.id));
    if (duplicateId !== undefined) {
      context.addIssue({
        code: 'custom',
        message: `Evidence ID appears in both classes: ${duplicateId.id}`,
        path: ['candidates'],
      });
    }
  });
export type EvidencePack = z.infer<typeof EvidencePackSchema>;

export const RepoNavToolErrorSchema = z
  .strictObject({
    code: z.enum(TOOL_ERROR_CODES),
    message: z.string().min(1),
    recoverable: z.boolean(),
    suggestedAction: NextActionCodeSchema.optional(),
  })
  .readonly();
export type RepoNavToolError = z.infer<typeof RepoNavToolErrorSchema>;

export const LocateResultSchema = z.discriminatedUnion('ok', [
  z
    .strictObject({
      ok: z.literal(true),
      evidence: EvidencePackSchema,
    })
    .readonly(),
  z
    .strictObject({
      ok: z.literal(false),
      error: RepoNavToolErrorSchema,
    })
    .readonly(),
]);
export type LocateResult = z.infer<typeof LocateResultSchema>;
export type LocateToolOutput = LocateResult;
