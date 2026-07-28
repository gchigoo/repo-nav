/**
 * F3 pre-final / post-final capability narrow views（F8 消费；无 path accessor）。
 */

import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  readDiscoveryLocatorPosixPathV2,
  type DiscoveryLocatorRefV2,
} from './discovery-lane-universe-v2.js';
import {
  isRegisteredSnapshotTrustProofV2,
  type SnapshotTrustProofV2,
  type TrustedStableEligibleDiscoveryPoolV2,
} from './final-snapshot-check-v2.js';
import type {
  EligibleDiscoveryRefV2,
  OpaqueFileBucketRefV2,
  PreFinalEligibleDiscoveryPoolV2,
} from './pre-ranking-evidence-pool-v2.js';
import type {
  ScopeFoldedSafePoolProofV2,
  TrustedScopeFoldedSelectorViewV2,
} from './scope-folded-discovery-selector-v2.js';
import type { BoundSafeDiscoverySelectionV2 } from './discovery-selection-binding-v2.js';
import type { TrustedScopeEligibilityObservationV2 } from './trusted-scope-policy-adapter-v2.js';
import {
  createVerifiedLanguageContextRefV2,
  type VerifiedLanguageContextRefV2,
} from './verified-language-consumer-v2.js';

/**
 * F3 basename last-extension：dot 非首非尾；只 ASCII A..Z 折小写。
 */
export function verifiedLastExtensionFromBasenameV2(
  basename: string,
): string | undefined {
  if (basename.length < 3) {
    return undefined;
  }
  let lastDot = -1;
  for (let i = 0; i < basename.length; i += 1) {
    if (basename.charCodeAt(i) === 0x2e) {
      lastDot = i;
    }
  }
  if (lastDot <= 0 || lastDot >= basename.length - 1) {
    return undefined;
  }
  const raw = basename.slice(lastDot);
  if (raw.charCodeAt(0) !== 0x2e) {
    return undefined;
  }
  let folded = '.';
  for (let i = 1; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code >= 0x41 && code <= 0x5a) {
      folded += String.fromCharCode(code + 0x20);
    } else if (
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39)
    ) {
      folded += raw[i]!;
    } else {
      return undefined;
    }
  }
  if (folded.length < 2 || folded.includes('.', 1)) {
    return undefined;
  }
  return folded;
}

declare const TRUSTED_PRE_FINAL_CAPABILITY_VIEW_V2: unique symbol;
export type TrustedPreFinalCapabilityViewV2 = Readonly<object> & {
  readonly [TRUSTED_PRE_FINAL_CAPABILITY_VIEW_V2]: never;
  records(): readonly TrustedPreFinalCapabilityRecordViewV2[];
  verifiedLanguageContext(
    ref: EligibleDiscoveryRefV2,
  ): VerifiedLanguageContextRefV2;
  verifiedLastExtension(ref: EligibleDiscoveryRefV2): string | undefined;
};

declare const TRUSTED_STABLE_ELIGIBLE_CAPABILITY_VIEW_V2: unique symbol;
export type TrustedStableEligibleCapabilityViewV2 = Readonly<object> & {
  readonly [TRUSTED_STABLE_ELIGIBLE_CAPABILITY_VIEW_V2]: never;
  readonly pool: TrustedStableEligibleDiscoveryPoolV2;
  readonly proof: SnapshotTrustProofV2;
  records(): readonly TrustedStableEligibleCapabilityRecordViewV2[];
};

export interface TrustedPreFinalCapabilityRecordViewV2 {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly fileBucketRef: OpaqueFileBucketRefV2;
}

export interface TrustedStableEligibleCapabilityRecordViewV2 {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly fileBucketRef: OpaqueFileBucketRefV2;
}

interface PreFinalCapabilityPrivateV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly pool: PreFinalEligibleDiscoveryPoolV2;
  readonly records: readonly TrustedPreFinalCapabilityRecordViewV2[];
  readonly extensionByRef: ReadonlyMap<EligibleDiscoveryRefV2, string | undefined>;
  readonly contextByRef: ReadonlyMap<
    EligibleDiscoveryRefV2,
    VerifiedLanguageContextRefV2
  >;
  readonly sourceTextByRef: ReadonlyMap<EligibleDiscoveryRefV2, string>;
  readonly posixByRef: ReadonlyMap<EligibleDiscoveryRefV2, string>;
}

interface StableCapabilityPrivateV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly pool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly records: readonly TrustedStableEligibleCapabilityRecordViewV2[];
}

const preFinalPrivate = new WeakMap<
  TrustedPreFinalCapabilityViewV2,
  PreFinalCapabilityPrivateV2
>();
const stablePrivate = new WeakMap<
  TrustedStableEligibleCapabilityViewV2,
  StableCapabilityPrivateV2
>();

function basenameFromPosix(posixPath: string): string {
  const normalized = posixPath.replaceAll('\\', '/');
  const parts = normalized.split('/');
  return parts.at(-1) ?? '';
}

/**
 * 测试/composition：绑定 eligible→posix/sourceText 后签发 pre-final capability view。
 */
