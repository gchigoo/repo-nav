import type {
  LocateResult,
  NextActionCode,
  RepoNavToolError,
} from './evidence.js';

export const SAFE_PUBLIC_ERROR_MESSAGES: Readonly<
  Record<RepoNavToolError['code'], string>
> = Object.freeze({
  INVALID_INPUT: 'Locate request does not match the required schema.',
  INVALID_REPOSITORY: 'Repository root is invalid or unavailable.',
  PATH_OUTSIDE_ROOT: 'Repository path is outside the configured root.',
  INTERNAL_ERROR: 'Repository evidence request failed.',
});

const ERROR_RECOVERABILITY: Readonly<
  Record<RepoNavToolError['code'], boolean>
> = Object.freeze({
  INVALID_INPUT: true,
  INVALID_REPOSITORY: true,
  PATH_OUTSIDE_ROOT: false,
  INTERNAL_ERROR: false,
});

export function createPublicToolError(
  code: RepoNavToolError['code'],
  suggestedAction?: NextActionCode,
): RepoNavToolError {
  const approvedAction =
    code === 'INVALID_INPUT' && suggestedAction === 'ADD_TERM'
      ? suggestedAction
      : undefined;
  return Object.freeze({
    code,
    message: SAFE_PUBLIC_ERROR_MESSAGES[code],
    recoverable: ERROR_RECOVERABILITY[code],
    ...(approvedAction === undefined ? {} : { suggestedAction: approvedAction }),
  });
}

export function createPublicErrorResult(
  code: RepoNavToolError['code'],
  suggestedAction?: NextActionCode,
): LocateResult {
  return Object.freeze({
    ok: false,
    error: createPublicToolError(code, suggestedAction),
  });
}

export function applyPublicErrorPolicy(result: LocateResult): LocateResult {
  if (result.ok) {
    return result;
  }
  return createPublicErrorResult(result.error.code, result.error.suggestedAction);
}
