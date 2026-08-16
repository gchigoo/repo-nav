/**
 * F8 language port：child admission + resolver + always-signed source registration。
 */

import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { UnsafeEvidenceDraftV2 } from '../request-snapshot/classified-evidence-record-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { TrustedPreFinalScopeClassificationViewV2 } from '../request-snapshot/scope-classification-views-v2.js';
import {
  issueScopeBoundProducerChildPortAdmissionV2,
  registerScopeBoundProducerChildPortV2,
  registerScopeBoundProducerSourceV2,
  requireScopeBoundProducerArbitrationV2,
  type RegisteredScopeBoundProducerPortV2,
  type ScopeBoundProducerArbitrationV2,
  type ScopeBoundProducerChildPortAdmissionV2,
  type ScopeBoundProducerChildResolverV2,
  type ScopeBoundProducerPortResolutionV2,
  type ScopeBoundProducerRegistrarV2,
  type ScopeBoundProducerSourceReceiptV2,
} from '../scope/scope-bound-producer-registrar-v2.js';
import { materializeScopeBoundEvidenceV2 } from '../scope/scope-bound-evidence-materializer-v2.js';
import { createGoLanguageAdapterV2 } from './go-language-adapter-v2.js';
import { createJavascriptLanguageAdapterV2 } from './javascript-language-adapter-v2.js';
import { createPythonLanguageAdapterV2 } from './python-language-adapter-v2.js';
import { createSqlLanguageAdapterV2 } from './sql-language-adapter-v2.js';
import { createTypescriptLanguageAdapterV2 } from './typescript-language-adapter-v2.js';
import {
  dispatchFallbackLanguageResultV2,
  materializeFallbackLiteralCandidateV2,
} from './fallback-language-policy-v2.js';
import {
  isLanguageAdapterSourceRefV2,
  requireLanguageAdapterSourcePrivateV2,
  signLanguageAdapterSourceRefV2,
  type LanguageAdapterProducerResultV2,
} from './language-adapter-producer-v2.js';
import {
  createLanguageLexicalPreparationRefV2,
  prepareLanguageClassificationInputV2,
  requireFallbackLanguageClassificationInputV2,
  requireSemanticLanguageClassificationInputV2,
  type VerifiedFallbackLanguageClassificationInputV2,
  type VerifiedSemanticLanguageClassificationInputV2,
} from './language-lexical-coordinator-v2.js';
import {
  readLanguageAdapterDecisionV2,
  type TrustedLanguageCapabilityObservationV2,
} from './language-capability-observation-v2.js';

