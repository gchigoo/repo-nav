import { describe, expect, it, vi } from 'vitest';

import {
  VerifiedDiscoveryObservationCacheV2,
  encodeVerifiedObservationReadKeyV2,
} from '../../src/evidence/request-snapshot/verified-record-cache-v2.js';
import {
  VERIFIED_CACHE_FILE_V2,
  createVerifiedObservationFixtureV2,
} from '../../testkit/fixtures/request-snapshot-v2/verified-record-cache-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'verified-record-cache-preverification-reuse',
});

describe.runIf(selected)(
  'F3-VERIFY-001 verified-record-cache-preverification-reuse',
  () => {
    it('reuses one observation for identical read keys across preverify and merge', async () => {
      const signal = new AbortController().signal;
      const binding = {
        repositoryRoot: '/tmp/repo',
        terms: Object.freeze([{ value: 'observed', caseSensitive: true }]),
        limits: Object.freeze({
          maxFileBytes: 4096,
          maxExcerptBytes: 256,
          maxExcerptLines: 4,
        }),
        maxMatches: 4,
        signal,
      };
      const cache = new VerifiedDiscoveryObservationCacheV2(binding);
      const compute = vi.fn(async () => createVerifiedObservationFixtureV2());
      const key = Object.freeze({
        file: VERIFIED_CACHE_FILE_V2,
        lines: Object.freeze([1, 1] as [number, number]),
        matchedText: 'observed',
      });

      const first = await cache.getOrCompute(key, compute);
      const second = await cache.getOrCompute(key, compute);
      expect(first).toBe(second);
      expect(compute).toHaveBeenCalledTimes(1);
      expect(cache.getComputeInvocationCount()).toBe(1);

      // source/reason 不进 key：相同 filesystem key 仍命中
      const keyAgain = Object.freeze({
        file: VERIFIED_CACHE_FILE_V2,
        lines: Object.freeze([1, 1] as [number, number]),
        matchedText: 'observed',
      });
      expect(encodeVerifiedObservationReadKeyV2(key)).toBe(
        encodeVerifiedObservationReadKeyV2(keyAgain),
      );
      await cache.getOrCompute(keyAgain, compute);
      expect(compute).toHaveBeenCalledTimes(1);

      const different = await cache.getOrCompute(
        Object.freeze({
          file: VERIFIED_CACHE_FILE_V2,
          lines: Object.freeze([2, 2] as [number, number]),
        }),
        compute,
      );
      expect(different).toBeDefined();
      expect(compute).toHaveBeenCalledTimes(2);

      cache.dispose();
      await expect(cache.getOrCompute(key, compute)).rejects.toThrow(
        /disposed/i,
      );
    });
  },
);
