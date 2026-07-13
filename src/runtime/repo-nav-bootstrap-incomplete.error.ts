export class RepoNavBootstrapIncompleteError extends Error {
  public readonly code = 'REPO_NAV_BOOTSTRAP_INCOMPLETE' as const;

  public constructor(provider: string) {
    super(`${provider} is not configured in the current RepoNav build.`);
    this.name = 'RepoNavBootstrapIncompleteError';
  }
}
