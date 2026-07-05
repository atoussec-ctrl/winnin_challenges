import { describe, expect, it, vi } from "vitest";
import { withResilience } from "./resilience";

describe("withResilience", () => {
  it("returns the operation result when it succeeds on the first attempt", async () => {
    const operation = vi.fn().mockResolvedValue("ok");

    await expect(withResilience(operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries a failing operation and succeeds on a later attempt", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce("ok");

    await expect(withResilience(operation, { retries: 2, retryDelayMs: 1 })).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and throws the last error", async () => {
    const failure = new Error("still failing");
    const operation = vi.fn().mockRejectedValue(failure);

    await expect(withResilience(operation, { retries: 2, retryDelayMs: 1 })).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("does not retry when the error is classified as non-retryable", async () => {
    const failure = new Error("bad request");
    const operation = vi.fn().mockRejectedValue(failure);

    await expect(
      withResilience(operation, { isRetryable: () => false, retries: 3, retryDelayMs: 1 })
    ).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("times out an operation that runs longer than the budget", async () => {
    const operation = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));

    await expect(
      withResilience(operation, { retries: 0, timeoutMs: 5 })
    ).rejects.toThrow(/timed out/i);
  });

  it("does not impose a timeout when timeoutMs is omitted", async () => {
    const operation = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("late"), 20))
    );

    await expect(withResilience(operation)).resolves.toBe("late");
  });
});
