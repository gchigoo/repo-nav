import { Buffer } from 'node:buffer';

/**
 * F6 filesystem-safe input：repoPath / file anchor 不做 NFKC、trim 或反斜杠修复。
 */

const utf8Length = (value: string): number => Buffer.byteLength(value, 'utf8');

/**
 * 校验 raw repoPath：non-empty、无 NUL、UTF-8 <=4096；原值逐 code-unit 保留。
 */
export function assertRawRepoPathV2(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('repoPath must not be empty.');
  }
  if (value.includes('\0')) {
    throw new Error('repoPath must not contain NUL.');
  }
  if (utf8Length(value) > 4096) {
    throw new Error('repoPath exceeds 4096 UTF-8 bytes.');
  }
}

/**
 * 校验 repository-relative POSIX file anchor；拒绝反斜杠与绝对/逃逸形态。
 */
export function assertRawFileAnchorValueV2(
  value: unknown,
): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('File anchor must be a non-empty repository-relative path.');
  }
  if (value.includes('\0')) {
    throw new Error('File anchor must not contain NUL.');
  }
  if (value.includes('\\')) {
    throw new Error('File anchor must use POSIX separators.');
  }
  if (utf8Length(value) > 512) {
    throw new Error('File anchor exceeds 512 UTF-8 bytes.');
  }
  if (value.startsWith('/') || value.endsWith('/')) {
    throw new Error('File anchor must be repository-root relative.');
  }
  if (/^[A-Za-z]:/u.test(value) || value.startsWith('//')) {
    throw new Error('File anchor must be repository-root relative.');
  }
  const segments = value.split('/');
  for (const segment of segments) {
    if (segment.length === 0 || segment === '.' || segment === '..') {
      throw new Error('File anchor escapes the repository root.');
    }
  }
}

/**
 * Zod refine helper：file kind 时对 exact value 执行 filesystem gate。
 */
export function refineFileAnchorValueV2(value: string): string {
  assertRawFileAnchorValueV2(value);
  return value;
}
