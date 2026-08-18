import type {
  BackendSearchRequest,
  NormalizedLocateAnchor,
  NormalizedSearchTerm,
} from '../contracts/index.js';

export interface CodeGraphQueryPlanEntry {
  readonly value: string;
  readonly caseSensitive: boolean;
  readonly source: 'symbol-anchor' | 'term';
}

export interface CodeGraphQueryPlan {
  readonly entries: readonly CodeGraphQueryPlanEntry[];
  readonly unsupportedDimensions: readonly string[];
  readonly canSkipFallbackIfVerified: boolean;
}

const IDENTIFIER =
  /^(?:[$_]|\p{ID_Start})(?:[$_\u200C\u200D]|\p{ID_Continue})*$/u;

function comparisonKey(value: string, caseSensitive: boolean): string {
  return `${caseSensitive ? '1' : '0'}\u0000${
    caseSensitive ? value : value.toLocaleLowerCase('und')
  }`;
}

function exactEquivalent(
  term: NormalizedSearchTerm,
  anchor: NormalizedLocateAnchor,
): boolean {
  if (!term.caseSensitive || !anchor.caseSensitive) {
    return false;
  }
  return term.value === anchor.value;
}

export function createCodeGraphQueryPlan(
  request: BackendSearchRequest,
): CodeGraphQueryPlan {
  const entries: CodeGraphQueryPlanEntry[] = [];
  const unsupportedDimensions: string[] = [];
  const seen = new Set<string>();
  const symbolAnchors = request.anchors.filter(
    (anchor) => anchor.kind === 'symbol',
  );

  const addEntry = (entry: CodeGraphQueryPlanEntry): void => {
    const key = comparisonKey(entry.value, entry.caseSensitive);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    entries.push(Object.freeze(entry));
    if (!entry.caseSensitive) {
      unsupportedDimensions.push('case-insensitive-search');
    }
  };

  for (const anchor of symbolAnchors) {
    addEntry({
      value: anchor.value,
      caseSensitive: anchor.caseSensitive,
      source: 'symbol-anchor',
    });
  }

  for (const anchor of request.anchors) {
    if (anchor.kind !== 'symbol') {
      unsupportedDimensions.push(`anchor:${anchor.kind}`);
    }
  }
  if (request.negativeTerms.length > 0) {
    unsupportedDimensions.push('negative-terms');
  }
  if (request.layers.length > 0) {
    unsupportedDimensions.push('layer-filter');
  }

  for (const term of request.terms) {
    if (!IDENTIFIER.test(term.value)) {
      unsupportedDimensions.push('non-identifier-term');
      continue;
    }
    addEntry({
      value: term.value,
      caseSensitive: term.caseSensitive,
      source: 'term',
    });
  }

  const unsupported = Object.freeze(Array.from(new Set(unsupportedDimensions)));
  const onlySymbolAnchors = request.anchors.every(
    (anchor) => anchor.kind === 'symbol',
  );
  const termsMatchAnchors = request.terms.every((term) =>
    symbolAnchors.some((anchor) => exactEquivalent(term, anchor)),
  );
  const singleExactIdentifierTerm =
    request.anchors.length === 0 &&
    request.terms.length === 1 &&
    entries.length === 1 &&
    entries[0]?.source === 'term';

  return Object.freeze({
    entries: Object.freeze(entries),
    unsupportedDimensions: unsupported,
    canSkipFallbackIfVerified:
      unsupported.length === 0 &&
      ((symbolAnchors.length === 1 && onlySymbolAnchors && termsMatchAnchors) ||
        singleExactIdentifierTerm),
  });
}
