import {
  createDiscoveryKey,
  DISCOVERY_REASON_CODES,
  EVIDENCE_OPERATION_CODES,
  EVIDENCE_SOURCE_PRIORITY,
  normalizeEvidenceExcerpt,
  RepositoryAccessError,
  type BackendHit,
  type DiscoveryReasonCode,
  type EvidenceLocation,
  type EvidenceOperationCode,
  type EvidenceSource,
  type NormalizedSearchTerm,
  type RepositoryAccessErrorCode,
  type RepositoryReader,
  type RepositoryReadLimits,
} from '../contracts/index.js';
import type {
  VerifiedDiscoveryObservationCacheV2,
  VerifiedDiscoveryObservationV2,
} from './request-snapshot/verified-record-cache-v2.js';

export interface DiscoveryRecord {
  readonly discoveryKey: string;
  readonly location: EvidenceLocation;
  readonly discoveredBy: readonly EvidenceSource[];
  readonly operations: readonly EvidenceOperationCode[];
  readonly discoveryReasonCodes: readonly DiscoveryReasonCode[];
  readonly matchedTerms: readonly NormalizedSearchTerm[];
  readonly focusLines: readonly [number, number];
  readonly focusExcerpt: string;
  readonly canonicalSymbols: readonly string[];
}

export interface DiscoveryVerificationFailure {
  readonly file: string;
  readonly code: RepositoryAccessErrorCode;
}

export interface DiscoveryMergeResult {
  readonly records: readonly DiscoveryRecord[];
  readonly duplicateLocations: number;
  readonly unverifiedLocations: number;
  readonly failures: readonly DiscoveryVerificationFailure[];
  readonly aborted: boolean;
}

export interface VerifyAndMergeBackendHitsInput {
  readonly repositoryRoot: string;
  readonly hits: readonly BackendHit[];
  readonly terms: readonly NormalizedSearchTerm[];
  readonly reader: RepositoryReader;
  readonly limits: RepositoryReadLimits;
  readonly maxMatchesPerHit: number;
  readonly signal: AbortSignal;
  /** 请求级 observation cache：preverify 与最终 merge 共享同一实例。 */
  readonly observationCache?: VerifiedDiscoveryObservationCacheV2 | undefined;
}

const REASON_PRIORITY = new Map<DiscoveryReasonCode, number>(
  DISCOVERY_REASON_CODES.map((code, index) => [code, index]),
);

const OPERATION_PRIORITY = new Map<EvidenceOperationCode, number>(
  EVIDENCE_OPERATION_CODES.map((code, index) => [code, index]),
);

function compareCanonicalText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function uniqueSorted<T>(
  values: readonly T[],
  compare: (left: T, right: T) => number,
): readonly T[] {
  return Object.freeze(Array.from(new Set(values)).sort(compare));
}

function sourceOperation(source: BackendHit['source']): EvidenceOperationCode {
  return source === 'codegraph' ? 'CODEGRAPH_QUERY' : 'RIPGREP_SEARCH';
}

function containsTerm(excerpt: string, term: NormalizedSearchTerm): boolean {
  return term.caseSensitive
    ? excerpt.includes(term.value)
    : excerpt
        .toLocaleLowerCase('und')
        .includes(term.value.toLocaleLowerCase('und'));
}

function isCurrentLocation(
  location: EvidenceLocation,
  hit: BackendHit,
  terms: readonly NormalizedSearchTerm[],
): boolean {
  if (hit.matchedText !== undefined) {
    return (
      normalizeEvidenceExcerpt(location.excerpt) ===
      normalizeEvidenceExcerpt(hit.matchedText)
    );
  }
  return (
    (hit.symbol !== undefined && location.excerpt.includes(hit.symbol)) ||
    terms.some((term) => containsTerm(location.excerpt, term))
  );
}

function canonicalLocation(location: EvidenceLocation): EvidenceLocation {
  return Object.freeze({
    file: location.file,
    lines: location.lines,
    excerpt: location.excerpt,
  });
}

