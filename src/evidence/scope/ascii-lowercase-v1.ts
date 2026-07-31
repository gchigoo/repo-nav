/**
 * Scope comparison 专用：仅把 ASCII A..Z 映射到 a..z。
 * 禁止 toLowerCase / toLocaleLowerCase / NFKC / trim / normalize。
 */
export function asciiLowercaseCodeUnitsV1(value: string): string {
  let output = '';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0x41 && code <= 0x5a) {
      output += String.fromCharCode(code + 0x20);
    } else {
      output += value[index]!;
    }
  }
  return output;
}
