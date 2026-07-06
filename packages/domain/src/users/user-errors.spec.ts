import { describe, expect, it } from "vitest";
import { EmailAlreadyInUseError } from "./user-errors";

describe("EmailAlreadyInUseError", () => {
  it("uses a stable error code and a message naming the email", () => {
    const error = new EmailAlreadyInUseError("ana@example.com");

    expect(error.code).toBe("EMAIL_ALREADY_IN_USE");
    expect(error.message).toBe("Email ana@example.com is already in use.");
  });
});
