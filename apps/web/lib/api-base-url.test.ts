import { describe, expect, it } from "vitest";
import { resolveOrdersApiBaseUrl } from "./api-base-url";

describe("resolveOrdersApiBaseUrl", () => {
  it("prefers the configured env URL", () => {
    expect(
      resolveOrdersApiBaseUrl("http://api.internal:4000", {
        hostname: "192.168.0.10",
        protocol: "http:"
      })
    ).toBe("http://api.internal:4000");
  });

  it("ignores an empty env URL", () => {
    expect(resolveOrdersApiBaseUrl("", { hostname: "192.168.0.10", protocol: "http:" })).toBe(
      "http://192.168.0.10:3333"
    );
  });

  it("derives the URL from the browser location for LAN access", () => {
    expect(
      resolveOrdersApiBaseUrl(undefined, { hostname: "192.168.0.10", protocol: "http:" })
    ).toBe("http://192.168.0.10:3333");
  });

  it("keeps the page protocol when deriving", () => {
    expect(resolveOrdersApiBaseUrl(undefined, { hostname: "demo.local", protocol: "https:" })).toBe(
      "https://demo.local:3333"
    );
  });

  it("falls back to localhost without a browser location", () => {
    expect(resolveOrdersApiBaseUrl(undefined, undefined)).toBe("http://localhost:3333");
  });
});
