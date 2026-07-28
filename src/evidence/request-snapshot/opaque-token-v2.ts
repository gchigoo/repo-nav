/**
 * 创建无 own-property、不可枚举、深冻结的 opaque token。
 */
export function createOpaqueTokenV2<T extends object>(): T {
  return Object.freeze(Object.create(null)) as T;
}
