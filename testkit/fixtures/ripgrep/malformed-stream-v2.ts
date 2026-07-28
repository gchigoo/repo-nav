export const MALFORMED_STREAM_CASES_V2 = Object.freeze([
  'empty-line',
  'unknown-event',
  'invalid-utf8',
  'unterminated-eof',
  'bytes-only-path',
] as const);

export function malformedEmptyLineV2(): Uint8Array {
  return Buffer.from('\n', 'utf8');
}

export function malformedUnknownEventV2(): Uint8Array {
  return Buffer.from(
    `${JSON.stringify({ type: 'weird', data: {} })}\n`,
    'utf8',
  );
}

export function malformedInvalidUtf8V2(): Uint8Array {
  return Buffer.from([0xff, 0x0a]);
}

export function malformedUnterminatedV2(): Uint8Array {
  return Buffer.from('{"type":"summary","data":{', 'utf8');
}
