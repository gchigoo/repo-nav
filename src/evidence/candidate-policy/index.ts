/**
 * Candidate policy 公共表面：枚举/选择 seam 位于本目录；兼容 import 路径不变。
 */
export {
  CANDIDATE_REASON_POLICY,
  applyCandidatePolicy,
  createVerifiedCandidateContext,
  materializeCandidateDraft,
  promotionRequirementsForReasons,
  secondaryBackendCandidateReasons,
  type CandidatePolicyInput,
  type CandidatePolicyResult,
  type ClassifiedCandidateDraft,
  type VerifiedCandidateContext,
} from './apply-candidate-policy.js';
