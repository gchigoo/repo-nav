import type {
  BackendHit,
  BackendSearchResult,
} from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';

declare const TRUSTED_LEGACY_SELECTION_PROOF_V1: unique symbol;
export type TrustedLegacySelectionProofV1 = Readonly<object> & {
  readonly [TRUSTED_LEGACY_SELECTION_PROOF_V1]: never;
};

declare const LEGACY_SELECTED_PATH_RECEIPT_V2: unique symbol;
export type LegacySelectedPathReceiptV2 = Readonly<object> & {
  readonly [LEGACY_SELECTED_PATH_RECEIPT_V2]: never;
};

declare const TRUSTED_LEGACY_SELECTED_PATH_POOL_V2: unique symbol;
export type TrustedLegacySelectedPathPoolV2 = Readonly<object> & {
  readonly [TRUSTED_LEGACY_SELECTED_PATH_POOL_V2]: never;
};

export interface LegacyDiscoverySelectionResultV1 {
  readonly hits: readonly BackendHit[];
  readonly filesTruncated: boolean;
}

export interface FrozenLegacySelectionV1 {
  readonly result: LegacyDiscoverySelectionResultV1;
  readonly selectedCount: number;
  readonly proof: TrustedLegacySelectionProofV1;
}

interface LegacySelectionPrivateRecordV1 {
  readonly result: LegacyDiscoverySelectionResultV1;
  readonly selectedCount: number;
  readonly normalizedPaths: readonly string[];
  readonly filesTruncated: boolean;
  readonly execution: LocateExecutionTokenV2;
}

interface LegacyPathReceiptPrivateRecordV2 {
  readonly proof: TrustedLegacySelectionProofV1;
  readonly selectedOrdinal: number;
  readonly normalizedPath: string;
  readonly execution: LocateExecutionTokenV2;
}

const legacySelectionRecords = new WeakMap<
  TrustedLegacySelectionProofV1,
  LegacySelectionPrivateRecordV1
>();

const legacyReceiptRecords = new WeakMap<
  LegacySelectedPathReceiptV2,
  LegacyPathReceiptPrivateRecordV2
>();

const sealedLegacyPools = new WeakMap<
  TrustedLegacySelectedPathPoolV2,
  {
    readonly proof: TrustedLegacySelectionProofV1;
    readonly receipts: readonly LegacySelectedPathReceiptV2[];
    readonly execution: LocateExecutionTokenV2;
  }
>();

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
 * 全部 legacy backend/fallback 裁决后只调用一次；原子冻结 result/selectedCount/proof。
 */
export function selectAndFreezeLegacyBackendHitsV1(
  results: readonly BackendSearchResult[],
  maxFiles: number,
  execution: LocateExecutionTokenV2,
): FrozenLegacySelectionV1 {
  const hits: BackendHit[] = [];
  const files = new Set<string>();
  let filesTruncated = false;
  for (const hit of results
    .flatMap((result) => result.hits)
    .sort(compareBackendHit)) {
    if (!files.has(hit.file) && files.size >= maxFiles) {
      filesTruncated = true;
      continue;
    }
    files.add(hit.file);
    hits.push(hit);
  }

  const result: LegacyDiscoverySelectionResultV1 = Object.freeze({
    hits: Object.freeze(hits.slice()),
    filesTruncated,
  });
  const proof = createOpaqueTokenV2<TrustedLegacySelectionProofV1>();
  const selectedCount = result.hits.length;
  legacySelectionRecords.set(
    proof,
    Object.freeze({
      result,
      selectedCount,
      normalizedPaths: Object.freeze(result.hits.map((hit) => hit.file)),
      filesTruncated: result.filesTruncated,
      execution,
    }),
  );
  return Object.freeze({ result, selectedCount, proof });
}

/**
 * 按 proof 的 exact ordinal 建立 policy-only path receipt。
 */
export function registerLegacySelectedPathV2(
  proof: TrustedLegacySelectionProofV1,
  selectedOrdinal: number,
  execution: LocateExecutionTokenV2,
): LegacySelectedPathReceiptV2 {
  const record = legacySelectionRecords.get(proof);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('legacy selection proof is not trusted for execution');
  }
  if (
    !Number.isSafeInteger(selectedOrdinal) ||
    selectedOrdinal < 0 ||
    selectedOrdinal >= record.selectedCount
  ) {
    throw new TypeError('legacy selected ordinal out of range');
  }
  const normalizedPath = record.normalizedPaths[selectedOrdinal];
  if (normalizedPath === undefined) {
    throw new TypeError('legacy selected path missing');
  }
  const receipt = createOpaqueTokenV2<LegacySelectedPathReceiptV2>();
  legacyReceiptRecords.set(
    receipt,
    Object.freeze({
      proof,
      selectedOrdinal,
      normalizedPath,
      execution,
    }),
  );
  return receipt;
}

/**
 * 要求 receipts 恰好覆盖 0..selectedCount-1；0 条只接受空集合。
 */
export function sealTrustedLegacySelectedPathPoolV2(
  proof: TrustedLegacySelectionProofV1,
  receipts: readonly LegacySelectedPathReceiptV2[],
  execution: LocateExecutionTokenV2,
): TrustedLegacySelectedPathPoolV2 {
  const record = legacySelectionRecords.get(proof);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('legacy selection proof is not trusted for execution');
  }
  if (receipts.length !== record.selectedCount) {
    throw new TypeError('legacy receipt count must equal selectedCount');
  }
  const seen = new Set<number>();
  for (let index = 0; index < receipts.length; index += 1) {
    const receipt = receipts[index];
    if (receipt === undefined) {
      throw new TypeError('legacy receipt missing');
    }
    const privateRecord = legacyReceiptRecords.get(receipt);
    if (
      privateRecord === undefined ||
      privateRecord.proof !== proof ||
      privateRecord.execution !== execution ||
      privateRecord.selectedOrdinal !== index
    ) {
      throw new TypeError('legacy receipt ordinal or proof mismatch');
    }
    if (seen.has(privateRecord.selectedOrdinal)) {
      throw new TypeError('duplicate legacy receipt ordinal');
    }
    seen.add(privateRecord.selectedOrdinal);
  }
  const pool = createOpaqueTokenV2<TrustedLegacySelectedPathPoolV2>();
  sealedLegacyPools.set(
    pool,
    Object.freeze({
      proof,
      receipts: Object.freeze(receipts.slice()),
      execution,
    }),
  );
  return pool;
}

/**
 * 测试辅助：从已 seal pool 读取 ordinal path（不暴露给 production consumers）。
 */
export function readLegacySelectedPathForTestV2(
  pool: TrustedLegacySelectedPathPoolV2,
  ordinal: number,
): string {
  const sealed = sealedLegacyPools.get(pool);
  if (sealed === undefined) {
    throw new TypeError('legacy pool is not sealed');
  }
  const receipt = sealed.receipts[ordinal];
  if (receipt === undefined) {
    throw new TypeError('legacy ordinal out of range');
  }
  const record = legacyReceiptRecords.get(receipt);
  if (record === undefined) {
    throw new TypeError('legacy receipt record missing');
  }
  return record.normalizedPath;
}
