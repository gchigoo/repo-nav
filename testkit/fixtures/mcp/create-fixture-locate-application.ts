import type {
  LocateExecutionContext,
  RepositoryEvidenceService,
} from '../../../src/contracts/index.js';
import { safeParseLocateRequestV2 } from '../../../src/contracts/locate-request-parse-v2.js';
import type { SerializedLocateResultV2 } from '../../../src/contracts/v2/canonical-locate-execution-v2.js';
import {
  LocateResultV2Schema,
  type LocateResultV2,
  type RepoNavToolErrorV2,
} from '../../../src/contracts/v2/locate-result-v2.js';
import { finalizeLocateResultV2 } from '../../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import type { PublicLocateExecutionApplicationV2 } from '../../../src/evidence/locate-execution/public-locate-execution-application-v2.js';

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
): SerializedLocateResultV2 {
  return finalizeLocateResultV2({
    ok: false,
    error: {
      code,
      ...(suggestedAction === undefined ? {} : { suggestedAction }),
    },
  });
}

function transportSuccessView(value: LocateResultV2): SerializedLocateResultV2 {
  const parsed = LocateResultV2Schema.parse(value);
  const compactJson = JSON.stringify(parsed);
  return Object.freeze({
    value: parsed,
    compactJson,
    utf8Bytes: Buffer.byteLength(compactJson, 'utf8'),
  });
}

export function createFixtureLocateApplication(
  service: RepositoryEvidenceService,
): PublicLocateExecutionApplicationV2 {
  return {
    async execute(
      rawRequest: unknown,
      context: LocateExecutionContext,
    ): Promise<SerializedLocateResultV2> {
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
