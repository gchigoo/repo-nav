import { describe, expect, it } from 'vitest';

describe('f4 intentional ci failure', () => {
  it('fails on purpose for ruleset negative evidence', () => {
    expect(true).toBe(false);
  });
});
