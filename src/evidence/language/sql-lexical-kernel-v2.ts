/**
 * Consumer-neutral SQL mask kernel（F8 S1 move-only）。
 * 行为与 legacy `direct-mapping-classifier.maskSqlNonCode` deep-exact。
 */

export function maskSqlNonCode(sql: string): string {
  let state:
    'code' | 'single' | 'double' | 'dollar' | 'line-comment' | 'block-comment' =
    'code';
  let dollarTag = '';
  let blockCommentDepth = 0;
  let output = '';
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index] ?? '';
    const next = sql[index + 1] ?? '';
    if (state === 'code') {
      if (character === '-' && next === '-') {
        state = 'line-comment';
        output += '  ';
        index += 1;
      } else if (character === '/' && next === '*') {
        state = 'block-comment';
        blockCommentDepth = 1;
        output += '  ';
        index += 1;
      } else if (character === "'") {
        state = 'single';
        output += ' ';
      } else if (character === '"') {
        state = 'double';
        output += ' ';
      } else if (character === '$') {
        const tag = /^\$(?:[\p{L}_][\p{L}\p{N}_]*)?\$/u.exec(
          sql.slice(index),
        )?.[0];
        if (tag === undefined) {
          output += character;
        } else {
          state = 'dollar';
          dollarTag = tag;
          output += ' '.repeat(tag.length);
          index += tag.length - 1;
        }
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
      if (character === '/' && next === '*') {
        blockCommentDepth += 1;
        output += '  ';
        index += 1;
      } else if (character === '*' && next === '/') {
        blockCommentDepth -= 1;
        if (blockCommentDepth === 0) {
          state = 'code';
        }
        output += '  ';
        index += 1;
      } else {
        output += character === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (state === 'dollar') {
      if (sql.startsWith(dollarTag, index)) {
        output += ' '.repeat(dollarTag.length);
        index += dollarTag.length - 1;
        state = 'code';
        dollarTag = '';
      } else {
        output += character === '\n' ? '\n' : ' ';
      }
      continue;
    }
    output += character === '\n' ? '\n' : ' ';
    if (character === '\\' && next !== '') {
      output += next === '\n' ? '\n' : ' ';
      index += 1;
      continue;
    }
    if (
      (state === 'single' && character === "'") ||
      (state === 'double' && character === '"')
    ) {
      if (next === character) {
        output += ' ';
        index += 1;
      } else {
        state = 'code';
      }
    }
  }
  return output;
}
