import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type { VerifiedProducerBasisReceiptsV2 } from '../request-snapshot/producer-basis-receipts-v2.js';
import { requireScopeBoundProducerBasisV2 } from '../request-snapshot/producer-basis-receipts-v2.js';
import {
  createTrustedPreFinalScopeClassificationViewForTestV2,
  type TrustedPreFinalScopeClassificationViewV2,
} from '../request-snapshot/scope-classification-views-v2.js';

export type { TrustedPreFinalScopeClassificationViewV2 };
export { createTrustedPreFinalScopeClassificationViewForTestV2 };

export type ScopeBoundProducerOwnerV2 =
  | 'direct-classifier'
  | 'candidate-collector'
  | 'language-adapter';

export type ScopeBoundProducerChildOwnerV2 = 'language-adapter';

export type ScopeBoundProducerKindV2 =
  | 'direct-anchored'
  | 'direct-term'
  | 'anchored-definition'
  | 'anchored-reference'
  | 'verified-literal'
  | 'secondary'
  | 'derived-neighbor';

export interface ScopeBoundProducerPortFactsViewV2 {
  readonly owner: ScopeBoundProducerOwnerV2;
  readonly producerKind: ScopeBoundProducerKindV2;
  readonly producerBasis: VerifiedProducerBasisReceiptsV2;
  readonly definitionRole?: 'definition' | 'execution-site';
  readonly derivedReasonCodes?: readonly (
    | 'ALIAS_SOURCE_NEIGHBOR'
    | 'SAME_ENTITY_SIBLING'
    | 'SAME_SCOPE_SIMILAR_IDENTIFIER'
  )[];
  readonly matchedTermPresent?: boolean;
  readonly anchoredSymbol?: string;
  readonly canonicalSymbol?: string;
}

export type ScopeBoundProducerPortResolutionV2 =
  | Readonly<{ kind: 'facts'; view: ScopeBoundProducerPortFactsViewV2 }>
  | Readonly<{ kind: 'none' }>;

declare const SCOPE_BOUND_PRODUCER_REGISTRAR_V2: unique symbol;
export type ScopeBoundProducerRegistrarV2 = Readonly<object> & {
  readonly [SCOPE_BOUND_PRODUCER_REGISTRAR_V2]: never;
};

declare const REGISTERED_SCOPE_BOUND_PRODUCER_PORT_V2: unique symbol;
export type RegisteredScopeBoundProducerPortV2 = Readonly<object> & {
  readonly [REGISTERED_SCOPE_BOUND_PRODUCER_PORT_V2]: never;
};

declare const SCOPE_BOUND_PRODUCER_CHILD_PORT_ADMISSION_V2: unique symbol;
export type ScopeBoundProducerChildPortAdmissionV2 = Readonly<object> & {
  readonly [SCOPE_BOUND_PRODUCER_CHILD_PORT_ADMISSION_V2]: never;
};

declare const SCOPE_BOUND_PRODUCER_SOURCE_RECEIPT_V2: unique symbol;
export type ScopeBoundProducerSourceReceiptV2 = Readonly<object> & {
  readonly [SCOPE_BOUND_PRODUCER_SOURCE_RECEIPT_V2]: never;
};

declare const SCOPE_BOUND_PRODUCER_RECORD_SET_SEAL_V2: unique symbol;
export type ScopeBoundProducerRecordSetSealV2 = Readonly<object> & {
  readonly [SCOPE_BOUND_PRODUCER_RECORD_SET_SEAL_V2]: never;
};

declare const SCOPE_BOUND_PRODUCER_ARBITRATION_V2: unique symbol;
export type ScopeBoundProducerArbitrationV2 = Readonly<object> & {
  readonly [SCOPE_BOUND_PRODUCER_ARBITRATION_V2]: never;
};

export type ScopeBoundProducerArbitrationViewV2 =
  | Readonly<{
      kind: 'facts';
      owner: ScopeBoundProducerOwnerV2;
      producerKind: ScopeBoundProducerKindV2;
    }>
  | Readonly<{ kind: 'none' }>;

export interface ScopeBoundProducerChildResolverV2 {
  readonly owner: ScopeBoundProducerChildOwnerV2;
  resolve(
    source: unknown,
    record: EligibleDiscoveryRefV2,
    execution: LocateExecutionTokenV2,
  ): ScopeBoundProducerPortResolutionV2;
}

const KIND_PRECEDENCE: readonly ScopeBoundProducerKindV2[] = Object.freeze([
  'direct-anchored',
  'direct-term',
  'anchored-definition',
  'anchored-reference',
  'verified-literal',
  'secondary',
  'derived-neighbor',
]);

