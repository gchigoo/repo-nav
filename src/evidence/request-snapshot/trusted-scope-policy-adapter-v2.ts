import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type {
  RepositoryScopeDecisionV1,
  RepositoryScopePolicyV1,
  VerifiedScopePolicyPathViewV2,
} from '../scope/repository-scope-policy-v1.js';
import type { ResolvedRepositoryScopeV1 } from '../scope/resolve-repository-scope-v1.js';
import {
  readDiscoveryLocatorPosixPathV2,
  type DiscoveryLocatorRefV2,
  type PreCapPublicSafeDiscoveryPoolV2,
} from './discovery-lane-universe-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import type {
  ScopeEligibilityDecisionV2,
  ScopeFoldCandidateDecisionV2,
} from './scope-folded-discovery-selector-v2.js';

declare const TRUSTED_SCOPE_POLICY_ADAPTER_V2: unique symbol;
export type TrustedScopePolicyAdapterV2 = Readonly<object> & {
  readonly [TRUSTED_SCOPE_POLICY_ADAPTER_V2]: never;
};

declare const TRUSTED_SCOPE_ELIGIBILITY_OBSERVATION_V2: unique symbol;
export type TrustedScopeEligibilityObservationV2 = Readonly<object> & {
  readonly [TRUSTED_SCOPE_ELIGIBILITY_OBSERVATION_V2]: never;
};

export type ScopePolicyAdapterCallbackV2 = (
  path: VerifiedScopePolicyPathViewV2,
  scope: ResolvedRepositoryScopeV1,
) => RepositoryScopeDecisionV1;

interface AdapterPrivateV2 {
  readonly policyVersion: 'repo-scope-v1';
  readonly callback: ScopePolicyAdapterCallbackV2;
  readonly execution: LocateExecutionTokenV2;
}

interface ObservationPrivateV2 {
  readonly adapter: TrustedScopePolicyAdapterV2;
  readonly execution: LocateExecutionTokenV2;
  readonly resolvedScope: ResolvedRepositoryScopeV1;
  readonly preCapPool: PreCapPublicSafeDiscoveryPoolV2;
  readonly decisions: readonly ScopeFoldCandidateDecisionV2[];
  readonly decisionByRef: ReadonlyMap<
    DiscoveryLocatorRefV2,
    ScopeEligibilityDecisionV2
  >;
}

const adapterPrivate = new WeakMap<
  TrustedScopePolicyAdapterV2,
  AdapterPrivateV2
>();
const observationPrivate = new WeakMap<
  TrustedScopeEligibilityObservationV2,
  ObservationPrivateV2
>();

/**
 * F3 唯一 trust authority：登记 path-only callback，签发无 own-property adapter token。
 */
export function registerTrustedScopePolicyAdapterV2(
  policyVersion: 'repo-scope-v1',
  callback: ScopePolicyAdapterCallbackV2,
  execution: LocateExecutionTokenV2,
): TrustedScopePolicyAdapterV2 {
  if (policyVersion !== 'repo-scope-v1') {
    throw new TypeError('unsupported scope policy version');
  }
  const adapter = createOpaqueTokenV2<TrustedScopePolicyAdapterV2>();
  adapterPrivate.set(
    adapter,
    Object.freeze({
      policyVersion,
      callback,
      execution,
    }),
  );
  return adapter;
}

/**
 * F7 包装：把 pure policy 登记为 F3 trusted adapter。
 */
export function createTrustedRepositoryScopePolicyAdapterV1(
  policy: RepositoryScopePolicyV1,
  execution: LocateExecutionTokenV2,
): TrustedScopePolicyAdapterV2 {
  return registerTrustedScopePolicyAdapterV2(
    'repo-scope-v1',
    (path, scope) => policy.decide(path, scope),
    execution,
  );
}

function pathViewFromLocatorV2(
  locatorRef: DiscoveryLocatorRefV2,
): VerifiedScopePolicyPathViewV2 {
  const posixPath = readDiscoveryLocatorPosixPathV2(locatorRef);
  const segments = Object.freeze(posixPath.split('/'));
  return Object.freeze({
    posixSegments: segments,
    basename: segments.at(-1) ?? '',
  });
}

