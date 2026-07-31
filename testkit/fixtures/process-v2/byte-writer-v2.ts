/** N/N+1 byte boundary fixtures for streaming process kernel. */
export const BYTE_WRITER_SIZES_V2 = Object.freeze([0, 1, 1023, 1024, 1025] as const);

export function allocateBytesV2(size: number, fill = 65): Uint8Array {
  return Buffer.alloc(size, fill);
}
