import type {
  EvidenceLocation,
  EvidenceOperationCode,
  NormalizedSearchTerm,
  RepositoryAccessErrorCode,
  RepositoryReadLimits,
} from '../../contracts/index.js';

/**
 * 可复用的 filesystem 观察；不含 source/reason（每轮 merge 重算）。
 */
export type VerifiedDiscoveryObservationV2 =
  | Readonly<{
      kind: 'verified';
      focusLocations: readonly EvidenceLocation[];
      expandedLocations: readonly EvidenceLocation[];
      operations: readonly EvidenceOperationCode[];
      failures: readonly RepositoryAccessErrorCode[];
      /** 多 match 中途 abort 时仍保留已验证子集。 */
      aborted?: boolean;
    }>
  | Readonly<{ kind: 'unverified' }>
  | Readonly<{ kind: 'aborted' }>;

export interface VerifiedObservationReadKeyV2 {
  readonly file: string;
  readonly lines?: readonly [number, number];
  readonly matchedText?: string;
  readonly symbol?: string;
}

export interface VerifiedObservationCacheBindingV2 {
  readonly repositoryRoot: string;
  readonly terms: readonly NormalizedSearchTerm[];
  readonly limits: RepositoryReadLimits;
  readonly maxMatches: number;
  readonly signal: AbortSignal;
}

/**
 * 长度前缀无碰撞编码：字段间以 utf8 字节长度分隔，避免 delimiter 注入。
 */
export function encodeVerifiedObservationReadKeyV2(
  key: VerifiedObservationReadKeyV2,
): string {
  const parts: string[] = [];
  const push = (label: string, value: string): void => {
    const bytes = Buffer.byteLength(value, 'utf8');
    parts.push(`${label}:${bytes}:${value}`);
  };
  push('file', key.file);
  if (key.lines !== undefined) {
    push('lines', `${key.lines[0]},${key.lines[1]}`);
  } else {
    push('lines', '');
  }
  push('matchedText', key.matchedText ?? '');
  push('symbol', key.symbol ?? '');
  return parts.join('|');
}

/**
 * 请求级 observation cache：相同 read key 只计算一次。
 */
export class VerifiedDiscoveryObservationCacheV2 {
  private readonly binding: VerifiedObservationCacheBindingV2;
  private readonly observations = new Map<
    string,
    Promise<VerifiedDiscoveryObservationV2>
  >();
  private computeInvocations = 0;
  private disposed = false;

  public constructor(binding: VerifiedObservationCacheBindingV2) {
    this.binding = Object.freeze({
      repositoryRoot: binding.repositoryRoot,
      terms: Object.freeze(binding.terms.slice()),
      limits: Object.freeze({ ...binding.limits }),
      maxMatches: binding.maxMatches,
      signal: binding.signal,
    });
  }

  public getComputeInvocationCount(): number {
    return this.computeInvocations;
  }

  /**
   * 绑定一致性检查：root/terms/limits/maxMatches/signal 必须同一实例配置。
   */
  public assertSameBinding(binding: VerifiedObservationCacheBindingV2): void {
    if (
      binding.repositoryRoot !== this.binding.repositoryRoot ||
      binding.maxMatches !== this.binding.maxMatches ||
      binding.signal !== this.binding.signal ||
      binding.limits.maxFileBytes !== this.binding.limits.maxFileBytes ||
      binding.limits.maxExcerptBytes !== this.binding.limits.maxExcerptBytes ||
      binding.limits.maxExcerptLines !== this.binding.limits.maxExcerptLines ||
      binding.terms.length !== this.binding.terms.length ||
      binding.terms.some(
        (term, index) =>
          term.value !== this.binding.terms[index]?.value ||
          term.caseSensitive !== this.binding.terms[index]?.caseSensitive,
      )
    ) {
      throw new TypeError('verified observation cache binding mismatch');
    }
  }

  public async getOrCompute(
    key: VerifiedObservationReadKeyV2,
    compute: () => Promise<VerifiedDiscoveryObservationV2>,
  ): Promise<VerifiedDiscoveryObservationV2> {
    if (this.disposed) {
      throw new TypeError('verified observation cache disposed');
    }
    const encoded = encodeVerifiedObservationReadKeyV2(key);
    let pending = this.observations.get(encoded);
    if (pending === undefined) {
      this.computeInvocations += 1;
      pending = compute();
      this.observations.set(encoded, pending);
    }
    return pending;
  }

  public dispose(): void {
    this.disposed = true;
    this.observations.clear();
  }
}
