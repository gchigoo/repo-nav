import type {
  BackendSearchResult,
  LocateAnchor,
  RepoLayer,
  TermCaseMode,
} from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { DiscoveryHitSelectorV2 } from '../ranking/discovery-hit-selector-v2.js';
import { normalizeAnchorIntentsV2 } from '../ranking/anchor-intent-normalizer-v2.js';
import {
  projectAndScopeFoldExpandedHitsV2,
  resolveExactBackendHitsForDiscoverySelectionV2,
  type BoundSafeDiscoverySelectionV2,
  type TrustedScopeEligibilityObservationV2,
  type TrustedScopeFoldedSelectorViewV2,
} from '../request-snapshot/index.js';
import type { BackendHit } from '../../contracts/index.js';

export interface AuthoritativeExpandedSelectionPhaseResultV2 {
  readonly foldedView: TrustedScopeFoldedSelectorViewV2;
  readonly observation: TrustedScopeEligibilityObservationV2;
  readonly boundSelection: BoundSafeDiscoverySelectionV2;
  readonly hits: readonly BackendHit[];
  readonly filesTruncated: boolean;
  readonly scopeFoldInvoked: true;
  readonly scopeFoldCandidateCount: number;
  readonly scopeFoldFilesTruncated: boolean;
}

/**
 * Expanded fold + DiscoveryHitSelectorV2 → exact BackendHit[]（唯一 authoritative verify 输入）。
 */
export function runAuthoritativeExpandedSelectionPhaseV2(input: {
  readonly expandedResults: readonly BackendSearchResult[];
  readonly anchors: readonly LocateAnchor[];
  readonly termCase: TermCaseMode;
  readonly maxFiles: number;
  readonly layers: readonly RepoLayer[] | undefined;
  readonly execution: LocateExecutionTokenV2;
}): AuthoritativeExpandedSelectionPhaseResultV2 {
  const rankingIntents = normalizeAnchorIntentsV2(
    input.anchors,
    input.termCase,
  );
  const expandedFold = projectAndScopeFoldExpandedHitsV2({
    expandedResults: input.expandedResults,
    execution: input.execution,
    layerHint: input.layers?.[0] ?? 'server',
    ...(input.layers === undefined ? {} : { requestedLayers: input.layers }),
    resolveMatchedAnchorKeys: (safeFile, safeSymbol) => {
      const keys: string[] = [];
      const fileCmp = safeFile.toLocaleLowerCase('und');
      const symbolCmp = safeSymbol.toLocaleLowerCase('und');
      for (const intent of rankingIntents) {
        const value = intent.caseSensitive
          ? intent.value
          : intent.comparisonValue;
        if (intent.kind === 'file') {
          const target = intent.caseSensitive ? safeFile : fileCmp;
          if (target === value) {
            keys.push(intent.canonicalKey);
          }
        } else if (
          intent.kind === 'symbol' &&
          safeSymbol.length > 0 &&
          (intent.caseSensitive ? safeSymbol : symbolCmp) === value
        ) {
          keys.push(intent.canonicalKey);
        }
      }
      return Object.freeze(keys);
    },
  });
  const discoverySelectionDraft = new DiscoveryHitSelectorV2().select(
    expandedFold.foldedView,
    rankingIntents,
    input.maxFiles,
    input.execution,
  );
  const boundSelection = new DiscoveryHitSelectorV2().bind(
    discoverySelectionDraft,
    input.execution,
  ).bound;
  const authoritative = resolveExactBackendHitsForDiscoverySelectionV2({
    expandedResults: input.expandedResults,
    boundSelection,
    execution: input.execution,
  });
  return Object.freeze({
    foldedView: expandedFold.foldedView,
    observation: expandedFold.observation,
    boundSelection,
    hits: authoritative.hits,
    filesTruncated: authoritative.filesTruncated,
    scopeFoldInvoked: true as const,
    scopeFoldCandidateCount: expandedFold.facts.candidates.length,
    scopeFoldFilesTruncated: expandedFold.facts.filesTruncated,
  });
}
