/**
 * Python comment/string mask kernel. Newlines are preserved.
 */

export function maskPythonNonCode(excerpt: string): string {
  let state:
    | 'code'
    | 'line-comment'
    | 'single'
    | 'double'
    | 'triple-single'
    | 'triple-double' = 'code';
  let escaped = false;
  let output = '';

  for (let index = 0; index < excerpt.length; index += 1) {
    const character = excerpt[index] ?? '';
    const next = excerpt[index + 1] ?? '';
    const third = excerpt[index + 2] ?? '';
    if (state === 'code') {
      if (character === '#') {
        state = 'line-comment';
        output += ' ';
        continue;
      }
      if (character === "'" && next === "'" && third === "'") {
        state = 'triple-single';
        output += '   ';
        index += 2;
        continue;
      }
      if (character === '"' && next === '"' && third === '"') {
        state = 'triple-double';
        output += '   ';
        index += 2;
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
    if (state === 'triple-single' || state === 'triple-double') {
      const quote = state === 'triple-single' ? "'" : '"';
      if (character === quote && next === quote && third === quote) {
        state = 'code';
        output += '   ';
        index += 2;
        continue;
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
