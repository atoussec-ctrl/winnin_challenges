import { DomainError } from "../shared/domain-error";

export class EmailAlreadyInUseError extends DomainError {
  public constructor(email: string) {
    super("EMAIL_ALREADY_IN_USE", `Email ${email} is already in use.`);
  }
}
