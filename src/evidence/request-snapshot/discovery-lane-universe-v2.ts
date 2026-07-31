import { posix } from 'node:path';

import type { SearchBackendId } from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';

declare const DISCOVERY_LOCATOR_REF_V2: unique symbol;
export type DiscoveryLocatorRefV2 = Readonly<object> & {
  readonly [DISCOVERY_LOCATOR_REF_V2]: never;
};

declare const EXPANDED_HIT_REF_V2: unique symbol;
export type ExpandedHitRefV2 = Readonly<object> & {
  readonly [EXPANDED_HIT_REF_V2]: never;
};

declare const MERGED_DISCOVERY_IDENTITY_REF_V2: unique symbol;
export type MergedDiscoveryIdentityRefV2 = Readonly<object> & {
  readonly [MERGED_DISCOVERY_IDENTITY_REF_V2]: never;
};

export type RawDiscoveryLocatorInputV2 =
  | Readonly<{
      source: 'backend';
      backend: SearchBackendId;
      pathFlavor: 'native';
      rawPath: string;
    }>
  | Readonly<{
      source: 'request-anchor';
      pathFlavor: 'posix';
      rawPath: string;
    }>;

export type DiscoveryLaneMembershipV2 = 'expanded' | 'legacy' | 'both';

interface LocatorPrivateRecordV2 {
  readonly posixPath: string;
  readonly execution: LocateExecutionTokenV2;
  readonly sourceFlavor: RawDiscoveryLocatorInputV2['source'];
}

interface HitPrivateRecordV2 {
  readonly locatorRef: DiscoveryLocatorRefV2;
  readonly safeKey: PublicSafeRankingKeyV2;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly source: SearchBackendId;
  readonly querySeedKeys: readonly string[];
  readonly matchedAnchorKeys: readonly string[];
  readonly execution: LocateExecutionTokenV2;
}

export interface PublicSafeRankingKeyV2 {
  readonly file: string;
  readonly symbol: string;
}

export interface PublicSafeExpandedCandidateV2 {
  readonly hitRef: ExpandedHitRefV2;
  readonly locatorRef: DiscoveryLocatorRefV2;
  readonly safeKey: PublicSafeRankingKeyV2;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly source: SearchBackendId;
  readonly querySeedKeys: readonly string[];
  readonly matchedAnchorKeys: readonly string[];
}

export interface PreCapPublicSafeDiscoveryPoolV2 {
  readonly candidates: readonly PublicSafeExpandedCandidateV2[];
  readonly complete: boolean;
}

const locatorRecords = new WeakMap<
  DiscoveryLocatorRefV2,
  LocatorPrivateRecordV2
>();
const hitRecords = new WeakMap<ExpandedHitRefV2, HitPrivateRecordV2>();
const internedLocators = new WeakMap<
  LocateExecutionTokenV2,
  Map<string, DiscoveryLocatorRefV2>
>();

const DRIVE_RELATIVE = /^[A-Za-z]:/u;
const UNC_OR_DEVICE = /^[\\/]{2}/u;

/**
 * Legacy 唯一允许 replaceAll + posix.normalize 的 adapter。
 */
export function adaptLegacyBackendPathV1(rawPath: string): string {
  return posix.normalize(rawPath.replaceAll('\\', '/'));
}

function rejectExpandedRawPath(
  rawPath: string,
  pathFlavor: 'native' | 'posix',
): boolean {
  if (rawPath.length === 0 || rawPath.includes('\0')) {
    return true;
  }
  if (DRIVE_RELATIVE.test(rawPath) || UNC_OR_DEVICE.test(rawPath)) {
    return true;
  }
  if (posix.isAbsolute(rawPath)) {
    return true;
  }
  const hasBackslash = rawPath.includes('\\');
  if (pathFlavor === 'posix' && hasBackslash) {
    return true;
  }
  if (pathFlavor === 'native' && hasBackslash && process.platform !== 'win32') {
    return true;
  }
  const slashPath =
    pathFlavor === 'native' && process.platform === 'win32'
      ? rawPath.replaceAll('\\', '/')
      : rawPath;
  if (slashPath.includes('\\')) {
    return true;
  }
  const segments = slashPath.split('/');
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === '.' || segment === '..',
    )
  ) {
    return true;
  }
  if (slashPath.endsWith('/')) {
    return true;
  }
  return false;
}

