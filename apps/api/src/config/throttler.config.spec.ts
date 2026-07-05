import { describe, expect, it } from "vitest";
import { buildThrottlerOptions } from "./throttler.config";

describe("buildThrottlerOptions", () => {
  it("defaults to 100 requests per 60s window when unset", () => {
    const [options] = buildThrottlerOptions({});

    expect(options).toMatchObject({ limit: 100, ttl: 60_000 });
  });

  it("reads the window and limit from env vars when provided", () => {
    const [options] = buildThrottlerOptions({
      RATE_LIMIT_MAX: "10",
      RATE_LIMIT_TTL_MS: "1000"
    });

    expect(options).toMatchObject({ limit: 10, ttl: 1000 });
  });

  it("fails fast when RATE_LIMIT_MAX is not a positive integer", () => {
    expect(() => buildThrottlerOptions({ RATE_LIMIT_MAX: "0" })).toThrowError(
      /RATE_LIMIT_MAX must be a positive integer/
    );
    expect(() => buildThrottlerOptions({ RATE_LIMIT_MAX: "abc" })).toThrowError(
      /RATE_LIMIT_MAX must be a positive integer/
    );
  });

  it("fails fast when RATE_LIMIT_TTL_MS is not a positive integer", () => {
    expect(() => buildThrottlerOptions({ RATE_LIMIT_TTL_MS: "-1" })).toThrowError(
      /RATE_LIMIT_TTL_MS must be a positive integer/
    );
  });
});
