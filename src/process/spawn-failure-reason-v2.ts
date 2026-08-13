export type SpawnFailureReasonV2 = 'not-found' | 'permission-denied' | 'other';

export function classifySpawnFailureReasonV2(
  error: unknown,
): SpawnFailureReasonV2 {
  if (typeof error !== 'object' || error === null) {
    return 'other';
  }
  let code: unknown;
  try {
    code = Reflect.get(error, 'code');
  } catch {
    return 'other';
  }
  if (code === 'ENOENT') {
    return 'not-found';
  }
  if (code === 'EACCES' || code === 'EPERM') {
    return 'permission-denied';
  }
  return 'other';
}
