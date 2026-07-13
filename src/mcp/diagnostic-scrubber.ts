import { redactPublicText } from '../evidence/evidence-redactor.js';

const STACK_LINE = /^\s*at\s+.*$/gimu;
const WINDOWS_ABSOLUTE_PATH = /\b[A-Z]:[\\/][^\s"']+/giu;
const POSIX_ABSOLUTE_PATH = /(^|\s)\/(?:[^\s/]+\/)+[^\s"']*/gu;

export function scrubDiagnostic(value: unknown): string {
  const source = value instanceof Error ? value.message : String(value);
  const withoutUnsafeLocation = source
    .replace(STACK_LINE, '')
    .replace(WINDOWS_ABSOLUTE_PATH, '[REDACTED_PATH]')
    .replace(
      POSIX_ABSOLUTE_PATH,
      (_match, prefix: string) => `${prefix}[REDACTED_PATH]`,
    )
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
  const redacted = redactPublicText(withoutUnsafeLocation).value;
  return redacted.length === 0 ? 'RepoNav diagnostic unavailable.' : redacted;
}

export function writeScrubbedDiagnostic(value: unknown): void {
  process.stderr.write(`${scrubDiagnostic(value)}\n`);
}
