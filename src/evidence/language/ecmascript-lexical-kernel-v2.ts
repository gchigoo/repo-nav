/**
 * Consumer-neutral ECMAScript mask kernel（F8 S1 move-only）。
 * 行为与 legacy `direct-mapping-classifier.maskNonCode` deep-exact。
 */

export function maskNonCode(excerpt: string): string {
  let state:
    | 'code'
    | 'line-comment'
    | 'block-comment'
    | 'single'
    | 'double'
    | 'template'
    | 'regex' = 'code';
  let escaped = false;
  let regexCharacterClass = false;
  let output = '';

  for (let index = 0; index < excerpt.length; index += 1) {
    const character = excerpt[index] ?? '';
    const next = excerpt[index + 1] ?? '';
    if (state === 'code') {
      if (character === '/' && next === '/') {
        state = 'line-comment';
        output += '  ';
        index += 1;
      } else if (character === '/' && next === '*') {
        state = 'block-comment';
        output += '  ';
        index += 1;
      } else if (character === "'") {
        state = 'single';
        output += ' ';
      } else if (character === '"') {
        state = 'double';
        output += ' ';
      } else if (character === '`') {
        state = 'template';
        output += ' ';
      } else if (character === '/' && startsRegexLiteral(excerpt, index)) {
        state = 'regex';
        regexCharacterClass = false;
        output += ' ';
      } else {
        output += character;
      }
      continue;
    }

    if (state === 'line-comment') {
      if (character === '\n') {
        state = 'code';
        output += '\n';
      } else {
        output += ' ';
      }
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        state = 'code';
        output += '  ';
        index += 1;
      } else {
        output += character === '\n' ? '\n' : ' ';
      }
      continue;
    }

    output += character === '\n' ? '\n' : ' ';
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (state === 'regex' && character === '[') {
      regexCharacterClass = true;
    } else if (state === 'regex' && character === ']') {
      regexCharacterClass = false;
    } else if (state === 'regex' && character === '/' && !regexCharacterClass) {
      state = 'code';
    } else if (
      (state === 'single' && character === "'") ||
      (state === 'double' && character === '"') ||
      (state === 'template' && character === '`')
    ) {
      state = 'code';
    }
  }
  return output;
}

export function startsRegexLiteral(source: string, slashIndex: number): boolean {
  const prefix = source.slice(0, slashIndex).trimEnd();
  if (prefix.length === 0) {
    return true;
  }
  const previous = prefix.at(-1) ?? '';
  // 与 legacy classifier deep-exact：仅这些前驱把 `/` 当 regex 起点；
  // 不得写成 `+-~` 一类 range（会吞掉字母并误 mask 后续 assignment）。
  if (/[[{(=,:;!?&|]/u.test(previous)) {
    return true;
  }
  if (
    /=>$/u.test(prefix) ||
    endsWithStandaloneKeyword(prefix, /(?:do|else)$/u)
  ) {
    return true;
  }
  if (previous === ')' && followsControlHeader(prefix)) {
    return true;
  }
  return endsWithStandaloneKeyword(
    prefix,
    /(?:await|case|delete|in|instanceof|new|of|return|throw|typeof|void|yield)$/u,
  );
}

export function endsWithStandaloneKeyword(
  prefix: string,
  pattern: RegExp,
): boolean {
  const match = pattern.exec(prefix);
  if (match?.index === undefined) {
    return false;
  }
  const before = prefix[match.index - 1];
  return before === undefined || !/[.\p{L}\p{N}_$]/u.test(before);
}

export function followsControlHeader(prefix: string): boolean {
  let depth = 0;
  for (let index = prefix.length - 1; index >= 0; index -= 1) {
    const character = prefix[index] ?? '';
    if (character === ')') {
      depth += 1;
    } else if (character === '(') {
      depth -= 1;
      if (depth === 0) {
        return endsWithStandaloneKeyword(
          prefix.slice(0, index).trimEnd(),
          /(?:for|if|while|with)$/u,
        );
      }
    }
  }
  return false;
}
