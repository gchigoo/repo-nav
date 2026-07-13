export const LOCATE_ABORT_SOURCES = Object.freeze([
  'none',
  'caller',
  'deadline',
] as const);

export type LocateAbortSource = (typeof LOCATE_ABORT_SOURCES)[number];

type TriggeredLocateAbortSource = Exclude<LocateAbortSource, 'none'>;

/**
 * Owns the composed request signal and permanently records the first abort
 * source. A later caller/deadline race must not rewrite final status actions.
 */
export class LocateAbortCoordinator {
  private readonly controller = new AbortController();
  private currentSource: LocateAbortSource = 'none';

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public get source(): LocateAbortSource {
    return this.currentSource;
  }

  public abort(source: TriggeredLocateAbortSource, reason?: unknown): boolean {
    if (this.currentSource !== 'none') {
      return false;
    }
    this.currentSource = source;
    this.controller.abort(reason);
    return true;
  }
}
