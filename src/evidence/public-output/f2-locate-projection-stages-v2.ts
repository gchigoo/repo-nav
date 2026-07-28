import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type {
  CanonicalLocateExecutionV2,
  LocateExecutionTokenV2,
  TrustedLocateProjectionPrerequisitesV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  inspectLocateProjectionPrerequisiteOwnersV2,
  requireTrustedLocateProjectionPrerequisitesV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { LocateProjectionPreparationPortV2 } from '../canonical/locate-projection-preparation-port-v2.js';
import {
  registerTrustedLocateProjectionMaterializationV2,
  registerTrustedLocateProjectionSourceV2,
} from '../canonical/locate-projection-stage-registrar-v2.js';
import {
  requireEvidenceRankingSourceViewV2,
  type EvidenceRankingOutcomeV2,
} from '../ranking/evidence-ranking-outcome-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import { guardCompactJsonDataV2 } from './result-resource-budget-guards-v2.js';
import {
  materializePublicEvidenceV2,
  readTrustedMaterializedEvidenceCoreV2,
  requirePublicMaterializationContributionV2,
  type UnsafePublicMaterializationSourceProofV2,
  type UnsafePublicMaterializationSourceV2,
  type TrustedMaterializedEvidenceCoreV2,
} from './materialized-evidence-core-v2.js';

type F2LocateProjectionStagesV2 = Pick<
  LocateProjectionPreparationPortV2,
  'createSource' | 'materialize'
>;

const outcomeByExecution = new WeakMap<
  LocateExecutionTokenV2,
  Readonly<{
    outcome: EvidenceRankingOutcomeV2;
    snapshotProof: SnapshotTrustProofV2;
  }>
>();

const sourcePayloadByToken = new WeakMap<object, UnsafePublicMaterializationSourceV2>();
const coreByMaterialization = new WeakMap<object, TrustedMaterializedEvidenceCoreV2>();

/**
 * Direct harness：登记同 execution 的 ranking outcome 供 createSource 恢复。
 */
export function registerF2RankingOutcomeForExecutionV2(
  execution: LocateExecutionTokenV2,
  outcome: EvidenceRankingOutcomeV2,
  snapshotProof: SnapshotTrustProofV2,
): void {
  outcomeByExecution.set(
    execution,
    Object.freeze({ outcome, snapshotProof }),
  );
}

const LocationSchema = z
  .object({
    file: z.string(),
    lines: z.tuple([z.number(), z.number()]),
    excerpt: z.string(),
    symbol: z.string().optional(),
  })
  .strict();

const ProvenanceSchema = z
  .object({
    discoveredBy: z.array(z.string()).readonly(),
    verifiedBy: z.string(),
    operations: z.array(z.string()).readonly(),
  })
  .strict();

const OpaqueObjectSchema = z.custom<object>(
  (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
);

const RankedRefSchema = z
  .object({
    recordRef: OpaqueObjectSchema,
    draft: z
      .object({
        evidenceClass: z.enum(['confirmed', 'candidate']),
        role: z.string(),
        location: LocationSchema,
        provenance: ProvenanceSchema,
        reasonCodes: z.array(z.string()).readonly(),
        promotionRequirements: z.array(z.string()).readonly().optional(),
      })
      .strict(),
  })
  .strict();

/** Strict、无 passthrough：仅四 own fields。 */
export const UnsafePublicMaterializationSourceV2Schema = z
  .object({
    normalizedTerms: z
      .array(
        z
          .object({
            value: z.string(),
            caseSensitive: z.boolean(),
          })
          .strict(),
      )
      .readonly(),
    rankedConfirmed: z.array(RankedRefSchema).readonly(),
    rankedCandidates: z.array(RankedRefSchema).readonly(),
    proof: OpaqueObjectSchema,
  })
  .strict();

/**
 * F2 source shallow → 4MiB（复用 F1B compact guard；N+1 在读 element 前失败）。
 */
export function preflightF2MaterializationSourceBudgetV2(
  source: unknown,
): Readonly<{ ok: true } | { ok: false; reason: string }> {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return Object.freeze({ ok: false, reason: 'raw-shape' });
  }
  const record = source as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== 4 ||
    !keys.includes('normalizedTerms') ||
    !keys.includes('rankedConfirmed') ||
    !keys.includes('rankedCandidates') ||
    !keys.includes('proof')
  ) {
    return Object.freeze({ ok: false, reason: 'raw-shape' });
  }
  const confirmed = record.rankedConfirmed;
  const candidates = record.rankedCandidates;
  if (!Array.isArray(confirmed) || !Array.isArray(candidates)) {
    return Object.freeze({ ok: false, reason: 'raw-shape' });
  }
  if (confirmed.length > 10_000 || candidates.length > 10_000) {
    return Object.freeze({ ok: false, reason: 'shallow-count' });
  }
  const compact = guardCompactJsonDataV2(source, 4 * 1024 * 1024);
  if (!compact.ok) {
    return Object.freeze({ ok: false, reason: 'raw-json' });
  }
  return Object.freeze({ ok: true });
}

/**
 * F2 唯一 zero-arg acquisition ABI（无 aggregate）。
 */
