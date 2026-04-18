export class RepositoryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryConflictError";
  }
}

export class NonceMismatchError extends Error {
  constructor(
    message: string,
    public readonly expectedNonce: string
  ) {
    super(message);
    this.name = "NonceMismatchError";
  }
}
