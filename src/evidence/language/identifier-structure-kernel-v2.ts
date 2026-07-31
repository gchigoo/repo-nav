/**
 * Consumer-neutral identifier token + balanced structure predicates（F8 S1）。
 * 行为与 legacy candidate-policy deep-exact。
 */

export const IDENTIFIER_PATTERN =
  /(?:[$_]|\p{ID_Start})(?:[$_\u200C\u200D]|\p{ID_Continue})*/gu;

export const LEXICAL_KEYWORDS_V2 = Object.freeze(
  new Set([
    'as',
    'bigint',
    'boolean',
    'class',
    'const',
    'create',
    'export',
    'extends',
    'false',
    'from',
    'function',
    'import',
    'interface',
    'number',
    'let',
    'new',
    'null',
    'return',
    'select',
    'table',
    'string',
    'true',
    'type',
    'undefined',
    'unknown',
    'var',
    'void',
  ]),
);

export interface IdentifierTokenV2 {
  readonly value: string;
  readonly normalizedValue: string;
  readonly start: number;
  readonly end: number;
  readonly line: number;
}

export interface BalancedRangeV2 {
  readonly start: number;
  readonly end: number;
  readonly kind: 'brace' | 'paren' | 'bracket';
  readonly containerKind:
    'scope' | 'object' | 'declaration' | 'sql-table' | 'paren' | 'bracket';
}

export interface BalancedStructureV2 {
  readonly ranges: readonly BalancedRangeV2[];
  readonly complete: boolean;
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

export function identifierTokensV2(
  masked: string,
  firstLine: number,
): readonly IdentifierTokenV2[] {
  return Object.freeze(
    Array.from(masked.matchAll(IDENTIFIER_PATTERN)).flatMap((match) => {
      if (match.index === undefined) {
        return [];
      }
      const value = match[0];
      const normalizedValue = value.normalize('NFKC').toLocaleLowerCase('und');
      if (LEXICAL_KEYWORDS_V2.has(normalizedValue)) {
        return [];
      }
      const line =
        firstLine + (masked.slice(0, match.index).match(/\n/gu)?.length ?? 0);
      return [
        {
          value,
          normalizedValue,
          start: match.index,
          end: match.index + value.length,
          line,
        },
      ];
    }),
  );
}

export function balancedStructureV2(masked: string): BalancedStructureV2 {
  const ranges: BalancedRangeV2[] = [];
  const stack: {
    readonly delimiter: '{' | '(' | '[';
    readonly start: number;
  }[] = [];
  let complete = true;
  for (let index = 0; index < masked.length; index += 1) {
    const character = masked[index];
    if (character === '{' || character === '(' || character === '[') {
      stack.push({ delimiter: character, start: index });
      continue;
    }
    if (character !== '}' && character !== ')' && character !== ']') {
      continue;
    }
    const expected = character === '}' ? '{' : character === ')' ? '(' : '[';
    const opened = stack.at(-1);
    if (opened?.delimiter !== expected) {
      complete = false;
      continue;
    }
    stack.pop();
    const prefix = masked.slice(0, opened.start).trimEnd();
    if (expected === '{') {
      const declaration =
        /\b(?:class|interface)\s+[$_\p{ID_Start}][^{};]*$/iu.test(prefix) ||
        /\btype\s+[$_\p{ID_Start}][^{};=]*=\s*$/iu.test(prefix) ||
        /\b(?:as|satisfies)\s*$/iu.test(prefix) ||
        (/:\s*$/u.test(prefix) &&
          /^\s*(?:=|;|\||&|>|\]|\)|\}|\{)/u.test(masked.slice(index + 1)));
      const object =
        !declaration &&
        (/\breturn$/iu.test(prefix) || /[=(:,]\s*$/u.test(prefix));
      ranges.push({
        start: opened.start,
        end: index + 1,
        kind: 'brace',
        containerKind: declaration
          ? 'declaration'
          : object
            ? 'object'
            : 'scope',
      });
    } else if (expected === '(') {
      ranges.push({
        start: opened.start,
        end: index + 1,
        kind: 'paren',
        containerKind: /\bCREATE\s+TABLE\b[^;()]*$/iu.test(
          masked.slice(0, opened.start),
        )
          ? 'sql-table'
          : 'paren',
      });
    } else {
      ranges.push({
        start: opened.start,
        end: index + 1,
        kind: 'bracket',
        containerKind: 'bracket',
      });
    }
  }
  if (stack.length > 0) {
    complete = false;
  }
  return Object.freeze({
    ranges: Object.freeze(
      ranges.sort(
        (left, right) =>
          left.start - right.start ||
          left.end - right.end ||
          compareText(left.kind, right.kind),
      ),
    ),
    complete,
  });
}

export function identifierSegmentsV2(value: string): readonly string[] {
  const separated = value
    .normalize('NFKC')
    .replace(/([\p{Ll}\p{N}])([\p{Lu}])/gu, '$1 $2')
    .replace(/([\p{Lu}])([\p{Lu}][\p{Ll}])/gu, '$1 $2')
    .replace(/([\p{L}])([\p{N}])/gu, '$1 $2')
    .replace(/([\p{N}])([\p{L}])/gu, '$1 $2');
  return Object.freeze(
    separated
      .split(/[_$\s]+/u)
      .filter((segment) => segment.length > 0)
      .map((segment) => segment.toLocaleLowerCase('und')),
  );
}

export function oneSegmentApartV2(
  leftValue: string,
  rightValue: string,
): boolean {
  const left = identifierSegmentsV2(leftValue);
  const right = identifierSegmentsV2(rightValue);
  if (!left.some((segment) => segment.length > 1 && right.includes(segment))) {
    return false;
  }
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }
  if (left.length === right.length) {
    return (
      left.filter((segment, index) => segment !== right[index]).length === 1
    );
  }
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  for (let omitted = 0; omitted < longer.length; omitted += 1) {
    const candidate = longer.filter((_segment, index) => index !== omitted);
    if (candidate.every((segment, index) => segment === shorter[index])) {
      return true;
    }
  }
  return false;
}
