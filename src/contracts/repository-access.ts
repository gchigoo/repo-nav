import { z } from 'zod';

export const REPOSITORY_ACCESS_ERROR_CODES = [
  'INVALID_REPOSITORY',
  'PATH_OUTSIDE_ROOT',
  'INVALID_RELATIVE_PATH',
  'NOT_REGULAR_FILE',
  'FILE_UNREADABLE',
  'BINARY_FILE',
  'INVALID_LINE_RANGE',
  'MAX_FILE_BYTES_REACHED',
  'MAX_EXCERPT_BYTES_REACHED',
  'ABORTED',
] as const;

export const RepositoryAccessErrorCodeSchema = z.enum(
  REPOSITORY_ACCESS_ERROR_CODES,
);
export type RepositoryAccessErrorCode = z.infer<
  typeof RepositoryAccessErrorCodeSchema
>;

const ERROR_MESSAGES: Readonly<Record<RepositoryAccessErrorCode, string>> =
  Object.freeze({
    INVALID_REPOSITORY: 'Repository root is unavailable.',
    PATH_OUTSIDE_ROOT: 'Repository path leaves the resolved root.',
    INVALID_RELATIVE_PATH: 'Repository path must be normalized and relative.',
    NOT_REGULAR_FILE: 'Repository path is not a regular file.',
    FILE_UNREADABLE: 'Repository file cannot be read.',
    BINARY_FILE: 'Repository file is not supported text content.',
    INVALID_LINE_RANGE: 'Requested line range is invalid.',
    MAX_FILE_BYTES_REACHED: 'Repository file exceeds the configured limit.',
    MAX_EXCERPT_BYTES_REACHED:
      'Repository excerpt exceeds the configured limit.',
    ABORTED: 'Repository access was aborted.',
  });

export class RepositoryAccessError extends Error {
  public constructor(
    public readonly code: RepositoryAccessErrorCode,
    public readonly relativeFile?: string,
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = 'RepositoryAccessError';
  }
}
