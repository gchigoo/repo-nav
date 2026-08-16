/**
 * Go comment/string mask kernel. Newlines are preserved.
 */

export function maskGoNonCode(excerpt: string): string {
  let state:
    'code' | 'line-comment' | 'block-comment' | 'single' | 'double' | 'raw' =
    'code';
  let escaped = false;
  let output = '';

  for (let index = 0; index < excerpt.length; index += 1) {
    const character = excerpt[index] ?? '';
    const next = excerpt[index + 1] ?? '';
    if (state === 'code') {
      if (character === '/' && next === '/') {
        state = 'line-comment';
        output += '  ';
        index += 1;
        continue;
      }
      if (character === '/' && next === '*') {
        state = 'block-comment';
        output += '  ';
        index += 1;
        continue;
      }
      if (character === "'") {
        state = 'single';
        output += ' ';
        continue;
      }
      if (character === '"') {
        state = 'double';
        output += ' ';
        continue;
      }
      if (character === '`') {
        state = 'raw';
        output += ' ';
        continue;
      }
      output += character;
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
    if (state === 'raw') {
      if (character === '`') {
        state = 'code';
      }
      output += character === '\n' ? '\n' : ' ';
      continue;
    }
    output += character === '\n' ? '\n' : ' ';
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (
      (state === 'single' && character === "'") ||
      (state === 'double' && character === '"')
    ) {
      state = 'code';
    }
  }
  return output;
}
