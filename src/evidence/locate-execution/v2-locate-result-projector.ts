/**
 * Production v2 locate result projector.
 * Injects F8 ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2 ready singleton only.
 */

import { Inject, Injectable } from '@nestjs/common';

import type {
  CanonicalLocateExecutionV2,
  LocateProjectionExecutionCapabilityV2,
  LocateResultProjector,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2,
  requireAcceptedCompleteRealLocateShadowV2,
  type AcceptedCompleteRealLocateShadowOrchestratorV2,
} from '../canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import { createTrustedSerializedPublicToolErrorV2 } from '../canonical/trusted-serialized-locate-result-v2.js';
import {
  promoteAcceptedCompleteRealLocateShadowV2,
  promoteTrustedSerializedPublicToolErrorV2,
  type TrustedPublicLocateTransportBundleV2,
} from './public-locate-transport-registry-v2.js';

@Injectable()
export class V2LocateResultProjector implements LocateResultProjector<TrustedPublicLocateTransportBundleV2> {
  public constructor(
    @Inject(ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2)
    private readonly orchestrator: AcceptedCompleteRealLocateShadowOrchestratorV2,
  ) {}

  /**
   * Project canonical execution to a trusted public transport receipt bundle.
   */
  public project(
    input: CanonicalLocateExecutionV2,
    execution: LocateProjectionExecutionCapabilityV2,
  ): TrustedPublicLocateTransportBundleV2 {
    if (!input.ok) {
      const serialized = createTrustedSerializedPublicToolErrorV2(
        input.error.code,
        input.error.suggestedAction === 'ADD_TERM' ? 'ADD_TERM' : undefined,
        execution,
      );
      return promoteTrustedSerializedPublicToolErrorV2(serialized, execution);
    }

    const attempt = this.orchestrator.projectAcceptedExecution(
      input,
      execution,
    );
    if (!attempt.ok) {
      const serialized = createTrustedSerializedPublicToolErrorV2(
        'INTERNAL_ERROR',
        undefined,
        execution,
      );
      return promoteTrustedSerializedPublicToolErrorV2(serialized, execution);
    }

    const accepted = requireAcceptedCompleteRealLocateShadowV2(
      attempt.accepted,
      input,
      execution,
    );
    return promoteAcceptedCompleteRealLocateShadowV2(
      accepted,
      input,
      execution,
    );
  }
}