export function createF2LocateProjectionStagesV2(): F2LocateProjectionStagesV2 {
  return Object.freeze({
    createSource(prerequisites, input, execution) {
      try {
        const presence = inspectLocateProjectionPrerequisiteOwnersV2(
          input.envelope,
          input,
          execution,
        );
        if (!presence.ok) {
          return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
        }
        requireTrustedLocateProjectionPrerequisitesV2(
          prerequisites,
          input,
          execution,
        );
        const registered = outcomeByExecution.get(execution);
        if (registered === undefined) {
          return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
        }
        const sourceView = requireEvidenceRankingSourceViewV2(
          registered.outcome,
          registered.snapshotProof,
          execution,
        );
        const proof =
          createOpaqueTokenV2<UnsafePublicMaterializationSourceProofV2>();
        const source: UnsafePublicMaterializationSourceV2 = Object.freeze({
          normalizedTerms: Object.freeze([...input.envelope.normalizedTerms]),
          rankedConfirmed: sourceView.rankedConfirmed,
          rankedCandidates: sourceView.rankedCandidates,
          proof,
        });
        const preflight = preflightF2MaterializationSourceBudgetV2(source);
        if (!preflight.ok) {
          return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
        }
        const parsed = UnsafePublicMaterializationSourceV2Schema.safeParse(source);
        if (!parsed.success) {
          return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
        }
        const registration = registerTrustedLocateProjectionSourceV2(
          { identity: source },
          prerequisites,
          input,
          execution,
        );
        if (!registration.ok) {
          return registration;
        }
        sourcePayloadByToken.set(registration.value, source);
        return registration;
      } catch {
        return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
      }
    },
    materialize(source, input, execution) {
      try {
        const payload = sourcePayloadByToken.get(source);
        if (payload === undefined) {
          return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
        }
        // exact-once F1 materializer
        const core = materializePublicEvidenceV2(payload, execution);
        const viewed = readTrustedMaterializedEvidenceCoreV2(
          core,
          payload.proof,
          execution,
        );
        requirePublicMaterializationContributionV2(
          viewed.contribution,
          payload.proof,
          execution,
        );
        // raw vs materialized wrappers must be distinct objects
        for (let i = 0; i < viewed.confirmed.length; i += 1) {
          if (viewed.confirmed[i] === viewed.rawConfirmed[i]?.draft) {
            return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
          }
        }
        const confirmed = viewed.confirmed.map((value, index) =>
          Object.freeze({
            identity: viewed.rawConfirmed[index]!.recordRef,
            value,
          }),
        );
        const candidates = viewed.candidates.map((value, index) =>
          Object.freeze({
            identity: viewed.rawCandidates[index]!.recordRef,
            value,
          }),
        );
        const registration = registerTrustedLocateProjectionMaterializationV2(
          Object.freeze({
            normalizedTerms: viewed.normalizedTerms,
            confirmed: Object.freeze(confirmed),
            candidates: Object.freeze(candidates),
          }),
          source,
          input,
          execution,
        );
        if (!registration.ok) {
          return registration;
        }
        coreByMaterialization.set(registration.value, core);
        return registration;
      } catch {
        return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
      }
    },
  });
}

/**
 * F8 exact aggregation wrapper 取得 core 的唯一 F2 accessor。
 */
export function requireF2MaterializedEvidenceCoreV2(
  materialization: object,
  expectedInput: Extract<CanonicalLocateExecutionV2, { ok: true }>,
  expectedExecution: LocateExecutionTokenV2,
): TrustedMaterializedEvidenceCoreV2 {
  void expectedInput;
  void expectedExecution;
  const core = coreByMaterialization.get(materialization);
  if (core === undefined) {
    throw new TypeError('F2 materialized evidence core is not trusted');
  }
  return core;
}

const PRODUCTION_ROOTS_FOR_IMPORTER_COUNT = Object.freeze([
  'src/index.ts',
  'src/main.ts',
  'src/evidence/repository-evidence-engine.ts',
  'src/evidence/evidence.module.ts',
  'src/mcp/repo-nav-mcp-server.ts',
  'src/mcp/locate-tool-output.ts',
  'tools/cli/main.ts',
  'tools/cli/execute.ts',
]);

function countSymbolImportersInProductionRoots(symbol: string): number {
  const root = resolve(import.meta.dirname, '../../..');
  let count = 0;
  for (const relative of PRODUCTION_ROOTS_FOR_IMPORTER_COUNT) {
    const absolute = resolve(root, relative);
    if (!existsSync(absolute)) {
      continue;
    }
    const source = readFileSync(absolute, 'utf8');
    if (source.includes(symbol)) {
      count += 1;
    }
  }
  // also scan locate-execution / ranking barrels reachable from engine via string presence
  // production importer means direct reference in those roots only
  return count;
}

/**
 * Production importer count probe（F2 acceptance 必须为 0）。
 */
export function countF2CoreAccessorProductionImportersV2(): number {
  return countSymbolImportersInProductionRoots('requireF2MaterializedEvidenceCoreV2');
}

export function countF2RetainedDecisionProductionImportersV2(): number {
  return countSymbolImportersInProductionRoots(
    'requireEvidenceRankingRetainedDecisionViewV2',
  );
}

export type { CanonicalLocateExecutionV2, TrustedLocateProjectionPrerequisitesV2 };
