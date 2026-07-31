/**
 * F3/F5 ABI compile fixture：四参数 searchViews 签名锁定。
 */
export type F5SearchViewsProviderV2 = (
  request: unknown,
  signal: AbortSignal,
  context: unknown,
  execution: unknown,
) => Promise<unknown>;

export type F3SearchViewsConsumerV2 = F5SearchViewsProviderV2;

export function assertSameSearchViewsAbiV2(
  provider: F5SearchViewsProviderV2,
  consumer: F3SearchViewsConsumerV2,
): void {
  if (provider.length !== 4 || consumer.length !== 4) {
    throw new TypeError('searchViews ABI arity must be 4');
  }
}
