/**
 * F7-PATH-001 / F7-SCOPE-001：discriminated source/flavor 与三平台 separator 真值。
 */
export const PATH_SOURCE_MATRIX_V1 = Object.freeze({
  acceptedPosix: Object.freeze(['a/b.ts', 'src/server/a.ts']),
  rejectedDriveRelative: Object.freeze(['C:foo', 'C:', 'C:/foo', 'D:bar']),
  rejectedAbsoluteOrUnc: Object.freeze([
    '/abs/a.ts',
    '//server/share/a.ts',
    '\\\\server\\share\\a.ts',
  ]),
  rejectedDotSegments: Object.freeze([
    'a/../b.ts',
    'a//b.ts',
    'a/./b.ts',
    'a/b/',
  ]),
  rejectedCallerBackslash: Object.freeze(['a\\b.ts']),
  windowsNativeBackslash: 'a\\b.ts',
  nonWindowsNativeBackslashRejected: 'a\\b.ts',
} as const);

export const SCOPE_PRIORITY_SAMPLES_V1 = Object.freeze([
  Object.freeze({
    path: 'src/server/a.spec.ts',
    layer: 'test' as const,
    rule: 'test-basename' as const,
  }),
  Object.freeze({
    path: 'doc/a.ts',
    layer: 'docs' as const,
    rule: 'docs-segment' as const,
  }),
  Object.freeze({
    path: 'apps/web/a.ts',
    layer: 'client' as const,
    rule: 'explicit-prefix' as const,
  }),
  Object.freeze({
    path: 'packages/foo/server/client/a.ts',
    layer: 'server' as const,
    rule: 'ordinary-segment' as const,
  }),
] as const);
