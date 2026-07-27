import {
  FinalizedUnsafeLocateResultV2Schema,
  LocateResultV2Schema,
  NEXT_ACTION_CODES_V2,
  canonicalizeCoverageV2,
  deriveLocateStatusV2,
  type CandidateEvidenceV2,
  type ConfirmedEvidenceV2,
  type EvidenceLocationV2,
  type FinalizedUnsafeLocateResultV2,
  type LocateResultV2,
  type PublicSearchTermV2,
  type RepoNavToolErrorV2,
} from '../../contracts/v2/locate-result-v2.js';
import {
  collectSensitiveCorpusV2,
  redactPublicFieldForSourceV2,
  type PublicFieldRedactionV2,
  type SensitiveCorpusV2,
} from './sensitive-value-policy-v2.js';

type UnsafeSuccessV2 = Extract<
  FinalizedUnsafeLocateResultV2,
  { readonly ok: true }
>;
type UnsafeConfirmedV2 =
  UnsafeSuccessV2['evidence']['confirmed'][number];
type UnsafeCandidateV2 =
  UnsafeSuccessV2['evidence']['candidates'][number];

function createSafeErrorV2(
  code: RepoNavToolErrorV2['code'],
  suggestedAction?: 'ADD_TERM',
): RepoNavToolErrorV2 {
  switch (code) {
    case 'INVALID_INPUT':
      return {
        code,
        message: 'Locate request does not match the required schema.',
        recoverable: true,
        ...(suggestedAction === undefined
          ? {}
          : { suggestedAction }),
      };
    case 'INVALID_REPOSITORY':
      return {
        code,
        message: 'Repository root is invalid or unavailable.',
        recoverable: true,
      };
    case 'PATH_OUTSIDE_ROOT':
      return {
        code,
        message: 'Repository path is outside the configured root.',
        recoverable: false,
      };
    case 'INTERNAL_ERROR':
      return {
        code,
        message: 'Repository evidence request failed.',
        recoverable: false,
      };
  }
}

function createSafeErrorResultV2(
  code: RepoNavToolErrorV2['code'],
  suggestedAction?: 'ADD_TERM',
): LocateResultV2 {
  return {
    ok: false,
    error: createSafeErrorV2(code, suggestedAction),
  };
}

function fieldMetadata(
  field: 'file' | 'symbol' | 'excerpt',
  redaction: PublicFieldRedactionV2,
):
  | {
      readonly field: 'file' | 'symbol' | 'excerpt';
      readonly reasonCodes: PublicFieldRedactionV2['reasonCodes'];
    }
  | undefined {
  return redaction.reasonCodes.length === 0
    ? undefined
    : {
        field,
        reasonCodes: redaction.reasonCodes,
      };
}

function assembleLocationV2(
  source: object,
  location: UnsafeConfirmedV2['location'],
  corpus: SensitiveCorpusV2,
): EvidenceLocationV2 {
  const file = redactPublicFieldForSourceV2(
    source,
    location.file,
    'file',
    corpus,
  );
  const symbol =
    location.symbol === undefined
      ? undefined
      : redactPublicFieldForSourceV2(
          source,
          location.symbol,
          'symbol',
          corpus,
        );
  const excerpt = redactPublicFieldForSourceV2(
    source,
    location.excerpt,
    'excerpt',
    corpus,
  );
  const fields = [
    fieldMetadata('file', file),
    ...(symbol === undefined ? [] : [fieldMetadata('symbol', symbol)]),
    fieldMetadata('excerpt', excerpt),
  ].filter(
    (
      value,
    ): value is NonNullable<ReturnType<typeof fieldMetadata>> =>
      value !== undefined,
  );

  return {
    file: file.value,
    resolvable: file.reasonCodes.length === 0,
    ...(symbol === undefined ? {} : { symbol: symbol.value }),
    lines: location.lines,
    excerpt: excerpt.value,
    ...(fields.length === 0
      ? {}
      : {
          redaction: {
            applied: true,
            fields,
          },
        }),
  };
}

