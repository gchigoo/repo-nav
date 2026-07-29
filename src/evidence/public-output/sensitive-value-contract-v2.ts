export const PUBLIC_FIELD_MAX_BYTES_V2 = 2 * 1024;
export const TOKEN_PLACEHOLDER_V2 = '[REDACTED]';
export const PATH_PLACEHOLDER_V2 = '[REDACTED_PATH]';
export const BINARY_OR_OVERSIZED_PLACEHOLDER_V2 =
  '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]';

export const CORPUS_ENTRY_BYTES_MIN_V2 = 8;
export const CORPUS_ENTRY_BYTES_MAX_V2 = 512;

export const REDACTION_REASON_CODES_V2 = Object.freeze([
  'SECRET_LIKE_VALUE',
  'CONNECTION_STRING',
  'PERSONAL_DATA',
  'BINARY_OR_OVERSIZED_CONTENT',
  'UNTRUSTED_CONTROL_CHARACTERS',
] as const);

export const LOW_INFORMATION_LITERALS_V2 = Object.freeze(
  new Set([
    'true',
    'false',
    'null',
    'undefined',
    'none',
    'nil',
    'yes',
    'no',
    'on',
    'off',
    'n/a',
    'na',
    'unknown',
    'default',
    'test',
    'example',
    'sample',
    'dummy',
    'changeme',
    'redacted',
    '[redacted]',
    '[redacted_path]',
  ]),
);

export type RedactionReasonCodeV2 = (typeof REDACTION_REASON_CODES_V2)[number];
export type PublicFieldKindV2 = 'term' | 'file' | 'symbol' | 'excerpt';
export type CorpusPropagationModeV2 = 'exact-text' | 'path-segment';

export type CorpusPropagationReasonCodeV2 = Extract<
  RedactionReasonCodeV2,
  'SECRET_LIKE_VALUE' | 'CONNECTION_STRING' | 'PERSONAL_DATA'
>;

export interface SensitiveSpanV2 {
  readonly start: number;
  readonly end: number;
  readonly reasonCodes: readonly [
    RedactionReasonCodeV2,
    ...RedactionReasonCodeV2[],
  ];
}

export interface SensitiveCorpusEntryV2 {
  readonly value: string;
  readonly reasonCodes: readonly [
    CorpusPropagationReasonCodeV2,
    ...CorpusPropagationReasonCodeV2[],
  ];
  readonly propagation: CorpusPropagationModeV2;
}

export interface SensitiveCorpusV2 {
  readonly entries: readonly SensitiveCorpusEntryV2[];
  readonly totalUtf8Bytes: number;
}

export interface PublicFieldRedactionV2 {
  readonly value: string;
  readonly reasonCodes: readonly RedactionReasonCodeV2[];
}

export interface PublicSafeRankingKeyV2 {
  readonly file: string;
  readonly symbol: string;
}

export const EMPTY_SENSITIVE_CORPUS_V2: SensitiveCorpusV2 = Object.freeze({
  entries: Object.freeze([] as SensitiveCorpusEntryV2[]),
  totalUtf8Bytes: 0,
});

export function orderedReasons(
  values: ReadonlySet<RedactionReasonCodeV2>,
): readonly RedactionReasonCodeV2[] {
  return Object.freeze(
    REDACTION_REASON_CODES_V2.filter((reason) => values.has(reason)),
  );
}

export function orderedPropagationReasons(
  values: ReadonlySet<CorpusPropagationReasonCodeV2>,
): readonly [
  CorpusPropagationReasonCodeV2,
  ...CorpusPropagationReasonCodeV2[],
] {
  const ordered = REDACTION_REASON_CODES_V2.filter(
    (reason): reason is CorpusPropagationReasonCodeV2 =>
      (reason === 'SECRET_LIKE_VALUE' ||
        reason === 'CONNECTION_STRING' ||
        reason === 'PERSONAL_DATA') &&
      values.has(reason),
  );
  if (ordered.length === 0) {
    throw new Error('CorpusPropagationReasonCodeV2 set must be non-empty.');
  }
  return Object.freeze(ordered) as readonly [
    CorpusPropagationReasonCodeV2,
    ...CorpusPropagationReasonCodeV2[],
  ];
}

export function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}
