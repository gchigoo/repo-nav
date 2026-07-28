import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { UnsafeEvidenceDraftV2 } from '../request-snapshot/classified-evidence-record-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { ScopeConfirmationModeV1 } from './repository-scope-policy-v1.js';
import {
  readScopeBoundProducerArbitrationFactsForMaterializerV2,
  type ScopeBoundProducerArbitrationV2,
  type ScopeBoundProducerKindV2,
  type TrustedPreFinalScopeClassificationViewV2,
} from './scope-bound-producer-registrar-v2.js';
import { requirePreFinalScopeDecisionV1 } from './scope-decision-accessors-v1.js';

let draftMapperCalls = 0;

/** 测试探针：合法 none 不得触发 draft mapper。 */
export function readScopeBoundDraftMapperCallCountForTestV2(): number {
  return draftMapperCalls;
}

export function resetScopeBoundDraftMapperCallCountForTestV2(): void {
  draftMapperCalls = 0;
}

function materializeFactsRowV2(
  kind: ScopeBoundProducerKindV2,
  confirmation: ScopeConfirmationModeV1,
  locationFile: string,
  locationLines: readonly [number, number],
  options: {
    readonly definitionRole?: 'definition' | 'execution-site';
    readonly derivedReasonCodes?: readonly (
      | 'ALIAS_SOURCE_NEIGHBOR'
      | 'SAME_ENTITY_SIBLING'
      | 'SAME_SCOPE_SIMILAR_IDENTIFIER'
    )[];
    readonly canonicalSymbol?: string;
    readonly anchoredSymbol?: string;
  },
): UnsafeEvidenceDraftV2 {
  draftMapperCalls += 1;
  const location = Object.freeze({
    file: locationFile,
    lines: Object.freeze([locationLines[0], locationLines[1]] as [number, number]),
    excerpt: '',
    ...(options.canonicalSymbol !== undefined || options.anchoredSymbol !== undefined
      ? { symbol: options.canonicalSymbol ?? options.anchoredSymbol }
      : {}),
  });
  const provenance = Object.freeze({
    discoveredBy: Object.freeze(['ripgrep' as const]),
    verifiedBy: 'filesystem' as const,
    operations: Object.freeze([
      'RIPGREP_SEARCH' as const,
      'FILESYSTEM_READ_RANGE' as const,
    ]),
  });

  const candidateOnly = confirmation === 'candidate-only';

  switch (kind) {
    case 'direct-anchored':
      if (candidateOnly) {
        return Object.freeze({
          evidenceClass: 'candidate' as const,
          role: 'reference' as const,
          location,
          provenance,
          reasonCodes: Object.freeze(['SYMBOL_REFERENCE_ONLY' as const]),
          promotionRequirements: Object.freeze([
            'DIRECT_REFERENCE_REQUIRED' as const,
            'CALL_PATH_REQUIRED' as const,
          ]),
        });
      }
      return Object.freeze({
        evidenceClass: 'confirmed' as const,
        role: 'value-mapping' as const,
        location,
        provenance,
        reasonCodes: Object.freeze([
          'DIRECT_ALIAS_MAPPING' as const,
          'EXACT_TERM_MATCH' as const,
        ]),
      });
    case 'direct-term':
      if (candidateOnly) {
        return Object.freeze({
          evidenceClass: 'candidate' as const,
          role: 'reference' as const,
          location,
          provenance,
          reasonCodes: Object.freeze([
            'EXACT_TERM_WITHOUT_DIRECT_MAPPING' as const,
          ]),
          promotionRequirements: Object.freeze([
            'USER_SEMANTIC_CONFIRMATION' as const,
            'DIRECT_REFERENCE_REQUIRED' as const,
          ]),
        });
      }
      return Object.freeze({
        evidenceClass: 'confirmed' as const,
        role: 'value-mapping' as const,
        location,
        provenance,
        reasonCodes: Object.freeze([
          'DIRECT_ALIAS_MAPPING' as const,
          'EXACT_TERM_MATCH' as const,
        ]),
      });
    case 'anchored-definition':
      if (candidateOnly) {
        return Object.freeze({
          evidenceClass: 'candidate' as const,
          role: 'reference' as const,
          location,
          provenance,
          reasonCodes: Object.freeze(['SYMBOL_REFERENCE_ONLY' as const]),
          promotionRequirements: Object.freeze([
            'DIRECT_REFERENCE_REQUIRED' as const,
            'CALL_PATH_REQUIRED' as const,
          ]),
        });
      }
      return Object.freeze({
        evidenceClass: 'confirmed' as const,
        role: options.definitionRole ?? 'definition',
        location,
        provenance,
        reasonCodes: Object.freeze(['EXACT_SYMBOL_ANCHOR' as const]),
      });
    case 'anchored-reference':
      return Object.freeze({
        evidenceClass: 'candidate' as const,
        role: 'reference' as const,
        location,
        provenance,
        reasonCodes: Object.freeze(['SYMBOL_REFERENCE_ONLY' as const]),
        promotionRequirements: Object.freeze([
          'DIRECT_REFERENCE_REQUIRED' as const,
          'CALL_PATH_REQUIRED' as const,
        ]),
      });
    case 'verified-literal':
      return Object.freeze({
        evidenceClass: 'candidate' as const,
        role: 'reference' as const,
        location,
        provenance,
        reasonCodes: Object.freeze([
          'EXACT_TERM_WITHOUT_DIRECT_MAPPING' as const,
        ]),
        promotionRequirements: Object.freeze([
          'USER_SEMANTIC_CONFIRMATION' as const,
          'DIRECT_REFERENCE_REQUIRED' as const,
        ]),
      });
    case 'secondary':
      return Object.freeze({
        evidenceClass: 'candidate' as const,
        role: 'related' as const,
        location,
        provenance,
        reasonCodes: Object.freeze(['SECONDARY_BACKEND_HIT' as const]),
        promotionRequirements: Object.freeze([
          'DIRECT_REFERENCE_REQUIRED' as const,
        ]),
      });
    case 'derived-neighbor': {
      const reasons = options.derivedReasonCodes ?? [
        'ALIAS_SOURCE_NEIGHBOR' as const,
      ];
      return Object.freeze({
        evidenceClass: 'candidate' as const,
        role: 'related' as const,
        location,
        provenance,
        reasonCodes: Object.freeze([...reasons]),
        promotionRequirements: Object.freeze([
          'USER_SEMANTIC_CONFIRMATION' as const,
          'DIRECT_REFERENCE_REQUIRED' as const,
        ]),
      });
    }
    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      throw new TypeError('unknown producer kind');
    }
  }
}

