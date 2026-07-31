/**
 * F9-TRANSPORT-001 hostile receipt/value/capability swap matrix.
 */
export const TRANSPORT_HOSTILE_SWAP_CASES_V2 = Object.freeze([
  Object.freeze({
    id: 'value-receipt-swap',
    expect: 'PUBLIC_LOCATE_TRANSPORT_INVARIANT',
  }),
  Object.freeze({
    id: 'capability-swap',
    expect: 'PUBLIC_LOCATE_TRANSPORT_INVARIANT',
  }),
] as const);

export const TRANSPORT_INVALID_INPUT_CODE_V2 = 'INVALID_INPUT' as const;
