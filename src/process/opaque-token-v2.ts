/**
 * 无 own-property 的 opaque token（process 层，不依赖 evidence）。
 */
export function createProcessOpaqueTokenV2<T extends object>(): T {
  return Object.freeze(Object.create(null)) as T;
}