function createRecord(
  location: EvidenceLocation,
  focusLocation: EvidenceLocation,
  hit: BackendHit,
  filesystemOperations: readonly EvidenceOperationCode[],
  terms: readonly NormalizedSearchTerm[],
): DiscoveryRecord {
  const canonical = canonicalLocation(location);
  const matchedTerms = terms.filter((term) =>
    containsTerm(focusLocation.excerpt, term),
  );
  return Object.freeze({
    discoveryKey: createDiscoveryKey(canonical),
    location: canonical,
    discoveredBy: Object.freeze([hit.source]),
    operations: uniqueSorted(
      [sourceOperation(hit.source), ...filesystemOperations],
      (left, right) =>
        (OPERATION_PRIORITY.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (OPERATION_PRIORITY.get(right) ?? Number.MAX_SAFE_INTEGER),
    ),
    discoveryReasonCodes: uniqueSorted(
      hit.reasonCodes.filter(isDiscoveryReasonCode),
      reasonCompare,
    ),
    matchedTerms: uniqueSorted(matchedTerms, compareTerms),
    focusLines: focusLocation.lines,
    focusExcerpt: focusLocation.excerpt,
    canonicalSymbols: Object.freeze(
      hit.symbol === undefined ? [] : [hit.symbol],
    ),
  });
}

function isDiscoveryReasonCode(
  value: BackendHit['reasonCodes'][number],
): value is DiscoveryReasonCode {
  return (DISCOVERY_REASON_CODES as readonly string[]).includes(value);
}

function reasonCompare(
  left: DiscoveryReasonCode,
  right: DiscoveryReasonCode,
): number {
  return (
    (REASON_PRIORITY.get(left) ?? Number.MAX_SAFE_INTEGER) -
    (REASON_PRIORITY.get(right) ?? Number.MAX_SAFE_INTEGER)
  );
}

function compareTerms(
  left: NormalizedSearchTerm,
  right: NormalizedSearchTerm,
): number {
  return (
    compareCanonicalText(left.value, right.value) ||
    Number(right.caseSensitive) - Number(left.caseSensitive)
  );
}

function mergeRecord(
  current: DiscoveryRecord,
  incoming: DiscoveryRecord,
): DiscoveryRecord {
  return Object.freeze({
    discoveryKey: current.discoveryKey,
    location: current.location,
    discoveredBy: uniqueSorted(
      [...current.discoveredBy, ...incoming.discoveredBy],
      (left, right) =>
        EVIDENCE_SOURCE_PRIORITY[left as EvidenceSource] -
        EVIDENCE_SOURCE_PRIORITY[right as EvidenceSource],
    ),
    operations: uniqueSorted(
      [...current.operations, ...incoming.operations],
      (left, right) =>
        (OPERATION_PRIORITY.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (OPERATION_PRIORITY.get(right) ?? Number.MAX_SAFE_INTEGER),
    ),
    discoveryReasonCodes: uniqueSorted(
      [...current.discoveryReasonCodes, ...incoming.discoveryReasonCodes],
      reasonCompare,
    ),
    matchedTerms: uniqueSorted(
      [...current.matchedTerms, ...incoming.matchedTerms],
      compareTerms,
    ),
    focusLines: current.focusLines,
    focusExcerpt: current.focusExcerpt,
    canonicalSymbols: uniqueSorted(
      [...current.canonicalSymbols, ...incoming.canonicalSymbols],
      compareCanonicalText,
    ),
  });
}

function isFatalRepositoryAccessError(error: RepositoryAccessError): boolean {
  return (
    error.code === 'PATH_OUTSIDE_ROOT' ||
    error.code === 'INVALID_RELATIVE_PATH' ||
    error.code === 'INVALID_REPOSITORY'
  );
}

/**
 * 单 hit filesystem observation；不含 source/reason（merge 时按 hit 重放）。
 */
async function computeVerifiedDiscoveryObservationV2(
  input: VerifyAndMergeBackendHitsInput,
  hit: BackendHit,
): Promise<VerifiedDiscoveryObservationV2> {
  const expandWindow = async (
    focusLocation: EvidenceLocation,
  ): Promise<{
    readonly location: EvidenceLocation;
    readonly aborted: boolean;
    readonly failure?: RepositoryAccessErrorCode;
  }> => {
    const [focusStart, focusEnd] = focusLocation.lines;
    if (focusStart !== focusEnd) {
      return { location: focusLocation, aborted: false };
    }
    const windowStart = Math.max(
      1,
      focusStart - input.limits.maxExcerptLines + 1,
    );
    if (windowStart === focusStart) {
      return { location: focusLocation, aborted: false };
    }
    try {
      const location = await input.reader.readRange(
        input.repositoryRoot,
        focusLocation.file,
        [windowStart, focusEnd],
        input.limits,
        input.signal,
      );
      const focusLines = location.excerpt
        .split('\n')
        .slice(focusStart - windowStart);
      return normalizeEvidenceExcerpt(focusLines.join('\n')) ===
        normalizeEvidenceExcerpt(focusLocation.excerpt)
        ? { location, aborted: false }
        : { location: focusLocation, aborted: false };
    } catch (error: unknown) {
      if (!(error instanceof RepositoryAccessError)) {
        throw error;
      }
      if (isFatalRepositoryAccessError(error)) {
        throw error;
      }
      if (error.code === 'ABORTED') {
        return { location: focusLocation, aborted: true };
      }
      return {
        location: focusLocation,
        aborted: false,
        ...(error.code === 'MAX_EXCERPT_BYTES_REACHED'
          ? { failure: error.code }
          : {}),
      };
    }
  };

  try {
    if (hit.lines !== undefined) {
      const location = await input.reader.readRange(
        input.repositoryRoot,
        hit.file,
        hit.lines,
        input.limits,
        input.signal,
      );
      if (!isCurrentLocation(location, hit, input.terms)) {
        return Object.freeze({ kind: 'unverified' as const });
      }
      const expanded = await expandWindow(location);
      return Object.freeze({
        kind: 'verified' as const,
        focusLocations: Object.freeze([location]),
        expandedLocations: Object.freeze([expanded.location]),
        operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
        failures: Object.freeze(
          expanded.failure === undefined ? [] : [expanded.failure],
        ),
        ...(expanded.aborted ? { aborted: true as const } : {}),
      });
    }

    const locations = await input.reader.findMatches(
      input.repositoryRoot,
      hit.file,
      input.terms,
      hit.symbol,
      input.maxMatchesPerHit,
      input.limits,
      input.signal,
    );
    if (locations.length === 0) {
      return Object.freeze({ kind: 'unverified' as const });
    }
    const focusLocations: EvidenceLocation[] = [];
    const expandedLocations: EvidenceLocation[] = [];
    const failureCodes: RepositoryAccessErrorCode[] = [];
    for (const location of locations) {
      const expanded = await expandWindow(location);
      focusLocations.push(location);
      expandedLocations.push(expanded.location);
      if (expanded.failure !== undefined) {
        failureCodes.push(expanded.failure);
      }
      if (expanded.aborted) {
        return Object.freeze({
          kind: 'verified' as const,
          focusLocations: Object.freeze(focusLocations),
          expandedLocations: Object.freeze(expandedLocations),
          operations: Object.freeze(['FILESYSTEM_FIND_MATCHES' as const]),
          failures: Object.freeze(failureCodes),
          aborted: true,
        });
      }
    }
    return Object.freeze({
      kind: 'verified' as const,
      focusLocations: Object.freeze(focusLocations),
      expandedLocations: Object.freeze(expandedLocations),
      operations: Object.freeze(['FILESYSTEM_FIND_MATCHES' as const]),
      failures: Object.freeze(failureCodes),
    });
  } catch (error: unknown) {
    if (!(error instanceof RepositoryAccessError)) {
      throw error;
    }
    if (isFatalRepositoryAccessError(error)) {
      throw error;
    }
    if (error.code === 'ABORTED') {
      return Object.freeze({ kind: 'aborted' as const });
    }
    return Object.freeze({
      kind: 'verified' as const,
      focusLocations: Object.freeze([]),
      expandedLocations: Object.freeze([]),
      operations: Object.freeze([]),
      failures: Object.freeze([error.code]),
    });
  }
}

export async function verifyAndMergeBackendHits(
  input: VerifyAndMergeBackendHitsInput,
): Promise<DiscoveryMergeResult> {
  const records = new Map<string, DiscoveryRecord>();
  const failures: DiscoveryVerificationFailure[] = [];
  let duplicateLocations = 0;
  let unverifiedLocations = 0;
  let aborted = false;

  if (input.observationCache !== undefined) {
    input.observationCache.assertSameBinding({
      repositoryRoot: input.repositoryRoot,
      terms: input.terms,
      limits: input.limits,
      maxMatches: input.maxMatchesPerHit,
      signal: input.signal,
    });
  }

  const addRecord = (
    location: EvidenceLocation,
    focusLocation: EvidenceLocation,
    hit: BackendHit,
    operations: readonly EvidenceOperationCode[],
  ): void => {
    const incoming = createRecord(
      location,
      focusLocation,
      hit,
      operations,
      input.terms,
    );
    const current = records.get(incoming.discoveryKey);
    if (current === undefined) {
      records.set(incoming.discoveryKey, incoming);
      return;
    }
    duplicateLocations += 1;
    records.set(incoming.discoveryKey, mergeRecord(current, incoming));
  };

  for (const hit of input.hits) {
    const readKey = Object.freeze({
      file: hit.file,
      ...(hit.lines === undefined ? {} : { lines: hit.lines }),
      ...(hit.matchedText === undefined
        ? {}
        : { matchedText: hit.matchedText }),
      ...(hit.symbol === undefined ? {} : { symbol: hit.symbol }),
    });
    const observation =
      input.observationCache === undefined
        ? await computeVerifiedDiscoveryObservationV2(input, hit)
        : await input.observationCache.getOrCompute(readKey, () =>
            computeVerifiedDiscoveryObservationV2(input, hit),
          );

    if (observation.kind === 'aborted') {
      aborted = true;
      break;
    }
    if (observation.kind === 'unverified') {
      unverifiedLocations += 1;
      continue;
    }

    if (
      observation.focusLocations.length === 0 &&
      observation.failures.length > 0
    ) {
      unverifiedLocations += 1;
      for (const code of observation.failures) {
        failures.push(Object.freeze({ file: hit.file, code }));
      }
      continue;
    }

    for (let index = 0; index < observation.focusLocations.length; index += 1) {
      const focusLocation = observation.focusLocations[index]!;
      const expandedLocation = observation.expandedLocations[index]!;
      const operations: readonly EvidenceOperationCode[] =
        hit.lines !== undefined
          ? ['FILESYSTEM_READ_RANGE']
          : expandedLocation === focusLocation
            ? ['FILESYSTEM_FIND_MATCHES']
            : ['FILESYSTEM_READ_RANGE', 'FILESYSTEM_FIND_MATCHES'];
      addRecord(expandedLocation, focusLocation, hit, operations);
    }
    for (const code of observation.failures) {
      failures.push(Object.freeze({ file: hit.file, code }));
    }
    if (observation.aborted === true) {
      aborted = true;
      break;
    }
  }

  return Object.freeze({
    records: Object.freeze(
      Array.from(records.values()).sort((left, right) =>
        compareCanonicalText(left.discoveryKey, right.discoveryKey),
      ),
    ),
    duplicateLocations,
    unverifiedLocations,
    failures: Object.freeze(
      failures.sort(
        (left, right) =>
          compareCanonicalText(left.file, right.file) ||
          compareCanonicalText(left.code, right.code),
      ),
    ),
    aborted,
  });
}