const OWNER_TIE: readonly ScopeBoundProducerOwnerV2[] = Object.freeze([
  'direct-classifier',
  'language-adapter',
  'candidate-collector',
]);

const DIRECT_KINDS = Object.freeze(
  new Set<ScopeBoundProducerKindV2>([
    'direct-anchored',
    'direct-term',
    'anchored-definition',
    'anchored-reference',
    'verified-literal',
    'secondary',
  ]),
);

interface PortPrivateV2 {
  readonly owner: ScopeBoundProducerOwnerV2;
  readonly registrar: ScopeBoundProducerRegistrarV2;
  readonly execution: LocateExecutionTokenV2;
  readonly sources: WeakMap<object, true>;
  readonly resolve: (
    source: unknown,
    record: EligibleDiscoveryRefV2,
    execution: LocateExecutionTokenV2,
  ) => ScopeBoundProducerPortResolutionV2;
}

interface RegistrarPrivateV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly ports: RegisteredScopeBoundProducerPortV2[];
  readonly portOwners: Map<RegisteredScopeBoundProducerPortV2, ScopeBoundProducerOwnerV2>;
  readonly sealedRecords: Set<EligibleDiscoveryRefV2>;
  readonly recordResolutions: Map<
    EligibleDiscoveryRefV2,
    Map<RegisteredScopeBoundProducerPortV2, ScopeBoundProducerPortResolutionV2>
  >;
  readonly childAdmissions: WeakMap<
    ScopeBoundProducerChildPortAdmissionV2,
    { owner: ScopeBoundProducerChildOwnerV2; used: boolean }
  >;
}

interface SealPrivateV2 {
  readonly registrar: ScopeBoundProducerRegistrarV2;
  readonly record: EligibleDiscoveryRefV2;
  readonly execution: LocateExecutionTokenV2;
  readonly resolutions: ReadonlyMap<
    RegisteredScopeBoundProducerPortV2,
    ScopeBoundProducerPortResolutionV2
  >;
}

interface ArbitrationPrivateV2 {
  readonly seal: ScopeBoundProducerRecordSetSealV2;
  readonly execution: LocateExecutionTokenV2;
  readonly record: EligibleDiscoveryRefV2;
  readonly view: ScopeBoundProducerArbitrationViewV2;
  readonly facts?: ScopeBoundProducerPortFactsViewV2;
  readonly basisLocationFile?: string;
  readonly basisLocationLines?: readonly [number, number];
  readonly basisSymbol?: string | undefined;
}

const registrarPrivate = new WeakMap<
  ScopeBoundProducerRegistrarV2,
  RegistrarPrivateV2
>();
const portPrivate = new WeakMap<RegisteredScopeBoundProducerPortV2, PortPrivateV2>();
const sealPrivate = new WeakMap<ScopeBoundProducerRecordSetSealV2, SealPrivateV2>();
const arbitrationPrivate = new WeakMap<
  ScopeBoundProducerArbitrationV2,
  ArbitrationPrivateV2
>();

export class ScopeProducerSourceInvariantError extends Error {
  public readonly code = 'SCOPE_PRODUCER_SOURCE_INVARIANT' as const;
  public constructor() {
    super('SCOPE_PRODUCER_SOURCE_INVARIANT');
    this.name = 'ScopeProducerSourceInvariantError';
  }
}

function requireRegistrar(
  registrar: ScopeBoundProducerRegistrarV2,
  execution: LocateExecutionTokenV2,
): RegistrarPrivateV2 {
  const record = registrarPrivate.get(registrar);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('scope producer registrar is not trusted');
  }
  return record;
}

