import type { BackendHit, BackendSearchResult, RepoLayer } from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { redactPublicText } from '../evidence-redactor.js';
import {
  createRepositoryScopePolicyV1,
  resolveRepositoryScopeV1,
} from '../scope/index.js';
import {
  bindRawDiscoveryLocatorV2,
  projectExpandedSafePreCapPoolV2,
  type ExpandedSafeCandidateInputV2,
  type PublicSafeExpandedCandidateV2,
} from './discovery-lane-universe-v2.js';
import {
  readScopeFoldedSelectorFactsV2,
  scopeFoldSafeCandidatePoolV2,
  type ScopeFoldCandidateDecisionV2,
  type ScopeFoldedSelectorFactsViewV2,
  type TrustedScopeFoldedSelectorViewV2,
} from './scope-folded-discovery-selector-v2.js';
import {
  createTrustedRepositoryScopePolicyAdapterV1,
  observeTrustedScopeEligibilityV2,
} from './trusted-scope-policy-adapter-v2.js';

/**
 * 临时 current-scope adapter：全部合法 locator 记为 included/allowed。
 * 保留给既有 F3 fold unit；production 走 trusted observation。
 */
export function createTemporaryAllowAllScopeDecisionsV2(
  candidates: readonly PublicSafeExpandedCandidateV2[],
  layer: string,
): readonly ScopeFoldCandidateDecisionV2[] {
  return Object.freeze(
    candidates.map((candidate) =>
      Object.freeze({
        locatorRef: candidate.locatorRef,
        decision: Object.freeze({
          layer,
          included: true,
          confirmation: 'allowed' as const,
        }),
      }),
    ),
  );
}

function toSafePublicFieldV2(raw: string): string {
  return redactPublicText(raw).value;
}

/**
 * 将 expanded lane raw hits 绑定 → public-safe pre-cap → F7 scope observation → fold（固定 800）。
 */
export function projectAndScopeFoldExpandedHitsV2(input: {
  readonly expandedResults: readonly BackendSearchResult[];
  readonly execution: LocateExecutionTokenV2;
  readonly layerHint: string;
  readonly requestedLayers?: readonly RepoLayer[];
  readonly resolveMatchedAnchorKeys?: (
    safeFile: string,
    safeSymbol: string,
  ) => readonly string[];
}): {
  readonly foldedView: TrustedScopeFoldedSelectorViewV2;
  readonly facts: ScopeFoldedSelectorFactsViewV2;
  readonly observation: ReturnType<typeof observeTrustedScopeEligibilityV2>;
  readonly resolvedScope: ReturnType<typeof resolveRepositoryScopeV1>;
  readonly preCapCandidateCount: number;
  readonly scopeFoldInvoked: true;
} {
  const rawHits: BackendHit[] = [];
  let complete = true;
  for (const result of input.expandedResults) {
    if (result.health.state !== 'available') {
      complete = false;
      continue;
    }
    complete = complete && result.complete;
    for (const hit of result.hits) {
      rawHits.push(hit);
    }
  }

  const safeInputs: ExpandedSafeCandidateInputV2[] = [];
  for (const hit of rawHits) {
    const locatorRef = bindRawDiscoveryLocatorV2(
      {
        source: 'backend',
        backend: hit.source,
        pathFlavor: 'native',
        rawPath: hit.file,
      },
      input.execution,
    );
    if (locatorRef === undefined) {
      continue;
    }
    const [lineStart, lineEnd] = hit.lines ?? [1, 1];
    const safeFile = toSafePublicFieldV2(hit.file);
    const safeSymbol = toSafePublicFieldV2(hit.symbol ?? '');
    const matchedAnchorKeys =
      input.resolveMatchedAnchorKeys?.(safeFile, safeSymbol) ?? [];
    safeInputs.push(
      Object.freeze({
        locatorRef,
        safeFile,
        safeSymbol,
        lineStart,
        lineEnd,
        source: hit.source,
        matchedAnchorKeys: Object.freeze([...matchedAnchorKeys]),
      }),
    );
  }

  const preCap = projectExpandedSafePreCapPoolV2(
    safeInputs,
    complete,
    input.execution,
  );
  const resolvedScope = resolveRepositoryScopeV1(input.requestedLayers);
  const adapter = createTrustedRepositoryScopePolicyAdapterV1(
    createRepositoryScopePolicyV1(),
    input.execution,
  );
  const observation = observeTrustedScopeEligibilityV2({
    adapter,
    preCapPool: preCap,
    resolvedScope,
    execution: input.execution,
  });
  const foldedView = scopeFoldSafeCandidatePoolV2(
    preCap,
    observation,
    input.execution,
  );
  const facts = readScopeFoldedSelectorFactsV2(foldedView, input.execution);
  return Object.freeze({
    foldedView,
    facts,
    observation,
    resolvedScope,
    preCapCandidateCount: preCap.candidates.length,
    scopeFoldInvoked: true as const,
  });
}