function toEligibilityDecisionV2(
  decision: RepositoryScopeDecisionV1,
): ScopeEligibilityDecisionV2 {
  return Object.freeze({
    layer: decision.layer,
    included: decision.included,
    confirmation: decision.confirmation,
  });
}

/**
 * 按 unique interned locator 调用 callback 一次，向 pre-cap identities fan-out。
 */
export function observeTrustedScopeEligibilityV2(input: {
  readonly adapter: TrustedScopePolicyAdapterV2;
  readonly preCapPool: PreCapPublicSafeDiscoveryPoolV2;
  readonly resolvedScope: ResolvedRepositoryScopeV1;
  readonly execution: LocateExecutionTokenV2;
}): TrustedScopeEligibilityObservationV2 {
  const adapterRecord = adapterPrivate.get(input.adapter);
  if (
    adapterRecord === undefined ||
    adapterRecord.execution !== input.execution
  ) {
    throw new TypeError('scope policy adapter is not trusted');
  }

  const uniqueRefs = new Map<DiscoveryLocatorRefV2, VerifiedScopePolicyPathViewV2>();
  for (const candidate of input.preCapPool.candidates) {
    if (!uniqueRefs.has(candidate.locatorRef)) {
      uniqueRefs.set(
        candidate.locatorRef,
        pathViewFromLocatorV2(candidate.locatorRef),
      );
    }
  }

  const decisionByRef = new Map<
    DiscoveryLocatorRefV2,
    ScopeEligibilityDecisionV2
  >();
  for (const [locatorRef, pathView] of uniqueRefs) {
    const decision = adapterRecord.callback(pathView, input.resolvedScope);
    if (
      typeof decision.layer !== 'string' ||
      typeof decision.included !== 'boolean' ||
      (decision.confirmation !== 'allowed' &&
        decision.confirmation !== 'candidate-only' &&
        decision.confirmation !== 'excluded')
    ) {
      throw new TypeError('scope policy callback returned invalid decision');
    }
    decisionByRef.set(locatorRef, toEligibilityDecisionV2(decision));
  }

  const decisions = Object.freeze(
    input.preCapPool.candidates.map((candidate) => {
      const decision = decisionByRef.get(candidate.locatorRef);
      if (decision === undefined) {
        throw new TypeError('missing fan-out scope decision');
      }
      return Object.freeze({
        locatorRef: candidate.locatorRef,
        decision,
      });
    }),
  );

  const observation = createOpaqueTokenV2<TrustedScopeEligibilityObservationV2>();
  observationPrivate.set(
    observation,
    Object.freeze({
      adapter: input.adapter,
      execution: input.execution,
      resolvedScope: input.resolvedScope,
      preCapPool: input.preCapPool,
      decisions,
      decisionByRef,
    }),
  );
  return observation;
}

export function requireTrustedScopeEligibilityObservationV2(
  observation: TrustedScopeEligibilityObservationV2,
  expectedExecution: LocateExecutionTokenV2,
): {
  readonly decisions: readonly ScopeFoldCandidateDecisionV2[];
  readonly resolvedScope: ResolvedRepositoryScopeV1;
  readonly preCapPool: PreCapPublicSafeDiscoveryPoolV2;
} {
  const record = observationPrivate.get(observation);
  if (record === undefined || record.execution !== expectedExecution) {
    throw new TypeError('scope eligibility observation is not trusted');
  }
  return Object.freeze({
    decisions: record.decisions,
    resolvedScope: record.resolvedScope,
    preCapPool: record.preCapPool,
  });
}

export function readObservedScopeDecisionV2(
  observation: TrustedScopeEligibilityObservationV2,
  locatorRef: DiscoveryLocatorRefV2,
  execution: LocateExecutionTokenV2,
): ScopeEligibilityDecisionV2 {
  const record = observationPrivate.get(observation);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('scope eligibility observation is not trusted');
  }
  const decision = record.decisionByRef.get(locatorRef);
  if (decision === undefined) {
    throw new TypeError('locator is not part of scope observation');
  }
  return decision;
}
