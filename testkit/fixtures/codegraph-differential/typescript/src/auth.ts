export function verifyAccessToken(sourceToken: string): string {
  return sourceToken;
}

export function verifyAccessTokenFactory(): () => string {
  return () => 'decoy';
}
