/**
 * 兼容 re-export：权威实现位于 contracts（避免 production→public-output 边）。
 */
export {
  guardLocateRequestRawV2,
  parseLocateRequestV2,
  safeParseLocateRequestV2,
} from '../../contracts/locate-request-parse-v2.js';