export function createTrustedPreFinalCapabilityViewForTestV2(input: {
  readonly pool: PreFinalEligibleDiscoveryPoolV2;
  readonly execution: LocateExecutionTokenV2;
  readonly entries: readonly {
    readonly eligibleRef: EligibleDiscoveryRefV2;
    readonly fileBucketRef: OpaqueFileBucketRefV2;
    readonly posixPath: string;
    readonly sourceText: string;
  }[];
}): TrustedPreFinalCapabilityViewV2 {
  const extensionByRef = new Map<EligibleDiscoveryRefV2, string | undefined>();
  const contextByRef = new Map<
    EligibleDiscoveryRefV2,
    VerifiedLanguageContextRefV2
  >();
  const contextByBucket = new Map<
    OpaqueFileBucketRefV2,
    VerifiedLanguageContextRefV2
  >();
  const sourceTextByRef = new Map<EligibleDiscoveryRefV2, string>();
  const posixByRef = new Map<EligibleDiscoveryRefV2, string>();
  const records: TrustedPreFinalCapabilityRecordViewV2[] = [];
  for (const entry of input.entries) {
    const basename = basenameFromPosix(entry.posixPath);
    extensionByRef.set(
      entry.eligibleRef,
      verifiedLastExtensionFromBasenameV2(basename),
    );
    let context = contextByBucket.get(entry.fileBucketRef);
    if (context === undefined) {
      context = createVerifiedLanguageContextRefV2();
      contextByBucket.set(entry.fileBucketRef, context);
    }
    contextByRef.set(entry.eligibleRef, context);
    sourceTextByRef.set(entry.eligibleRef, entry.sourceText);
    posixByRef.set(entry.eligibleRef, entry.posixPath.replaceAll('\\', '/'));
    records.push(
      Object.freeze({
        eligibleRef: entry.eligibleRef,
        fileBucketRef: entry.fileBucketRef,
      }),
    );
  }
  const view = {
    records() {
      return Object.freeze([...records]);
    },
    verifiedLanguageContext(ref: EligibleDiscoveryRefV2) {
      const context = contextByRef.get(ref);
      if (context === undefined) {
        throw new TypeError('capability context missing for eligible ref');
      }
      return context;
    },
    verifiedLastExtension(ref: EligibleDiscoveryRefV2) {
      if (!extensionByRef.has(ref)) {
        throw new TypeError('capability extension missing for eligible ref');
      }
      return extensionByRef.get(ref);
    },
  } as TrustedPreFinalCapabilityViewV2;
  Object.freeze(view);
  preFinalPrivate.set(
    view,
    Object.freeze({
      execution: input.execution,
      pool: input.pool,
      records: Object.freeze(records),
      extensionByRef,
      contextByRef,
      sourceTextByRef,
      posixByRef,
    }),
  );
  return view;
}

export function requirePreFinalCapabilityViewV2(
  pool: PreFinalEligibleDiscoveryPoolV2,
  _observation: TrustedScopeEligibilityObservationV2,
  _foldedView: TrustedScopeFoldedSelectorViewV2,
  _boundSelection: BoundSafeDiscoverySelectionV2,
  execution: LocateExecutionTokenV2,
  bindings?: readonly {
    readonly eligibleRef: EligibleDiscoveryRefV2;
    readonly fileBucketRef: OpaqueFileBucketRefV2;
    readonly posixPath: string;
    readonly sourceText: string;
  }[],
): TrustedPreFinalCapabilityViewV2 {
  if (bindings !== undefined) {
    return createTrustedPreFinalCapabilityViewForTestV2({
      pool,
      execution,
      entries: bindings,
    });
  }
  // production path：仅有 eligibleRef/fileBucket，无 source 时仍可建 empty-source view
  const entries = pool.records.map((record) =>
    Object.freeze({
      eligibleRef: record.eligibleRef,
      fileBucketRef: record.fileBucketRef,
      posixPath: String(record.canonicalFileKey),
      sourceText: '',
    }),
  );
  return createTrustedPreFinalCapabilityViewForTestV2({
    pool,
    execution,
    entries,
  });
}

export function requireStableEligibleCapabilityViewV2(
  pool: TrustedStableEligibleDiscoveryPoolV2,
  proof: SnapshotTrustProofV2,
  foldProof: ScopeFoldedSafePoolProofV2,
  execution: LocateExecutionTokenV2,
  records: readonly TrustedStableEligibleCapabilityRecordViewV2[],
): TrustedStableEligibleCapabilityViewV2 {
  if (!isRegisteredSnapshotTrustProofV2(proof)) {
    throw new TypeError('stable capability view snapshot proof mismatch');
  }
  void pool;
  void execution;
  void foldProof;
  const view = {
    pool,
    proof,
    records() {
      return Object.freeze([...records]);
    },
  } as TrustedStableEligibleCapabilityViewV2;
  Object.freeze(view);
  stablePrivate.set(
    view,
    Object.freeze({
      execution,
      pool,
      snapshotProof: proof,
      foldProof,
      records: Object.freeze([...records]),
    }),
  );
  return view;
}

export function readPreFinalCapabilitySourceTextV2(
  view: TrustedPreFinalCapabilityViewV2,
  ref: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): string {
  const record = preFinalPrivate.get(view);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('pre-final capability view untrusted');
  }
  const text = record.sourceTextByRef.get(ref);
  if (text === undefined) {
    throw new TypeError('capability source text missing');
  }
  return text;
}

export function requirePreFinalCapabilityViewPrivateV2(
  view: TrustedPreFinalCapabilityViewV2,
  execution: LocateExecutionTokenV2,
): PreFinalCapabilityPrivateV2 {
  const record = preFinalPrivate.get(view);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('pre-final capability view untrusted');
  }
  return record;
}

/** 供 observation 绑定 locator 路径（F3 private；F8 API 不暴露）。 */
export function bindCapabilityLocatorPathForTestV2(
  locatorRef: DiscoveryLocatorRefV2,
): string {
  return readDiscoveryLocatorPosixPathV2(locatorRef);
}
