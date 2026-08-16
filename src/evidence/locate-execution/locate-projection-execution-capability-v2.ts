/**
 * Request-local projection capabilities and opaque canonical receipt authority.
 */

import type {
  CanonicalLocateExecutionReceiptV2,
  CanonicalLocateExecutionV2,
} from '../../contracts/v2/canonical-locate-execution-v2.js';
import type {
  CanonicalLocateExecutionAuthorityV2,
  LocateExecutionTokenV2,
  LocateProjectionExecutionCapabilityV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';

export type {
  CanonicalLocateExecutionAuthorityV2,
  LocateExecutionTokenV2,
  LocateProjectionExecutionCapabilityV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';

interface RegisteredCanonicalAuthorityBindingV2 {
  readonly capability: LocateProjectionExecutionCapabilityV2;
  readonly token: LocateExecutionTokenV2;
  readonly input: CanonicalLocateExecutionV2;
}

const capabilityToToken = new WeakMap<
  LocateProjectionExecutionCapabilityV2,
  LocateExecutionTokenV2
>();
const capabilityToAuthority = new WeakMap<
  LocateProjectionExecutionCapabilityV2,
  CanonicalLocateExecutionAuthorityV2
>();
const authorityToBinding = new WeakMap<
  CanonicalLocateExecutionAuthorityV2,
  RegisteredCanonicalAuthorityBindingV2
>();

function createOpaqueBrand(): object {
  return Object.freeze(Object.create(null) as object);
}

/** Issue one request-local capability bound to a fresh execution token. */
export function issueLocateProjectionExecutionCapabilityV2(): LocateProjectionExecutionCapabilityV2 {
  const capability =
    createOpaqueBrand() as LocateProjectionExecutionCapabilityV2;
  const token = createOpaqueBrand() as LocateExecutionTokenV2;
  capabilityToToken.set(capability, token);
  return capability;
}

/** Resolve the issuer-bound internal token before execution owner work. */
export function requireLocateProjectionExecutionTokenV2(
  projectionExecution: LocateProjectionExecutionCapabilityV2,
): LocateExecutionTokenV2 {
  const token = capabilityToToken.get(projectionExecution);
  if (token === undefined) {
    throw new Error('Locate projection capability is not issuer-bound.');
  }
  return token;
}

/** Create the single opaque receipt authority for one terminal canonical input. */
export function createCanonicalLocateExecutionReceiptV2(
  input: CanonicalLocateExecutionV2,
  projectionExecution: LocateProjectionExecutionCapabilityV2,
  execution: LocateExecutionTokenV2,
): CanonicalLocateExecutionReceiptV2 {
  const expected = capabilityToToken.get(projectionExecution);
  if (expected === undefined || expected !== execution) {
    throw new Error('Canonical execution receipt capability/token mismatch.');
  }
  if (capabilityToAuthority.has(projectionExecution)) {
    throw new Error('Canonical execution receipt was already issued.');
  }
  const authority = createOpaqueBrand() as CanonicalLocateExecutionAuthorityV2;
  capabilityToAuthority.set(projectionExecution, authority);
  authorityToBinding.set(
    authority,
    Object.freeze({
      capability: projectionExecution,
      token: execution,
      input,
    }),
  );
  return Object.freeze({ input, authority });
}

/** Recover trusted canonical data from the opaque receipt authority. */
export function requireCanonicalLocateExecutionInputV2(
  receipt: CanonicalLocateExecutionReceiptV2,
  projectionExecution: LocateProjectionExecutionCapabilityV2,
): CanonicalLocateExecutionV2 {
  const binding = authorityToBinding.get(receipt.authority);
  if (binding === undefined) {
    throw new Error('Canonical execution authority is not registered.');
  }
  if (binding.capability !== projectionExecution) {
    throw new Error(
      'Canonical execution capability does not match receipt authority.',
    );
  }
  const issued = capabilityToToken.get(projectionExecution);
  if (issued === undefined || issued !== binding.token) {
    throw new Error('Canonical execution token does not match issuer binding.');
  }
  return binding.input;
}
