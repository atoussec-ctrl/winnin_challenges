import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "./security-headers";

function headerMap(): Record<string, string> {
  return Object.fromEntries(buildSecurityHeaders().map((header) => [header.key, header.value]));
}

describe("buildSecurityHeaders", () => {
  it("sets HSTS with a long max-age and subdomains", () => {
    expect(headerMap()["Strict-Transport-Security"]).toMatch(
      /max-age=\d{7,};\s*includeSubDomains/
    );
  });

  it("blocks MIME sniffing and framing", () => {
    const headers = headerMap();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("sets a privacy-preserving referrer policy and a restrictive permissions policy", () => {
    const headers = headerMap();
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });

  it("ships a report-only CSP allowing the AniList image and API hosts", () => {
    const csp = headerMap()["Content-Security-Policy-Report-Only"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("img-src 'self' data: https://s4.anilist.co");
    expect(csp).toContain("connect-src 'self' https://graphql.anilist.co");
    expect(csp).toContain("object-src 'none'");
  });

  it("does not enforce the CSP yet (report-only only, no blocking header)", () => {
    expect(headerMap()["Content-Security-Policy"]).toBeUndefined();
  });
});
