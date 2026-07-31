/** Large synthetic stream counters（不记录 raw）。 */
export function buildLargeSyntheticMatchCountV2(count: number): number {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new TypeError('count must be positive safe integer');
  }
  return count;
}
