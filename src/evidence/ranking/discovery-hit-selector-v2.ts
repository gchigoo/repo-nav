import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { NormalizedAnchorIntentV2 } from './anchor-intent-normalizer-v2.js';
import type { TrustedScopeFoldedSelectorViewV2 } from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import {
  bindDiscoverySelectionV2,
  createSafeDiscoverySelectionDraftV2,
  requireSafeDiscoverySelectionDraftV2,
  type BoundSafeDiscoverySelectionV2,
  type SafeDiscoverySelectionDraftV2,
  type SafeDiscoverySelectionFactsV2,
} from '../request-snapshot/discovery-selection-binding-v2.js';

export interface DiscoveryHitSelectionDraftV2 {
  readonly draft: SafeDiscoverySelectionFactsV2;
  readonly authority: SafeDiscoverySelectionDraftV2;
}

export interface DiscoveryHitSelectionV2 {
  readonly bound: BoundSafeDiscoverySelectionV2;
}

/**
 * 读取前 maxFiles reservation：只消费 F3 opaque folded view。
 */
export class DiscoveryHitSelectorV2 {
  /**
   * 唯一入口：先 accessor，再按 safe 等价类原子 reservation。
   */
  public select(
    selectorView: TrustedScopeFoldedSelectorViewV2,
    anchorIntents: readonly NormalizedAnchorIntentV2[],
    maxFiles: number,
    execution: LocateExecutionTokenV2,
  ): DiscoveryHitSelectionDraftV2 {
    const authority = createSafeDiscoverySelectionDraftV2({
      selectorView,
      anchorIntents: anchorIntents.map(({ requestIndex, canonicalKey }) =>
        Object.freeze({ requestIndex, canonicalKey }),
      ),
      maxFiles,
      execution,
    });
    return Object.freeze({
      draft: requireSafeDiscoverySelectionDraftV2(authority, execution),
      authority,
    });
  }

  /**
   * 绑定 ticket/proof（零 I/O）。
   */
  public bind(
    selection: DiscoveryHitSelectionDraftV2,
    execution: LocateExecutionTokenV2,
  ): DiscoveryHitSelectionV2 {
    return Object.freeze({
      bound: bindDiscoverySelectionV2(selection.authority, execution),
    });
  }
}
