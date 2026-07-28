/** F6-FILE-001 file anchor reject/preserve matrix. */
export const FILE_ANCHOR_CASES_V2 = Object.freeze([
  Object.freeze({ value: 'src/a.ts', ok: true }),
  Object.freeze({ value: 'src\\a.ts', ok: false }),
  Object.freeze({ value: '/abs.ts', ok: false }),
  Object.freeze({ value: 'C:/abs.ts', ok: false }),
  Object.freeze({ value: '//server/share/x.ts', ok: false }),
  Object.freeze({ value: 'src/../escape.ts', ok: false }),
  Object.freeze({ value: 'src/./x.ts', ok: false }),
  Object.freeze({ value: 'src/', ok: false }),
  Object.freeze({ value: '', ok: false }),
] as const);
