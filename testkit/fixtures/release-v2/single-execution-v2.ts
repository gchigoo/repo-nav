/**
 * F9-SINGLE-EXEC-001: invalid ingress must not reach executor.
 */
export const SINGLE_EXEC_INVALID_INGRESS_V2 = Object.freeze({
  rawRequest: Object.freeze({ notARequest: true }),
  expectedCode: 'INVALID_INPUT',
} as const);
