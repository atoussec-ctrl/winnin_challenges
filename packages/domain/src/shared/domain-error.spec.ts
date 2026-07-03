import { describe, expect, it } from "vitest";
import { ValidationDomainError } from "./domain-error";

describe("ValidationDomainError", () => {
  it("uses the validation error code", () => {
    const error = new ValidationDomainError("Invalid input.");

    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Invalid input.");
  });
});

