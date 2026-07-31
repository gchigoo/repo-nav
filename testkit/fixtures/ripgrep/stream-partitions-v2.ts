/** JSON line partition corpus：同一逻辑流的多种 chunk 切分。 */
export function buildMatchStreamV2(): Uint8Array {
  const lines = [
    JSON.stringify({
      type: 'begin',
      data: { path: { text: 'a.ts' } },
    }),
    JSON.stringify({
      type: 'match',
      data: {
        path: { text: 'a.ts' },
        lines: { text: 'const x = Foo;\n' },
        line_number: 1,
        absolute_offset: 0,
        submatches: [{ match: { text: 'Foo' }, start: 10, end: 13 }],
      },
    }),
    JSON.stringify({
      type: 'end',
      data: { path: { text: 'a.ts' } },
    }),
    JSON.stringify({
      type: 'summary',
      data: {
        stats: {
          searches: 1,
          searches_with_match: 1,
          matched_lines: 1,
          matches: 1,
        },
      },
    }),
  ];
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

export function partitionBytesV2(
  bytes: Uint8Array,
  sizes: readonly number[],
): readonly Uint8Array[] {
  const parts: Uint8Array[] = [];
  let offset = 0;
  for (const size of sizes) {
    if (offset >= bytes.byteLength) {
      break;
    }
    const end = Math.min(bytes.byteLength, offset + size);
    parts.push(bytes.subarray(offset, end));
    offset = end;
  }
  if (offset < bytes.byteLength) {
    parts.push(bytes.subarray(offset));
  }
  return Object.freeze(parts);
}
