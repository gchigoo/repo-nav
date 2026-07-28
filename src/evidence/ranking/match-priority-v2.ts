/**
 * 固定离散 MatchPriority（越大越优先）；不公开 score/confidence。
 */
export const MATCH_PRIORITIES_V2 = Object.freeze([
  100, 96, 95, 94, 92, 88, 87, 80, 70, 60, 40,
] as const);

export type MatchPriorityV2 = (typeof MATCH_PRIORITIES_V2)[number];

export const MATCH_PRIORITY_V2 = Object.freeze({
  FILE_ANCHOR: 100,
  SYMBOL_DEFINITION: 96,
  ROUTE_EXECUTION: 95,
  TABLE_MAPPING: 94,
  TERM_LITERAL: 92,
  SYMBOL_CANDIDATE: 88,
  ROUTE_OR_TABLE_CANDIDATE: 87,
  STRUCTURED_CODEGRAPH: 80,
  MULTI_TERM: 70,
  SINGLE_TERM: 60,
  SECONDARY_BACKEND: 40,
} as const satisfies Record<string, MatchPriorityV2>);
