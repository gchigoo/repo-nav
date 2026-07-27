/** F1A-PHONE-001 / F1A-PHONE-NEG-001 truth table. */
export const PHONE_ACCEPT_V2 = Object.freeze([
  '+1 (415) 555-2671',
  '415-555-2671',
  '13800138000',
  '+86 138 0013 8000',
] as const);

export const PHONE_REJECT_V2 = Object.freeze([
  '2026-07-23',
  'v1.20.260723',
  '550e8400-e29b-41d4-a716-446655440000',
  '20260723153000',
  '123-45-678',
] as const);

export const PHONE_LOCAL_ONLY_BARE_UNIX_V2 = Object.freeze([
  '1690000000',
  '1690000000000',
] as const);

export const PHONE_TIMESTAMP_CUE_V2 = 'timestamp=1690000000';
export const PHONE_WITH_CUE_V2 = 'phone=2125551234';
