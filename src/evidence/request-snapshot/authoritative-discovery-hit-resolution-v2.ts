import type { BackendHit, BackendSearchResult } from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  bindRawDiscoveryLocatorV2,
  type DiscoveryLocatorRefV2,
} from './discovery-lane-universe-v2.js';
import { requireBoundDiscoverySelectionV2 } from './discovery-selection-binding-v2.js';
import type { BoundSafeDiscoverySelectionV2 } from './discovery-selection-binding-v2.js';

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compareBackendHit(left: BackendHit, right: BackendHit): number {
  return (
    compareText(left.file, right.file) ||
    (left.lines?.[0] ?? Number.MAX_SAFE_INTEGER) -
      (right.lines?.[0] ?? Number.MAX_SAFE_INTEGER) ||
    (left.lines?.[1] ?? Number.MAX_SAFE_INTEGER) -
      (right.lines?.[1] ?? Number.MAX_SAFE_INTEGER) ||
    compareText(left.symbol ?? '', right.symbol ?? '') ||
    compareText(left.matchedText ?? '', right.matchedText ?? '') ||
    compareText(left.source, right.source) ||
    compareText(
      left.reasonCodes.join('\u0000'),
      right.reasonCodes.join('\u0000'),
    )
  );
}

/**
 * 将 DiscoveryHitSelectorV2 选中的 locator refs 解析为 exact BackendHit[]（authoritative verify 输入）。
 */
export function resolveExactBackendHitsForDiscoverySelectionV2(input: {
  readonly expandedResults: readonly BackendSearchResult[];
  readonly boundSelection: BoundSafeDiscoverySelectionV2;
  readonly execution: LocateExecutionTokenV2;
}): {
  readonly hits: readonly BackendHit[];
  readonly filesTruncated: boolean;
} {
  const record = requireBoundDiscoverySelectionV2(
    input.boundSelection,
    input.execution,
  );
  const selectedRefs = record.draft.selectedLocatorRefs;
  const selected = new Set<DiscoveryLocatorRefV2>(selectedRefs);
  const byRef = new Map<DiscoveryLocatorRefV2, BackendHit[]>();

  for (const result of input.expandedResults) {
    if (result.health.state !== 'available') {
      continue;
    }
    for (const hit of result.hits) {
      const locatorRef = bindRawDiscoveryLocatorV2(
        {
          source: 'backend',
          backend: hit.source,
          pathFlavor: 'native',
          rawPath: hit.file,
        },
        input.execution,
      );
      if (locatorRef === undefined || !selected.has(locatorRef)) {
        continue;
      }
      const bucket = byRef.get(locatorRef);
      if (bucket === undefined) {
        byRef.set(locatorRef, [hit]);
      } else {
        bucket.push(hit);
      }
    }
  }

  const hits: BackendHit[] = [];
  for (const ref of selectedRefs) {
    const bucket = byRef.get(ref);
    if (bucket === undefined) {
      continue;
    }
    hits.push(...[...bucket].sort(compareBackendHit));
  }

  return Object.freeze({
    hits: Object.freeze(hits),
    filesTruncated: record.draft.filesTruncated,
  });
}
