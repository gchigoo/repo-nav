import {
  CORPUS_ENTRY_BYTES_MIN_V2,
  PATH_PLACEHOLDER_V2,
  TOKEN_PLACEHOLDER_V2,
  utf8Bytes,
  type PublicSafeRankingKeyV2,
} from './sensitive-value-contract-v2.js';
import {
  detectLocalFileSpansV2,
  detectLocalTextSpansV2,
} from './sensitive-detectors-v2.js';

function projectFileKey(file: string): string {
  if (detectLocalFileSpansV2(file).length > 0) {
    return PATH_PLACEHOLDER_V2;
  }
  const segments = file.split('/');
  if (segments.some((segment) => utf8Bytes(segment) >= CORPUS_ENTRY_BYTES_MIN_V2)) {
    return PATH_PLACEHOLDER_V2;
  }
  return file;
}

function projectSymbolKey(symbol: string): string {
  if (symbol.length === 0) {
    return symbol;
  }
  if (detectLocalTextSpansV2(symbol, 'symbol').length > 0) {
    return TOKEN_PLACEHOLDER_V2;
  }
  if (utf8Bytes(symbol) >= CORPUS_ENTRY_BYTES_MIN_V2) {
    return TOKEN_PLACEHOLDER_V2;
  }
  return symbol;
}

export function projectPublicSafeRankingKeyV2(
  input: Readonly<{
    readonly file: string;
    readonly symbol?: string;
  }>,
): PublicSafeRankingKeyV2 {
  return Object.freeze({
    file: projectFileKey(input.file),
    symbol: projectSymbolKey(input.symbol ?? ''),
  });
}