function publicTermV2(
  source: object,
  term: UnsafeSuccessV2['evidence']['normalizedTerms'][number],
  corpus: SensitiveCorpusV2,
): PublicSearchTermV2 {
  const redaction = redactPublicFieldForSourceV2(
    source,
    term.value,
    'term',
    corpus,
  );
  return {
    value: redaction.value,
    caseSensitive: term.caseSensitive,
    ...(redaction.reasonCodes.length === 0
      ? {}
      : {
          redaction: {
            applied: true,
            reasonCodes: redaction.reasonCodes,
          },
        }),
  };
}

function publicConfirmedV2(
  source: object,
  evidence: UnsafeConfirmedV2,
  ordinal: number,
  corpus: SensitiveCorpusV2,
): ConfirmedEvidenceV2 {
  return {
    evidenceClass: 'confirmed',
    id: `evidence:v2:${String(ordinal).padStart(4, '0')}`,
    role: evidence.role,
    location: assembleLocationV2(source, evidence.location, corpus),
    provenance: {
      discoveredBy: evidence.provenance.discoveredBy,
      verifiedBy: 'filesystem',
      operations: evidence.provenance.operations,
    },
    reasonCodes: evidence.reasonCodes,
  };
}

function publicCandidateV2(
  source: object,
  evidence: UnsafeCandidateV2,
  ordinal: number,
  corpus: SensitiveCorpusV2,
): CandidateEvidenceV2 {
  return {
    evidenceClass: 'candidate',
    id: `evidence:v2:${String(ordinal).padStart(4, '0')}`,
    role: evidence.role,
    location: assembleLocationV2(source, evidence.location, corpus),
    provenance: {
      discoveredBy: evidence.provenance.discoveredBy,
      verifiedBy: 'filesystem',
      operations: evidence.provenance.operations,
    },
    reasonCodes: evidence.reasonCodes,
    promotionRequirements: evidence.promotionRequirements,
  };
}

function canonicalNextActions(
  values: UnsafeSuccessV2['evidence']['nextActions'],
): UnsafeSuccessV2['evidence']['nextActions'] {
  const present = new Set(values);
  return NEXT_ACTION_CODES_V2.filter((value) => present.has(value));
}

function assembleSuccessV2(input: UnsafeSuccessV2): LocateResultV2 {
  const corpus = collectSensitiveCorpusV2(input);
  const normalizedTerms = input.evidence.normalizedTerms.map((term) =>
    publicTermV2(input, term, corpus),
  );
  const confirmed = input.evidence.confirmed.map((evidence, index) =>
    publicConfirmedV2(input, evidence, index + 1, corpus),
  );
  const candidates = input.evidence.candidates.map((evidence, index) =>
    publicCandidateV2(
      input,
      evidence,
      confirmed.length + index + 1,
      corpus,
    ),
  );
  const locationRedacted = [...confirmed, ...candidates].some(
    (evidence) => !evidence.location.resolvable,
  );
  const coverage = canonicalizeCoverageV2(
    input.evidence.coverage,
    locationRedacted,
  );
  const status = deriveLocateStatusV2(
    coverage,
    confirmed.length + candidates.length,
  );
  return LocateResultV2Schema.parse({
    ok: true,
    evidence: {
      schemaVersion: '2.0',
      status,
      repositoryRef: 'local-repository',
      normalizedTerms,
      confirmed,
      candidates,
      coverage,
      nextActions: canonicalNextActions(input.evidence.nextActions),
    },
  });
}

export function assemblePublicLocateResultV2(
  input: FinalizedUnsafeLocateResultV2,
): LocateResultV2 {
  try {
    const parsed = FinalizedUnsafeLocateResultV2Schema.safeParse(input);
    if (!parsed.success) {
      return createSafeErrorResultV2('INTERNAL_ERROR');
    }
    if (!parsed.data.ok) {
      return LocateResultV2Schema.parse(
        createSafeErrorResultV2(
          parsed.data.error.code,
          parsed.data.error.suggestedAction,
        ),
      );
    }
    return assembleSuccessV2(parsed.data);
  } catch {
    return createSafeErrorResultV2('INTERNAL_ERROR');
  }
}
