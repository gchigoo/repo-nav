import {
  type LocateAnchor,
  type RepoLayer,
  type TermCaseMode,
} from '../contracts/index.js';

export const CLI_HELP = `repo-nav debug <command> [options]

Commands:
  locate  Run the production repository evidence service
  probe   Probe configured repository search backends

Use "repo-nav debug <command> --help" for command details.
Golden regression runs via source-checkout npm run test:golden only.`;

const LOCATE_HELP = `repo-nav debug locate --repo <path> --term <term> [options]
  --request <json>              Supply the complete locate request as JSON
  --question <text>             Optional display-only question (does not affect search plan)
  --term <term>                 Repeatable search term
  --anchor <kind:value>         Repeatable file, symbol, route, table, or config anchor
                                (file anchors reject backslashes; POSIX relative only)
  --layer <layer>               Repeatable server, client, docs, tests, config, or any layer
  --negative-term <term>        Repeatable exclusion term
  --term-case <mode>            smart, sensitive, or insensitive
  --max-files <n> --max-confirmed <n> --max-candidates <n> --timeout-ms <n>`;
const PROBE_HELP = 'repo-nav debug probe --repo <path>';

export class CliUsageError extends Error {}

export type ParsedCliCommand =
  | { readonly kind: 'help'; readonly text: string }
  | { readonly kind: 'version' }
  | { readonly kind: 'locate'; readonly rawRequest: unknown }
  | { readonly kind: 'probe'; readonly repoPath: string };

interface ParsedFlags {
  readonly values: ReadonlyMap<string, readonly string[]>;
}

function parseFlags(
  args: readonly string[],
  repeatable: ReadonlySet<string>,
): ParsedFlags {
  const values = new Map<string, string[]>();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === undefined || !flag.startsWith('--')) {
      throw new CliUsageError(`Unexpected argument: ${flag ?? '<missing>'}.`);
    }
    if (value === undefined || value.startsWith('--')) {
      throw new CliUsageError(`Missing value for ${flag}.`);
    }
    if (values.has(flag) && !repeatable.has(flag)) {
      throw new CliUsageError(`${flag} may only be specified once.`);
    }
    const existing = values.get(flag) ?? [];
    values.set(flag, [...existing, value]);
    index += 1;
  }
  return { values };
}

function one(flags: ParsedFlags, name: string): string | undefined {
  return flags.values.get(name)?.[0];
}

function required(flags: ParsedFlags, name: string): string {
  const value = one(flags, name);
  if (value === undefined) {
    throw new CliUsageError(`Missing required option ${name}.`);
  }
  return value;
}

function integer(flags: ParsedFlags, name: string): number | undefined {
  const raw = one(flags, name);
  if (raw === undefined) return undefined;
  if (!/^\d+$/u.test(raw)) {
    throw new CliUsageError(`${name} must be an integer.`);
  }
  return Number(raw);
}

function parseAnchor(value: string): LocateAnchor {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) {
    throw new CliUsageError('--anchor must use kind:value syntax.');
  }
  return {
    kind: value.slice(0, separator) as LocateAnchor['kind'],
    value: value.slice(separator + 1),
  };
}

function parseLocate(args: readonly string[]): ParsedCliCommand {
  if (args.includes('--help')) return { kind: 'help', text: LOCATE_HELP };
  const allowed = new Set([
    '--request',
    '--repo',
    '--question',
    '--term',
    '--anchor',
    '--layer',
    '--negative-term',
    '--term-case',
    '--max-files',
    '--max-confirmed',
    '--max-candidates',
    '--timeout-ms',
  ]);
  const flags = parseFlags(
    args,
    new Set(['--term', '--anchor', '--layer', '--negative-term']),
  );
  for (const flag of flags.values.keys()) {
    if (!allowed.has(flag)) {
      throw new CliUsageError(`Unknown locate option: ${flag}.`);
    }
  }
  let raw: unknown;
  const requestJson = one(flags, '--request');
  if (requestJson !== undefined) {
    if (flags.values.size !== 1) {
      throw new CliUsageError(
        '--request cannot be combined with other options.',
      );
    }
    try {
      raw = JSON.parse(requestJson) as unknown;
    } catch {
      throw new CliUsageError('--request must contain valid JSON.');
    }
  } else {
    const limits = {
      maxFiles: integer(flags, '--max-files'),
      maxConfirmed: integer(flags, '--max-confirmed'),
      maxCandidates: integer(flags, '--max-candidates'),
      timeoutMs: integer(flags, '--timeout-ms'),
    };
    const question = one(flags, '--question');
    raw = {
      repoPath: required(flags, '--repo'),
      ...(question === undefined ? {} : { question }),
      terms: flags.values.get('--term') ?? [],
      ...(one(flags, '--term-case') === undefined
        ? {}
        : { termCase: one(flags, '--term-case') as TermCaseMode }),
      ...(flags.values.has('--anchor')
        ? { anchors: flags.values.get('--anchor')?.map(parseAnchor) }
        : {}),
      ...(flags.values.has('--layer')
        ? { layers: flags.values.get('--layer') as readonly RepoLayer[] }
        : {}),
      ...(flags.values.has('--negative-term')
        ? { negativeTerms: flags.values.get('--negative-term') }
        : {}),
      ...(Object.values(limits).every((value) => value === undefined)
        ? {}
        : {
            limits: Object.fromEntries(
              Object.entries(limits).filter(([, value]) => value !== undefined),
            ),
          }),
    };
  }
  // Schema validation is owned by PublicLocateExecutionApplicationV2 (v2 INVALID_INPUT).
  return { kind: 'locate', rawRequest: raw };
}

/**
 * Parse production debug CLI argv (no public Golden command).
 */
export function parseCliArguments(args: readonly string[]): ParsedCliCommand {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return { kind: 'help', text: CLI_HELP };
  }
  if (args[0] === '--version' || args[0] === '-v') {
    return { kind: 'version' };
  }
  if (args[0] !== 'debug') {
    throw new CliUsageError('Expected the debug command.');
  }
  const command = args[1];
  const tail = args.slice(2);
  if (command === undefined || command === '--help') {
    return { kind: 'help', text: CLI_HELP };
  }
  if (command === 'locate') return parseLocate(tail);
  if (command === 'probe') {
    if (tail.includes('--help')) return { kind: 'help', text: PROBE_HELP };
    const flags = parseFlags(tail, new Set());
    for (const flag of flags.values.keys()) {
      if (flag !== '--repo') {
        throw new CliUsageError(`Unknown probe option: ${flag}.`);
      }
    }
    return { kind: 'probe', repoPath: required(flags, '--repo') };
  }
  if (command === 'golden') {
    throw new CliUsageError(
      'debug golden was removed from the installed CLI; use npm run test:golden in a source checkout.',
    );
  }
  throw new CliUsageError(`Unknown debug command: ${command}.`);
}
