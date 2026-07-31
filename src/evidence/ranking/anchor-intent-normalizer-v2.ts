import { Buffer } from 'node:buffer';

import type {
  AnchorKind,
  LocateAnchor,
  NormalizedLocateAnchor,
  TermCaseMode,
} from '../../contracts/request.js';
import { assertRawFileAnchorValueV2 } from '../../contracts/v2/filesystem-input.js';

/**
 * 保留首次 requestIndex 的内部 anchor intent。
 */
export interface NormalizedAnchorIntentV2 {
  readonly requestIndex: number;
  readonly kind: AnchorKind;
  readonly value: string;
  readonly comparisonValue: string;
  readonly caseSensitive: boolean;
  readonly canonicalKey: string;
}

/** F6：file anchor exact preserve；拒绝反斜杠/绝对/逃逸。 */
function normalizeFileAnchorValue(value: string): string {
  assertRawFileAnchorValueV2(value);
  return value;
}

function isCaseSensitive(value: string, mode: TermCaseMode): boolean {
  if (mode === 'sensitive') {
    return true;
  }
  if (mode === 'insensitive') {
    return false;
  }
  return /\p{Lu}/u.test(value);
}

/**
 * 结构编码 key：kind-byte + case-byte + utf8-length + comparisonValue bytes。
 */
export function encodeAnchorComparisonKeyV2(
  kind: AnchorKind,
  caseSensitive: boolean,
  comparisonValue: string,
): string {
  const kindByte = Buffer.from(kind, 'utf8')[0] ?? 0;
  const caseByte = caseSensitive ? 1 : 0;
  const valueBytes = Buffer.from(comparisonValue, 'utf8');
  const length = valueBytes.byteLength;
  return [
    String(kindByte),
    String(caseByte),
    String(length),
    valueBytes.toString('hex'),
  ].join(':');
}

/**
 * 规范化 anchor intents：保留首次索引；insensitive 用 toLocaleLowerCase('und')。
 */
export function normalizeAnchorIntentsV2(
  anchors: readonly LocateAnchor[],
  mode: TermCaseMode = 'smart',
): readonly NormalizedAnchorIntentV2[] {
  const seen = new Set<string>();
  const intents: NormalizedAnchorIntentV2[] = [];
  for (let requestIndex = 0; requestIndex < anchors.length; requestIndex += 1) {
    const anchor = anchors[requestIndex]!;
    const value =
      anchor.kind === 'file'
        ? normalizeFileAnchorValue(anchor.value)
        : anchor.value.normalize('NFKC').trim();
    const caseSensitive =
      anchor.kind === 'file' ? true : isCaseSensitive(value, mode);
    const comparisonValue = caseSensitive
      ? value
      : value.toLocaleLowerCase('und');
    const canonicalKey = encodeAnchorComparisonKeyV2(
      anchor.kind,
      caseSensitive,
      comparisonValue,
    );
    if (seen.has(canonicalKey)) {
      continue;
    }
    seen.add(canonicalKey);
    intents.push(
      Object.freeze({
        requestIndex,
        kind: anchor.kind,
        value,
        comparisonValue,
        caseSensitive,
        canonicalKey,
      }),
    );
  }
  return Object.freeze(intents);
}

/**
 * 现有 normalizeLocateAnchors 的 value projection。
 */
export function projectNormalizedLocateAnchorsV2(
  intents: readonly NormalizedAnchorIntentV2[],
): readonly NormalizedLocateAnchor[] {
  return Object.freeze(
    intents.map((intent) =>
      Object.freeze({
        kind: intent.kind,
        value: intent.value,
        caseSensitive: intent.caseSensitive,
      }),
    ),
  );
}

/**
 * regular terms 仅在 rank view 去重稳定排序（不改 backend/legacy 原序）。
 */
export function rankStableNormalizedTermsV2(
  terms: readonly Readonly<{ value: string; caseSensitive: boolean }>[],
): readonly Readonly<{ value: string; caseSensitive: boolean }>[] {
  const seen = new Set<string>();
  const unique: Array<Readonly<{ value: string; caseSensitive: boolean }>> = [];
  for (const term of terms) {
    const comparison = term.caseSensitive
      ? term.value
      : term.value.toLocaleLowerCase('und');
    const key = `${term.caseSensitive ? '1' : '0'}:${comparison}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(Object.freeze({ ...term }));
  }
  unique.sort((left, right) => {
    const leftCmp = left.caseSensitive
      ? left.value
      : left.value.toLocaleLowerCase('und');
    const rightCmp = right.caseSensitive
      ? right.value
      : right.value.toLocaleLowerCase('und');
    return (
      leftCmp.localeCompare(rightCmp) ||
      Number(left.caseSensitive) - Number(right.caseSensitive)
    );
  });
  return Object.freeze(unique);
}
