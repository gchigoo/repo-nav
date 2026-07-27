import {
  BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
  EMPTY_SENSITIVE_CORPUS_V2,
  PATH_PLACEHOLDER_V2,
  PUBLIC_FIELD_MAX_BYTES_V2,
  TOKEN_PLACEHOLDER_V2,
  orderedReasons,
  utf8Bytes,
  type PublicFieldKindV2,
  type PublicFieldRedactionV2,
  type RedactionReasonCodeV2,
  type SensitiveCorpusV2,
} from './sensitive-value-contract-v2.js';
import {
  assertAmplificationBoundV2,
  materializeSensitiveSpansV2,
  SpanContractViolationError,
} from './sensitive-span-merge-v2.js';
import {
  assertCorpusProvenanceV2,
  isAuthenticSensitiveCorpusV2,
  matchExactTextCorpusSpansV2,
  matchPathSegmentCorpusHitV2,
} from './sensitive-corpus-v2.js';
import {
  containsOversizedToken,
  containsUnpairedSurrogate,
  detectLocalFileSpansV2,
  detectLocalTextSpansV2,
  hasUnsafeTemplateSecret,
  malformedSecretTail,
} from './sensitive-detectors-v2.js';

function canonicalizeExcerptNewlines(value: string): string {
  return value.replace(/\r\n?/gu, '\n');
}

function redactText(
  value: string,
  field: Exclude<PublicFieldKindV2, 'file'>,
  corpus: SensitiveCorpusV2,
): PublicFieldRedactionV2 {
  if (!isAuthenticSensitiveCorpusV2(corpus)) {
    throw new SpanContractViolationError(
      'SensitiveCorpusV2 must be collector/create sealed.',
    );
  }
  const malformed =
    containsUnpairedSurrogate(value) ||
    malformedSecretTail(value) !== undefined ||
    hasUnsafeTemplateSecret(value);
  const oversized =
    field === 'excerpt'
      ? containsOversizedToken(value)
      : utf8Bytes(value) > PUBLIC_FIELD_MAX_BYTES_V2;
  if (malformed || oversized) {
    const reasons = new Set<RedactionReasonCodeV2>([
      'BINARY_OR_OVERSIZED_CONTENT',
    ]);
    if (
      malformedSecretTail(value) !== undefined ||
      hasUnsafeTemplateSecret(value)
    ) {
      reasons.add('SECRET_LIKE_VALUE');
    }
    return Object.freeze({
      value: BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
      reasonCodes: orderedReasons(reasons),
    });
  }

  const spans = [
    ...detectLocalTextSpansV2(value, field),
    ...matchExactTextCorpusSpansV2(value, corpus),
  ];
  const materialized = materializeSensitiveSpansV2(
    value,
    spans,
    TOKEN_PLACEHOLDER_V2,
  );
  assertAmplificationBoundV2(
    value,
    materialized.value,
    materialized.mergedSpanCount,
  );
  const output =
    field === 'excerpt'
      ? canonicalizeExcerptNewlines(materialized.value)
      : materialized.value;
  return Object.freeze({
    value: output,
    reasonCodes: materialized.reasonCodes,
  });
}

function redactFile(
  value: string,
  corpus: SensitiveCorpusV2,
): PublicFieldRedactionV2 {
  if (!isAuthenticSensitiveCorpusV2(corpus)) {
    throw new SpanContractViolationError(
      'SensitiveCorpusV2 must be collector/create sealed.',
    );
  }
  const reasons = new Set<RedactionReasonCodeV2>();
  if (
    containsUnpairedSurrogate(value) ||
    value
      .split('/')
      .some((segment) => utf8Bytes(segment) > PUBLIC_FIELD_MAX_BYTES_V2)
  ) {
    reasons.add('BINARY_OR_OVERSIZED_CONTENT');
  }
  const localSpans = detectLocalFileSpansV2(value);
  for (const span of localSpans) {
    for (const reason of span.reasonCodes) {
      reasons.add(reason);
    }
  }
  const pathHit = matchPathSegmentCorpusHitV2(value, corpus);
  if (pathHit.hit) {
    for (const reason of pathHit.reasonCodes) {
      reasons.add(reason);
    }
  }
  return Object.freeze({
    value: reasons.size === 0 ? value : PATH_PLACEHOLDER_V2,
    reasonCodes: orderedReasons(reasons),
  });
}

export function isValidRawLocatorV2(value: string): boolean {
  if (
    value.length === 0 ||
    value === '.' ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.startsWith('/') ||
    value.startsWith('//') ||
    /^[A-Za-z]:/u.test(value)
  ) {
    return false;
  }
  const segments = value.split('/');
  return (
    segments.every(
      (segment) =>
        segment.length > 0 && segment !== '.' && segment !== '..',
    ) && segments.join('/') === value
  );
}

export function redactPublicFieldV2(
  value: string,
  field: PublicFieldKindV2,
  corpus: SensitiveCorpusV2 = EMPTY_SENSITIVE_CORPUS_V2,
): PublicFieldRedactionV2 {
  return field === 'file'
    ? redactFile(value, corpus)
    : redactText(value, field, corpus);
}

export function redactPublicFieldForSourceV2(
  source: object,
  value: string,
  field: PublicFieldKindV2,
  corpus: SensitiveCorpusV2,
): PublicFieldRedactionV2 {
  assertCorpusProvenanceV2(source, corpus);
  return redactPublicFieldV2(value, field, corpus);
}
