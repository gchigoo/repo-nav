export function validProtocolStreamV2(): string {
  return [
    JSON.stringify({ type: 'begin', data: { path: { text: 'x.ts' } } }),
    JSON.stringify({
      type: 'match',
      data: {
        path: { text: 'x.ts' },
        lines: { text: 'ab\n' },
        line_number: 1,
        absolute_offset: 0,
        submatches: [{ match: { text: 'a' }, start: 0, end: 1 }],
      },
    }),
    JSON.stringify({ type: 'end', data: { path: { text: 'x.ts' } } }),
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
    '',
  ].join('\n');
}

export function emptyScopeStreamV2(): string {
  return [
    JSON.stringify({ type: 'begin', data: { path: { text: 'x.ts' } } }),
    JSON.stringify({ type: 'end', data: { path: { text: 'x.ts' } } }),
    JSON.stringify({
      type: 'summary',
      data: {
        stats: {
          searches: 1,
          searches_with_match: 0,
          matched_lines: 0,
          matches: 0,
        },
      },
    }),
    '',
  ].join('\n');
}
