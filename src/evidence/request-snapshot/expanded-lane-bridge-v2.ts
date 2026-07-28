import type { BackendHit, BackendSearchResult } from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { redactPublicText } from '../evidence-redactor.js';
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
} from './scope-folded-discovery-selector-v2.js';

/**
 * 临时 current-scope adapter：全部合法 locator 记为 included/allowed。
 * F7 后续替换真实 scope adapter；决策 fan-out API 形状保持不变。
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
  // 复用现网 redactor；safe key 不得携带未脱敏 raw
  return redactPublicText(raw).value;
}

/**
 * 将 expanded lane raw hits 绑定 → public-safe pre-cap → scope fold（固定 800）。
 * fold 截断/排除不得改写调用方持有的 legacy 结果。
 */
export function projectAndScopeFoldExpandedHitsV2(input: {
  readonly expandedResults: readonly BackendSearchResult[];
  readonly execution: LocateExecutionTokenV2;
  readonly layerHint: string;
}): {
  readonly facts: ScopeFoldedSelectorFactsViewV2;
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
    safeInputs.push(
      Object.freeze({
        locatorRef,
        safeFile: toSafePublicFieldV2(hit.file),
        safeSymbol: toSafePublicFieldV2(hit.symbol ?? ''),
        lineStart,
        lineEnd,
        source: hit.source,
      }),
    );
  }

  const preCap = projectExpandedSafePreCapPoolV2(
    safeInputs,
    complete,
    input.execution,
  );
  const decisions = createTemporaryAllowAllScopeDecisionsV2(
    preCap.candidates,
    input.layerHint,
  );
  const foldedView = scopeFoldSafeCandidatePoolV2(
    preCap,
    decisions,
    input.execution,
  );
  const facts = readScopeFoldedSelectorFactsV2(foldedView, input.execution);
  return Object.freeze({
    facts,
    preCapCandidateCount: preCap.candidates.length,
    scopeFoldInvoked: true as const,
  });
}
