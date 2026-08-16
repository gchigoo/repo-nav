/**
 * F8-EXT-001 / F8-LANG-001 extension matrix fixtures。
 */

export const typescriptExtensionCasesV2 = Object.freeze([
  Object.freeze({ basename: 'a.ts', extension: '.ts', adapter: 'typescript' }),
  Object.freeze({
    basename: 'a.tsx',
    extension: '.tsx',
    adapter: 'typescript',
  }),
  Object.freeze({
    basename: 'a.mts',
    extension: '.mts',
    adapter: 'typescript',
  }),
  Object.freeze({
    basename: 'a.cts',
    extension: '.cts',
    adapter: 'typescript',
  }),
  Object.freeze({ basename: 'a.TS', extension: '.ts', adapter: 'typescript' }),
  Object.freeze({
    basename: 'file.d.ts',
    extension: '.ts',
    adapter: 'typescript',
  }),
]);

export const javascriptExtensionCasesV2 = Object.freeze([
  Object.freeze({ basename: 'a.js', extension: '.js', adapter: 'javascript' }),
  Object.freeze({
    basename: 'a.jsx',
    extension: '.jsx',
    adapter: 'javascript',
  }),
  Object.freeze({
    basename: 'a.mjs',
    extension: '.mjs',
    adapter: 'javascript',
  }),
  Object.freeze({
    basename: 'a.cjs',
    extension: '.cjs',
    adapter: 'javascript',
  }),
]);

export const sqlExtensionCasesV2 = Object.freeze([
  Object.freeze({ basename: 'a.sql', extension: '.sql', adapter: 'sql' }),
  Object.freeze({ basename: 'A.SQL', extension: '.sql', adapter: 'sql' }),
]);

export const pythonExtensionCasesV2 = Object.freeze([
  Object.freeze({ basename: 'a.py', extension: '.py', adapter: 'python' }),
  Object.freeze({ basename: 'a.pyi', extension: '.pyi', adapter: 'python' }),
  Object.freeze({ basename: 'A.PY', extension: '.py', adapter: 'python' }),
]);

export const goExtensionCasesV2 = Object.freeze([
  Object.freeze({ basename: 'a.go', extension: '.go', adapter: 'go' }),
  Object.freeze({ basename: 'A.GO', extension: '.go', adapter: 'go' }),
]);

export const fallbackCandidateCasesV2 = Object.freeze([
  Object.freeze({
    basename: 'README.md',
    extension: '.md',
    adapter: 'fallback',
  }),
  Object.freeze({
    basename: 'file.',
    extension: undefined,
    adapter: 'fallback',
  }),
  Object.freeze({ basename: '.ts', extension: undefined, adapter: 'fallback' }),
  Object.freeze({
    basename: 'file.ts.txt',
    extension: '.txt',
    adapter: 'fallback',
  }),
  Object.freeze({
    basename: 'noext',
    extension: undefined,
    adapter: 'fallback',
  }),
]);

export const unsupportedCountCasesV2 = Object.freeze([
  Object.freeze({
    id: 'fallback-with-term',
    adapter: 'fallback',
    matchedTermPresent: true,
    countsUnsupported: true,
  }),
  Object.freeze({
    id: 'fallback-no-term',
    adapter: 'fallback',
    matchedTermPresent: false,
    countsUnsupported: true,
  }),
  Object.freeze({
    id: 'typescript-supported',
    adapter: 'typescript',
    matchedTermPresent: true,
    countsUnsupported: false,
  }),
]);
