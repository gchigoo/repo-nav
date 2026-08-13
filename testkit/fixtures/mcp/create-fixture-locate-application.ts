/**
 * Wrap a fixture RepositoryEvidenceService as the post-F9 public locate application.
 */

import type {
  LocateExecutionContext,
  RepositoryEvidenceService,
} from '../../../src/contracts/index.js';
import { safeParseLocateRequestV2 } from '../../../src/contracts/locate-request-parse-v2.js';
import {
  LocateResultV2Schema,
  type LocateResultV2,
  type RepoNavToolErrorV2,
} from '../../../src/contracts/v2/locate-result-v2.js';
import { createTrustedSerializedPublicToolErrorV2 } from '../../../src/evidence/canonical/trusted-serialized-locate-result-v2.js';
import type { PublicLocateExecutionApplicationV2 } from '../../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  promoteTrustedSerializedPublicToolErrorV2,
  requirePublicLocateTransportValueV2,
  type PublicLocateTransportViewV2,
} from '../../../src/evidence/locate-execution/public-locate-transport-registry-v2.js';

function suggestsAddTerm(rawRequest: unknown): boolean {
  if (typeof rawRequest !== 'object' || rawRequest === null) {
    return false;
  }
  const terms = Reflect.get(rawRequest, 'terms');
  return terms === undefined || (Array.isArray(terms) && terms.length === 0);
}

function transportErrorView(
  code: RepoNavToolErrorV2['code'],
  suggestedAction: 'ADD_TERM' | undefined,
): PublicLocateTransportViewV2 {
  const capability = issueLocateProjectionExecutionCapabilityV2();
  const serialized = createTrustedSerializedPublicToolErrorV2(
    code,
    suggestedAction,
    capability,
  );
  const bundle = promoteTrustedSerializedPublicToolErrorV2(
    serialized,
    capability,
  );
  return requirePublicLocateTransportValueV2(
    bundle.value,
    bundle.receipt,
    capability,
  );
}

function transportSuccessView(
  value: LocateResultV2,
): PublicLocateTransportViewV2 {
  const parsed = LocateResultV2Schema.parse(value);
  const compactJson = JSON.stringify(parsed);
  return Object.freeze({
    value: parsed,
    compactJson,
    utf8Bytes: Buffer.byteLength(compactJson, 'utf8'),
  });
}

/**
 * Map fixture locate results onto the public transport view seam used by MCP host.
 */
export function createFixtureLocateApplication(
  service: RepositoryEvidenceService,
): PublicLocateExecutionApplicationV2 {
  return {
    async execute(
      rawRequest: unknown,
      context: LocateExecutionContext,
    ): Promise<PublicLocateTransportViewV2> {
      const parsed = safeParseLocateRequestV2(rawRequest);
      if (!parsed.success) {
        return transportErrorView(
          'INVALID_INPUT',
          suggestsAddTerm(rawRequest) ? 'ADD_TERM' : undefined,
        );
      }
      try {
        const value = await service.locate(parsed.data, context);
        if (!value.ok) {
          return transportErrorView(value.error.code, undefined);
        }
        return transportSuccessView(value);
      } catch {
        return transportErrorView('INTERNAL_ERROR', undefined);
      }
    },
  };
}
