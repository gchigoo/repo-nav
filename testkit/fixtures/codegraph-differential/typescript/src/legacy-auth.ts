export function verifyAccessToken(sourceToken: string): string {
  return `legacy:${sourceToken}`;
}
