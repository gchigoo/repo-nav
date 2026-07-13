import { z } from 'zod';

import { DISCOVERY_REASON_CODES } from './constants.js';
import {
  BackendReasonCodeSchema,
  SearchBackendIdSchema,
  type EvidenceLocation,
  type LocateResult,
  type SearchBackendId,
} from './evidence.js';
import {
  NormalizedLocateAnchorSchema,
  NormalizedSearchTermSchema,
  RepoLayerSchema,
  type LocateRequest,
  type NormalizedSearchTerm,
} from './request.js';

export const BackendHealthSchema = z
  .strictObject({
    state: z.enum(['available', 'missing', 'unavailable', 'error']),
    version: z.string().min(1).optional(),
    indexFound: z.boolean().optional(),
    possibleStaleIndex: z.boolean().optional(),
    reasonCode: BackendReasonCodeSchema.optional(),
  })
  .readonly();
export type BackendHealth = z.infer<typeof BackendHealthSchema>;

export const BackendSearchRequestSchema = z
  .strictObject({
    repositoryRoot: z.string().min(1),
    terms: z.array(NormalizedSearchTermSchema).readonly(),
    anchors: z.array(NormalizedLocateAnchorSchema).readonly(),
    negativeTerms: z.array(NormalizedSearchTermSchema).readonly(),
    layers: z.array(RepoLayerSchema).readonly(),
    maxHits: z.int().positive(),
  })
  .readonly();
export type BackendSearchRequest = z.infer<typeof BackendSearchRequestSchema>;

export const RepositoryReadLimitsSchema = z
  .strictObject({
    maxFileBytes: z.int().positive(),
    maxExcerptBytes: z.int().positive(),
    maxExcerptLines: z.int().positive(),
  })
  .readonly();
export type RepositoryReadLimits = z.infer<
  typeof RepositoryReadLimitsSchema
>;

export const DiscoveryReasonCodeSchema = z.enum(DISCOVERY_REASON_CODES);
export type DiscoveryReasonCode = z.infer<typeof DiscoveryReasonCodeSchema>;

export const BackendHitSchema = z
  .strictObject({
    file: z.string().min(1),
    symbol: z.string().min(1).optional(),
    lines: z
      .tuple([z.int().positive(), z.int().positive()])
      .readonly()
      .optional(),
    matchedText: z.string().optional(),
    source: SearchBackendIdSchema,
    reasonCodes: z
      .array(z.union([DiscoveryReasonCodeSchema, BackendReasonCodeSchema]))
      .min(1)
      .readonly(),
  })
  .readonly();
export type BackendHit = z.infer<typeof BackendHitSchema>;

export const BackendSearchResultSchema = z
  .strictObject({
    health: BackendHealthSchema,
    hits: z.array(BackendHitSchema).readonly(),
    complete: z.boolean(),
    canSkipFallbackIfVerified: z.boolean().optional(),
  })
  .readonly();
export type BackendSearchResult = z.infer<typeof BackendSearchResultSchema>;

export interface LocateExecutionContext {
  readonly signal: AbortSignal;
}

export interface RepositoryEvidenceService {
  locate(
    request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<LocateResult>;
}

export interface RepositorySearchBackend {
  readonly id: SearchBackendId;
  probe(repositoryRoot: string, signal: AbortSignal): Promise<BackendHealth>;
  search(
    request: BackendSearchRequest,
    signal: AbortSignal,
  ): Promise<BackendSearchResult>;
}

export interface RepositoryReader {
  resolveRoot(repoPath: string, signal: AbortSignal): Promise<string>;
  readRange(
    repositoryRoot: string,
    relativeFile: string,
    lines: readonly [number, number],
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation>;
  readWindow(
    repositoryRoot: string,
    relativeFile: string,
    focusLines: readonly [number, number],
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation>;
  findMatches(
    repositoryRoot: string,
    relativeFile: string,
    terms: readonly NormalizedSearchTerm[],
    symbol: string | undefined,
    maxMatches: number,
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<readonly EvidenceLocation[]>;
}
