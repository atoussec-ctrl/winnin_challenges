export class DomainError extends Error {
  public constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationDomainError extends DomainError {
  public constructor(message: string) {
    super("VALIDATION_ERROR", message);
  }
}