function toExpandedPosixPath(
  rawPath: string,
  pathFlavor: 'native' | 'posix',
): string | undefined {
  if (rejectExpandedRawPath(rawPath, pathFlavor)) {
    return undefined;
  }
  if (pathFlavor === 'native' && process.platform === 'win32') {
    return rawPath.replaceAll('\\', '/');
  }
  return rawPath;
}

/**
 * 同 execution 逐 code-unit 相同 POSIX locator intern 为同一 ref。
 */
export function bindRawDiscoveryLocatorV2(
  input: RawDiscoveryLocatorInputV2,
  execution: LocateExecutionTokenV2,
): DiscoveryLocatorRefV2 | undefined {
  const posixPath = toExpandedPosixPath(input.rawPath, input.pathFlavor);
  if (posixPath === undefined) {
    return undefined;
  }
  let table = internedLocators.get(execution);
  if (table === undefined) {
    table = new Map();
    internedLocators.set(execution, table);
  }
  const existing = table.get(posixPath);
  if (existing !== undefined) {
    return existing;
  }
  const ref = createOpaqueTokenV2<DiscoveryLocatorRefV2>();
  locatorRecords.set(
    ref,
    Object.freeze({
      posixPath,
      execution,
      sourceFlavor: input.source,
    }),
  );
  table.set(posixPath, ref);
  return ref;
}

/**
 * 测试/内部：读取 interned locator 的 posix path。
 */
export function readDiscoveryLocatorPosixPathV2(
  ref: DiscoveryLocatorRefV2,
): string {
  const record = locatorRecords.get(ref);
  if (record === undefined) {
    throw new TypeError('discovery locator ref is not trusted');
  }
  return record.posixPath;
}

export interface ExpandedSafeCandidateInputV2 {
  readonly locatorRef: DiscoveryLocatorRefV2;
  readonly safeFile: string;
  readonly safeSymbol: string;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly source: SearchBackendId;
  readonly querySeedKeys?: readonly string[];
  readonly matchedAnchorKeys?: readonly string[];
}

/**
 * 将 complete-safe expanded hits 投影为 pre-cap public-safe pool。
 */
export function projectExpandedSafePreCapPoolV2(
  inputs: readonly ExpandedSafeCandidateInputV2[],
  complete: boolean,
  execution: LocateExecutionTokenV2,
): PreCapPublicSafeDiscoveryPoolV2 {
  if (!complete) {
    return Object.freeze({
      candidates: Object.freeze([]),
      complete: false,
    });
  }
  const candidates: PublicSafeExpandedCandidateV2[] = [];
  for (const input of inputs) {
    const locator = locatorRecords.get(input.locatorRef);
    if (locator === undefined || locator.execution !== execution) {
      throw new TypeError('expanded candidate locator ref mismatch');
    }
    const hitRef = createOpaqueTokenV2<ExpandedHitRefV2>();
    const safeKey = Object.freeze({
      file: input.safeFile,
      symbol: input.safeSymbol,
    });
    hitRecords.set(
      hitRef,
      Object.freeze({
        locatorRef: input.locatorRef,
        safeKey,
        lineStart: input.lineStart,
        lineEnd: input.lineEnd,
        source: input.source,
        querySeedKeys: Object.freeze(
          (input.querySeedKeys ?? []).slice().sort(),
        ),
        matchedAnchorKeys: Object.freeze(
          (input.matchedAnchorKeys ?? []).slice().sort(),
        ),
        execution,
      }),
    );
    candidates.push(
      Object.freeze({
        hitRef,
        locatorRef: input.locatorRef,
        safeKey,
        lineStart: input.lineStart,
        lineEnd: input.lineEnd,
        source: input.source,
        querySeedKeys: hitRecords.get(hitRef)!.querySeedKeys,
        matchedAnchorKeys: hitRecords.get(hitRef)!.matchedAnchorKeys,
      }),
    );
  }
  return Object.freeze({
    candidates: Object.freeze(candidates),
    complete: true,
  });
}
