/**
 * F3-CACHE-001：同文件 range/window/findMatches 与并发只 decode 一次。
 */
export const SINGLE_DECODE_FILE_V2 = 'server/cache-target.ts';

export const SINGLE_DECODE_CONTENT_V2 = [
  'line-1',
  'const cacheTarget = true;',
  'line-3',
  'line-4',
  'line-5',
].join('\n');

export const SINGLE_DECODE_LIMITS_V2 = Object.freeze({
  maxFileBytes: 4096,
  maxExcerptBytes: 512,
  maxExcerptLines: 8,
});
