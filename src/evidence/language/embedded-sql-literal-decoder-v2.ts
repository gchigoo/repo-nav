/**
 * F8 embedded SQL safe JS literal decoder（无 eval）。
 */

declare const COMPLETE_EMBEDDED_SQL_LITERAL_FACTS_V2: unique symbol;
export type CompleteEmbeddedSqlLiteralFactsV2 = Readonly<object> & {
  readonly [COMPLETE_EMBEDDED_SQL_LITERAL_FACTS_V2]: never;
};

interface CompleteFactsPrivateV2 {
  readonly decoded: string;
  readonly structureComplete: true;
}

const completePrivate = new WeakMap<
  CompleteEmbeddedSqlLiteralFactsV2,
  CompleteFactsPrivateV2
>();

export type EmbeddedSqlLiteralDecodeResultV2 =
  | Readonly<{
      ok: true;
      facts: CompleteEmbeddedSqlLiteralFactsV2;
    }>
  | Readonly<{
      ok: false;
      structureComplete: false;
      reason:
        | 'incomplete-call'
        | 'unsafe-escape'
        | 'template'
        | 'extra-arg'
        | 'unclosed';
    }>;

const SAFE_CALL_CALLEES = Object.freeze(
  new Set(['query', 'select', 'addSelect']),
);

/**
 * 仅接受 bare/non-computed/non-optional member `query|select|addSelect` 恰一闭合字面量。
 */
export function decodeCompleteEmbeddedSqlLiteralV2(
  source: string,
): EmbeddedSqlLiteralDecodeResultV2 {
  const call = findCompleteSafeSqlCallV2(source);
  if (call === undefined) {
    return Object.freeze({
      ok: false,
      structureComplete: false,
      reason: 'incomplete-call',
    });
  }
  const decoded = decodeSafeJsStringLiteralV2(call.rawLiteral, call.quote);
  if (!decoded.ok) {
    return Object.freeze({
      ok: false,
      structureComplete: false,
      reason: decoded.reason,
    });
  }
  const facts = Object.freeze(
    Object.create(null),
  ) as CompleteEmbeddedSqlLiteralFactsV2;
  completePrivate.set(
    facts,
    Object.freeze({ decoded: decoded.value, structureComplete: true }),
  );
  return Object.freeze({ ok: true, facts });
}

export function requireCompleteEmbeddedSqlLiteralFactsV2(
  facts: CompleteEmbeddedSqlLiteralFactsV2,
): Readonly<{ decoded: string; structureComplete: true }> {
  const record = completePrivate.get(facts);
  if (record === undefined) {
    throw new TypeError('embedded sql literal facts are not trusted');
  }
  return record;
}

interface SafeCallMatchV2 {
  readonly rawLiteral: string;
  readonly quote: "'" | '"';
}

function findCompleteSafeSqlCallV2(source: string): SafeCallMatchV2 | undefined {
  // 简化扫描：寻找 callee(...'...'| "...") 且无模板/可选链/计算属性
  const pattern =
    /(?<![\p{L}\p{N}_$?.])((?:[\p{L}_$][\p{L}\p{N}_$]*\.)*(?:query|select|addSelect))\s*\(/giu;
  let found: SafeCallMatchV2 | undefined;
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }
    const callee = match[1] ?? '';
    if (callee.includes('?.') || callee.includes('[')) {
      continue;
    }
    const leaf = callee.split('.').at(-1)?.toLowerCase();
    if (leaf === undefined || !SAFE_CALL_CALLEES.has(leaf)) {
      continue;
    }
    let index = match.index + match[0].length;
    while (/\s/u.test(source[index] ?? '')) {
      index += 1;
    }
    const quote = source[index];
    if (quote !== "'" && quote !== '"') {
      return undefined;
    }
    const start = index + 1;
    let escaped = false;
    let end = -1;
    for (let i = start; i < source.length; i += 1) {
      const ch = source[i] ?? '';
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        end = i;
        break;
      }
      if (ch === '\n' || ch === '\r') {
        return undefined;
      }
    }
    if (end < 0) {
      return undefined;
    }
    let after = end + 1;
    while (/\s/u.test(source[after] ?? '')) {
      after += 1;
    }
    if (source[after] === ',') {
      return undefined;
    }
    if (source[after] !== ')') {
      return undefined;
    }
    // 配平外层 paren：当前 after 已是闭合
    if (found !== undefined) {
      return undefined;
    }
    found = Object.freeze({
      rawLiteral: source.slice(start, end),
      quote,
    });
  }
  return found;
}

function decodeSafeJsStringLiteralV2(
  raw: string,
  quote: "'" | '"',
):
  | Readonly<{ ok: true; value: string }>
  | Readonly<{
      ok: false;
      reason: 'unsafe-escape' | 'template' | 'unclosed';
    }> {
  if (raw.includes('${') || raw.includes('`')) {
    return Object.freeze({ ok: false, reason: 'template' });
  }
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i] ?? '';
    if (ch !== '\\') {
      if (ch === '\n' || ch === '\r') {
        return Object.freeze({ ok: false, reason: 'unsafe-escape' });
      }
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    if (next === undefined) {
      return Object.freeze({ ok: false, reason: 'unsafe-escape' });
    }
    if (next === '\\' || next === quote || next === "'" || next === '"') {
      out += next;
      i += 1;
      continue;
    }
    if (next === 'n') {
      out += '\n';
      i += 1;
      continue;
    }
    if (next === 'r') {
      out += '\r';
      i += 1;
      continue;
    }
    if (next === 't') {
      out += '\t';
      i += 1;
      continue;
    }
    // line continuation / hex / unicode / octal / null / identity → unsafe
    return Object.freeze({ ok: false, reason: 'unsafe-escape' });
  }
  return Object.freeze({ ok: true, value: out });
}
