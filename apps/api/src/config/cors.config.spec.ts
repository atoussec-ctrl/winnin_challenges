import { describe, expect, it } from "vitest";
import { buildCorsOptions } from "./cors.config";

describe("buildCorsOptions", () => {
  it("parses a comma-separated allowlist, trimming whitespace and empty entries", () => {
    const options = buildCorsOptions({
      CORS_ALLOWED_ORIGINS: " https://a.example.com ,https://b.example.com,,"
    });

    expect(options.origin).toEqual(["https://a.example.com", "https://b.example.com"]);
  });

  it("defaults to the local web app origin when unset outside production", () => {
    const options = buildCorsOptions({});

    expect(options.origin).toEqual(["http://localhost:3001"]);
  });

  it("defaults to the local web app origin when NODE_ENV is not production", () => {
    const options = buildCorsOptions({ NODE_ENV: "test" });

    expect(options.origin).toEqual(["http://localhost:3001"]);
  });

  it("fails fast when unset in production instead of falling back to a default", () => {
    expect(() => buildCorsOptions({ NODE_ENV: "production" })).toThrowError(
      /CORS_ALLOWED_ORIGINS must be set/
    );
  });

  it("fails fast when set to an empty/blank value in production", () => {
    expect(() =>
      buildCorsOptions({ CORS_ALLOWED_ORIGINS: "  ,  ", NODE_ENV: "production" })
    ).toThrowError(/CORS_ALLOWED_ORIGINS must contain at least one/);
  });
});