export function createLanguageAdapterScopeProducerResolverV2(
  observation: TrustedLanguageCapabilityObservationV2,
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerChildResolverV2 {
  return Object.freeze({
    owner: 'language-adapter' as const,
    resolve(
      source: unknown,
      record: EligibleDiscoveryRefV2,
      exec: LocateExecutionTokenV2,
    ): ScopeBoundProducerPortResolutionV2 {
      if (exec !== execution) {
        throw new TypeError('language resolver execution mismatch');
      }
      if (!isLanguageAdapterSourceRefV2(source)) {
        throw new TypeError('forged language source');
      }
      const privateSource = requireLanguageAdapterSourcePrivateV2(source, exec);
      if (privateSource.eligibleRef !== record) {
        throw new TypeError('language source record mismatch');
      }
      const decision = readLanguageAdapterDecisionV2(observation, record, exec);
      void decision;
      if (
        privateSource.producerKind === 'none' ||
        privateSource.lane === 'fallback'
      ) {
        return Object.freeze({ kind: 'none' as const });
      }
      return Object.freeze({
        kind: 'facts' as const,
        view: Object.freeze({
          owner: 'language-adapter' as const,
          producerKind: privateSource.producerKind,
          producerBasis: privateSource.producerBasis,
          ...(privateSource.definitionRole === undefined
            ? {}
            : { definitionRole: privateSource.definitionRole }),
          matchedTermPresent: privateSource.matchedTermPresent,
          ...(privateSource.canonicalSymbol === undefined
            ? {}
            : {
                anchoredSymbol: privateSource.canonicalSymbol,
                canonicalSymbol: privateSource.canonicalSymbol,
              }),
        }),
      });
    },
  });
}

export function registerLanguageAdapterScopeProducerPortV2(
  registrar: ScopeBoundProducerRegistrarV2,
  admission: ScopeBoundProducerChildPortAdmissionV2,
  resolver: ScopeBoundProducerChildResolverV2,
  execution: LocateExecutionTokenV2,
): RegisteredScopeBoundProducerPortV2 {
  return registerScopeBoundProducerChildPortV2(
    registrar,
    admission,
    resolver,
    execution,
  );
}

export function issueLanguageAdapterPortAdmissionV2(
  registrar: ScopeBoundProducerRegistrarV2,
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerChildPortAdmissionV2 {
  return issueScopeBoundProducerChildPortAdmissionV2(
    registrar,
    'language-adapter',
    execution,
  );
}

export async function dispatchLanguageEvidenceV2(
  input:
    | VerifiedSemanticLanguageClassificationInputV2
    | VerifiedFallbackLanguageClassificationInputV2,
  observation: TrustedLanguageCapabilityObservationV2,
  execution: LocateExecutionTokenV2,
): Promise<LanguageAdapterProducerResultV2> {
  // fallback input 无 semantic brand
  try {
    requireFallbackLanguageClassificationInputV2(
      input as VerifiedFallbackLanguageClassificationInputV2,
    );
    return dispatchFallbackLanguageResultV2(
      input as VerifiedFallbackLanguageClassificationInputV2,
    );
  } catch {
    // semantic
  }
  const semantic = requireSemanticLanguageClassificationInputV2(
    input as VerifiedSemanticLanguageClassificationInputV2,
  );
  if (
    semantic.observation !== observation ||
    semantic.execution !== execution
  ) {
    throw new TypeError('language dispatch observation/execution mismatch');
  }
  const decision = readLanguageAdapterDecisionV2(
    observation,
    semantic.eligibleRef,
    execution,
  );
  if (decision.adapter === 'typescript') {
    return Object.freeze({
      kind: 'supported-source',
      ...createTypescriptLanguageAdapterV2().classifySemantic(
        input as VerifiedSemanticLanguageClassificationInputV2,
      ),
    });
  }
  if (decision.adapter === 'javascript') {
    return Object.freeze({
      kind: 'supported-source',
      ...createJavascriptLanguageAdapterV2().classifySemantic(
        input as VerifiedSemanticLanguageClassificationInputV2,
      ),
    });
  }
  if (decision.adapter === 'sql') {
    return Object.freeze({
      kind: 'supported-source',
      ...createSqlLanguageAdapterV2().classifySemantic(
        input as VerifiedSemanticLanguageClassificationInputV2,
      ),
    });
  }
  if (decision.adapter === 'python') {
    return Object.freeze({
      kind: 'supported-source',
      ...createPythonLanguageAdapterV2().classifySemantic(
        input as VerifiedSemanticLanguageClassificationInputV2,
      ),
    });
  }
  if (decision.adapter === 'go') {
    return Object.freeze({
      kind: 'supported-source',
      ...createGoLanguageAdapterV2().classifySemantic(
        input as VerifiedSemanticLanguageClassificationInputV2,
      ),
    });
  }
  throw new TypeError('semantic dispatch reached fallback adapter');
}

/**
 * 对 observation 内每条 record 准备并 dispatch，总是签 source。
 */
export async function classifyLanguageCapabilityRecordV2(
  observation: TrustedLanguageCapabilityObservationV2,
  eligibleRef: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): Promise<LanguageAdapterProducerResultV2> {
  const decision = readLanguageAdapterDecisionV2(
    observation,
    eligibleRef,
    execution,
  );
  if (decision.adapter === 'fallback') {
    const input = await prepareLanguageClassificationInputV2(
      observation,
      eligibleRef,
      { kind: 'fallback' },
      execution,
    );
    return dispatchLanguageEvidenceV2(input, observation, execution);
  }
  const preparationRef = createLanguageLexicalPreparationRefV2(
    observation,
    eligibleRef,
    execution,
  );
  const input = await prepareLanguageClassificationInputV2(
    observation,
    eligibleRef,
    { kind: 'semantic', preparationRef },
    execution,
  );
  return dispatchLanguageEvidenceV2(input, observation, execution);
}

export function registerLanguageAdapterProducerSourceV2(
  result: LanguageAdapterProducerResultV2,
  registrar: ScopeBoundProducerRegistrarV2,
  registeredLanguagePort: RegisteredScopeBoundProducerPortV2,
  scopeView: TrustedPreFinalScopeClassificationViewV2,
  record: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerSourceReceiptV2 {
  return registerScopeBoundProducerSourceV2(
    registrar,
    result.sourceRef,
    registeredLanguagePort,
    scopeView,
    record,
    execution,
  );
}

/**
 * F8 唯一 0/1 draft composition：facts→F7 materializer；none+fallback-literal→F8 factory。
 */
export function materializeLanguageCapabilityRecordV2(
  result: LanguageAdapterProducerResultV2,
  arbitration: ScopeBoundProducerArbitrationV2,
  scopeView: TrustedPreFinalScopeClassificationViewV2,
  record: EligibleDiscoveryRefV2,
  observation: TrustedLanguageCapabilityObservationV2,
  execution: LocateExecutionTokenV2,
): UnsafeEvidenceDraftV2 | undefined {
  const view = requireScopeBoundProducerArbitrationV2(
    arbitration,
    scopeView,
    record,
    execution,
  );
  if (view.kind === 'facts') {
    return materializeScopeBoundEvidenceV2(
      arbitration,
      scopeView,
      record,
      execution,
    );
  }
  if (result.kind === 'fallback-literal') {
    return materializeFallbackLiteralCandidateV2(
      result.facts,
      arbitration,
      scopeView,
      record,
      observation,
      execution,
    );
  }
  // supported none / fallback-none → undefined draft，但仍已走 language port
  void signLanguageAdapterSourceRefV2;
  return undefined;
}
