import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';

/**
 * Executor 双 lane 接线收据：供 request-snapshot-cache 用例证明
 * expandedMaxHits / scopeFold / LegacyCandidateReservation 进入生产路径。
 */
export interface DualLaneExecutionReceiptV2 {
  readonly sharedSearchMaxHits: number;
  readonly expandedMaxHits: number;
  readonly legacyMaxHits: number;
  readonly scopeFoldInvoked: boolean;
  readonly scopeFoldCandidateCount: number;
  readonly scopeFoldFilesTruncated: boolean;
  readonly usedLegacyCandidateReservation: boolean;
  readonly expandedProposalCount: number;
  readonly expandedEvaluatedDraftCount: number;
}

const receipts = new WeakMap<
  LocateExecutionTokenV2,
  DualLaneExecutionReceiptV2
>();

/**
 * 登记本次 execution 的双 lane 收据。
 */
export function registerDualLaneExecutionReceiptV2(
  execution: LocateExecutionTokenV2,
  receipt: DualLaneExecutionReceiptV2,
): void {
  receipts.set(execution, Object.freeze({ ...receipt }));
}

/**
 * 测试/内部：读取同 execution 收据。
 */
export function readDualLaneExecutionReceiptV2(
  execution: LocateExecutionTokenV2,
): DualLaneExecutionReceiptV2 | undefined {
  return receipts.get(execution);
}
