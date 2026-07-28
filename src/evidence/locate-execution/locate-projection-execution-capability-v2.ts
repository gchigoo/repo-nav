/**
 * F1C request-local projection capability and internal execution token registry.
 * Issuer binds capability↔token; executor registers exact terminal input↔capability+token.
 */

import type {
  LocateExecutionTokenV2,
  LocateProjectionExecutionCapabilityV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';

export type {
  LocateExecutionTokenV2,
  LocateProjectionExecutionCapabilityV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';

interface RegisteredCanonicalInputBindingV2 {
  readonly capability: LocateProjectionExecutionCapabilityV2;
  readonly token: LocateExecutionTokenV2;
}

const capabilityToToken = new WeakMap<
  LocateProjectionExecutionCapabilityV2,
  LocateExecutionTokenV2
>();
const inputToBinding = new WeakMap<object, RegisteredCanonicalInputBindingV2>();

function createOpaqueBrand(): object {
  return Object.freeze(Object.create(null) as object);
}

/**
 * Issue one request-local capability bound to a fresh internal execution token.
 */
export function issueLocateProjectionExecutionCapabilityV2(): LocateProjectionExecutionCapabilityV2 {
  const capability =
    createOpaqueBrand() as LocateProjectionExecutionCapabilityV2;
  const token = createOpaqueBrand() as LocateExecutionTokenV2;
  capabilityToToken.set(capability, token);
  return capability;
}

/**
 * Resolve the issuer-bound internal token for a capability before owner work.
 */
export function requireLocateProjectionExecutionTokenV2(
  projectionExecution: LocateProjectionExecutionCapabilityV2,
): LocateExecutionTokenV2 {
  const token = capabilityToToken.get(projectionExecution);
  if (token === undefined) {
    throw new Error('Locate projection capability is not issuer-bound.');
  }
  return token;
}

/**
 * Atomically register exact terminal canonical input with capability and token.
 */
export function registerCanonicalLocateExecutionInputV2(
  input: object,
  projectionExecution: LocateProjectionExecutionCapabilityV2,
  execution: LocateExecutionTokenV2,
): void {
  const expected = capabilityToToken.get(projectionExecution);
  if (expected === undefined || expected !== execution) {
    throw new Error('Canonical execution registration capability/token mismatch.');
  }
  if (inputToBinding.has(input)) {
    throw new Error('Canonical execution input was already registered.');
  }
  inputToBinding.set(
    input,
    Object.freeze({ capability: projectionExecution, token: execution }),
  );
}

/**
 * Recover the same internal token for exact input + capability before any facts expose.
 */
export function requireCanonicalLocateExecutionTokenV2(
  input: object,
  projectionExecution: LocateProjectionExecutionCapabilityV2,
): LocateExecutionTokenV2 {
  const binding = inputToBinding.get(input);
  if (binding === undefined) {
    throw new Error('Canonical execution input is not registered.');
  }
  if (binding.capability !== projectionExecution) {
    throw new Error(
      'Canonical execution capability does not match registered input.',
    );
  }
  const issued = capabilityToToken.get(projectionExecution);
  if (issued === undefined || issued !== binding.token) {
    throw new Error('Canonical execution token does not match issuer binding.');
  }
  return binding.token;
}