export function createScopeBoundProducerRegistrarV2(
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerRegistrarV2 {
  const registrar = createOpaqueTokenV2<ScopeBoundProducerRegistrarV2>();
  registrarPrivate.set(
    registrar,
    {
      execution,
      ports: [],
      portOwners: new Map(),
      sealedRecords: new Set(),
      recordResolutions: new Map(),
      childAdmissions: new WeakMap(),
    },
  );
  return registrar;
}

function registerPortV2(
  registrar: ScopeBoundProducerRegistrarV2,
  owner: ScopeBoundProducerOwnerV2,
  execution: LocateExecutionTokenV2,
  resolve: PortPrivateV2['resolve'],
): RegisteredScopeBoundProducerPortV2 {
  const privateRegistrar = requireRegistrar(registrar, execution);
  for (const existing of privateRegistrar.portOwners.values()) {
    if (existing === owner) {
      throw new TypeError(`duplicate scope producer port owner: ${owner}`);
    }
  }
  const port = createOpaqueTokenV2<RegisteredScopeBoundProducerPortV2>();
  const sources = new WeakMap<object, true>();
  portPrivate.set(
    port,
    Object.freeze({
      owner,
      registrar,
      execution,
      sources,
      resolve,
    }),
  );
  privateRegistrar.ports.push(port);
  privateRegistrar.portOwners.set(port, owner);
  return port;
}

function wrapSourceResolver(
  owner: ScopeBoundProducerOwnerV2,
  allowedKinds: ReadonlySet<ScopeBoundProducerKindV2>,
): PortPrivateV2['resolve'] {
  return (source, _record, _execution) => {
    if (source === null || typeof source !== 'object') {
      throw new ScopeProducerSourceInvariantError();
    }
    const typed = source as {
      kind?: string;
      view?: ScopeBoundProducerPortFactsViewV2;
    };
    if (typed.kind === 'none') {
      return Object.freeze({ kind: 'none' as const });
    }
    if (typed.kind !== 'facts' || typed.view === undefined) {
      throw new ScopeProducerSourceInvariantError();
    }
    if (typed.view.owner !== owner) {
      throw new ScopeProducerSourceInvariantError();
    }
    if (!allowedKinds.has(typed.view.producerKind)) {
      throw new ScopeProducerSourceInvariantError();
    }
    return Object.freeze({ kind: 'facts' as const, view: typed.view });
  };
}

export function createDirectClassifierScopeProducerPortV2(
  registrar: ScopeBoundProducerRegistrarV2,
  execution: LocateExecutionTokenV2,
): RegisteredScopeBoundProducerPortV2 {
  return registerPortV2(
    registrar,
    'direct-classifier',
    execution,
    wrapSourceResolver('direct-classifier', DIRECT_KINDS),
  );
}

export function createCandidateCollectorScopeProducerPortV2(
  registrar: ScopeBoundProducerRegistrarV2,
  execution: LocateExecutionTokenV2,
): RegisteredScopeBoundProducerPortV2 {
  return registerPortV2(
    registrar,
    'candidate-collector',
    execution,
    wrapSourceResolver(
      'candidate-collector',
      new Set<ScopeBoundProducerKindV2>(['derived-neighbor']),
    ),
  );
}

export function issueScopeBoundProducerChildPortAdmissionV2(
  registrar: ScopeBoundProducerRegistrarV2,
  owner: ScopeBoundProducerChildOwnerV2,
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerChildPortAdmissionV2 {
  const privateRegistrar = requireRegistrar(registrar, execution);
  const admission = createOpaqueTokenV2<ScopeBoundProducerChildPortAdmissionV2>();
  privateRegistrar.childAdmissions.set(admission, { owner, used: false });
  return admission;
}

export function registerScopeBoundProducerChildPortV2(
  registrar: ScopeBoundProducerRegistrarV2,
  admission: ScopeBoundProducerChildPortAdmissionV2,
  resolver: ScopeBoundProducerChildResolverV2,
  execution: LocateExecutionTokenV2,
): RegisteredScopeBoundProducerPortV2 {
  const privateRegistrar = requireRegistrar(registrar, execution);
  const admissionRecord = privateRegistrar.childAdmissions.get(admission);
  if (
    admissionRecord === undefined ||
    admissionRecord.used ||
    admissionRecord.owner !== resolver.owner
  ) {
    throw new TypeError('invalid scope producer child admission');
  }
  admissionRecord.used = true;
  return registerPortV2(
    registrar,
    resolver.owner,
    execution,
    (source, record, exec) => resolver.resolve(source, record, exec),
  );
}

export function registerScopeBoundProducerSourceV2(
  registrar: ScopeBoundProducerRegistrarV2,
  source: unknown,
  producerPort: RegisteredScopeBoundProducerPortV2,
  _scopeView: TrustedPreFinalScopeClassificationViewV2,
  record: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerSourceReceiptV2 {
  const privateRegistrar = requireRegistrar(registrar, execution);
  if (privateRegistrar.sealedRecords.has(record)) {
    throw new TypeError('scope producer record set already sealed');
  }
  const port = portPrivate.get(producerPort);
  if (
    port === undefined ||
    port.registrar !== registrar ||
    port.execution !== execution
  ) {
    throw new ScopeProducerSourceInvariantError();
  }
  if (source === null || typeof source !== 'object') {
    throw new ScopeProducerSourceInvariantError();
  }
  if (port.sources.has(source as object)) {
    throw new TypeError('duplicate scope producer source for port/record');
  }
  port.sources.set(source as object, true);
  const resolution = port.resolve(source, record, execution);
  let byPort = privateRegistrar.recordResolutions.get(record);
  if (byPort === undefined) {
    byPort = new Map();
    privateRegistrar.recordResolutions.set(record, byPort);
  }
  if (byPort.has(producerPort)) {
    throw new TypeError('duplicate scope producer resolution for port/record');
  }
  byPort.set(producerPort, resolution);
  return createOpaqueTokenV2<ScopeBoundProducerSourceReceiptV2>();
}

export function sealScopeBoundProducerRecordSetV2(
  registrar: ScopeBoundProducerRegistrarV2,
  _scopeView: TrustedPreFinalScopeClassificationViewV2,
  record: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerRecordSetSealV2 {
  const privateRegistrar = requireRegistrar(registrar, execution);
  if (privateRegistrar.sealedRecords.has(record)) {
    throw new TypeError('scope producer record set already sealed');
  }
  const byPort = privateRegistrar.recordResolutions.get(record);
  if (byPort === undefined || byPort.size !== privateRegistrar.ports.length) {
    throw new TypeError('incomplete scope producer port set');
  }
  for (const port of privateRegistrar.ports) {
    if (!byPort.has(port)) {
      throw new TypeError('missing scope producer port resolution');
    }
  }
  privateRegistrar.sealedRecords.add(record);
  const seal = createOpaqueTokenV2<ScopeBoundProducerRecordSetSealV2>();
  sealPrivate.set(
    seal,
    Object.freeze({
      registrar,
      record,
      execution,
      resolutions: new Map(byPort),
    }),
  );
  return seal;
}

export function arbitrateScopeBoundEvidenceProducerV2(
  seal: ScopeBoundProducerRecordSetSealV2,
  _scopeView: TrustedPreFinalScopeClassificationViewV2,
  record: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerArbitrationV2 {
  const sealed = sealPrivate.get(seal);
  if (
    sealed === undefined ||
    sealed.execution !== execution ||
    sealed.record !== record
  ) {
    throw new TypeError('scope producer seal is not trusted');
  }

  const factsCandidates: ScopeBoundProducerPortFactsViewV2[] = [];
  for (const resolution of sealed.resolutions.values()) {
    if (resolution.kind === 'facts') {
      factsCandidates.push(resolution.view);
    }
  }

  if (factsCandidates.length === 0) {
    const arbitration = createOpaqueTokenV2<ScopeBoundProducerArbitrationV2>();
    arbitrationPrivate.set(
      arbitration,
      Object.freeze({
        seal,
        execution,
        record,
        view: Object.freeze({ kind: 'none' as const }),
      }),
    );
    return arbitration;
  }

  factsCandidates.sort((left, right) => {
    const kindDelta =
      KIND_PRECEDENCE.indexOf(left.producerKind) -
      KIND_PRECEDENCE.indexOf(right.producerKind);
    if (kindDelta !== 0) {
      return kindDelta;
    }
    return OWNER_TIE.indexOf(left.owner) - OWNER_TIE.indexOf(right.owner);
  });
  const winner = factsCandidates[0]!;
  const basis = requireScopeBoundProducerBasisV2(
    winner.producerBasis,
    execution,
  );

  const arbitration = createOpaqueTokenV2<ScopeBoundProducerArbitrationV2>();
  const privateArbitration: ArbitrationPrivateV2 = Object.freeze({
    seal,
    execution,
    record,
    view: Object.freeze({
      kind: 'facts' as const,
      owner: winner.owner,
      producerKind: winner.producerKind,
    }),
    facts: winner,
    basisLocationFile: basis.locationFile,
    basisLocationLines: basis.locationLines,
    ...(basis.symbol !== undefined ? { basisSymbol: basis.symbol } : {}),
  });
  arbitrationPrivate.set(arbitration, privateArbitration);
  return arbitration;
}

export function requireScopeBoundProducerArbitrationV2(
  arbitration: ScopeBoundProducerArbitrationV2,
  _scopeView: TrustedPreFinalScopeClassificationViewV2,
  record: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerArbitrationViewV2 {
  const privateRecord = arbitrationPrivate.get(arbitration);
  if (
    privateRecord === undefined ||
    privateRecord.execution !== execution ||
    privateRecord.record !== record
  ) {
    throw new TypeError('scope producer arbitration is not trusted');
  }
  return privateRecord.view;
}

export function readScopeBoundProducerArbitrationFactsForMaterializerV2(
  arbitration: ScopeBoundProducerArbitrationV2,
  record: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): ArbitrationPrivateV2 {
  const privateRecord = arbitrationPrivate.get(arbitration);
  if (
    privateRecord === undefined ||
    privateRecord.execution !== execution ||
    privateRecord.record !== record
  ) {
    throw new TypeError('scope producer arbitration is not trusted');
  }
  return privateRecord;
}