/**
 * 唯一 arbitration→draft 转换口；none 返回 undefined 且 mapper 调用 0。
 * confirmation 只从 bound pre-final scope decision 读取，禁止 caller override。
 */
export function materializeScopeBoundEvidenceV2(
  arbitration: ScopeBoundProducerArbitrationV2,
  scopeView: TrustedPreFinalScopeClassificationViewV2,
  record: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): UnsafeEvidenceDraftV2 | undefined {
  const decision = requirePreFinalScopeDecisionV1(scopeView, record, execution);
  if (decision.confirmation === 'excluded') {
    throw new TypeError('cannot materialize excluded scope confirmation');
  }
  const privateRecord = readScopeBoundProducerArbitrationFactsForMaterializerV2(
    arbitration,
    record,
    execution,
  );
  if (privateRecord.view.kind === 'none') {
    return undefined;
  }
  if (
    privateRecord.facts === undefined ||
    privateRecord.basisLocationFile === undefined ||
    privateRecord.basisLocationLines === undefined
  ) {
    throw new TypeError('arbitration facts incomplete');
  }
  const anchoredSymbol =
    privateRecord.facts.anchoredSymbol ?? privateRecord.basisSymbol;
  return materializeFactsRowV2(
    privateRecord.facts.producerKind,
    decision.confirmation,
    privateRecord.basisLocationFile,
    privateRecord.basisLocationLines,
    {
      ...(privateRecord.facts.definitionRole !== undefined
        ? { definitionRole: privateRecord.facts.definitionRole }
        : {}),
      ...(privateRecord.facts.derivedReasonCodes !== undefined
        ? { derivedReasonCodes: privateRecord.facts.derivedReasonCodes }
        : {}),
      ...(privateRecord.facts.canonicalSymbol !== undefined
        ? { canonicalSymbol: privateRecord.facts.canonicalSymbol }
        : {}),
      ...(anchoredSymbol !== undefined ? { anchoredSymbol } : {}),
    },
  );
}
