import { describe, expect, it } from "vitest";
import { productSnapshotBuilder, uniqueEmail } from "./builders";

describe("testing builders", () => {
  it("creates product snapshots with defaults and overrides", () => {
    expect(productSnapshotBuilder({ id: "custom", stock: 3 })).toMatchObject({
      id: "custom",
      name: "Keyboard",
      priceCents: 15000,
      stock: 3
    });
  });

  it("creates unique email addresses with the provided prefix", () => {
    const first = uniqueEmail("suite");
    const second = uniqueEmail("suite");

    expect(first).toContain("suite.");
    expect(first).toContain("@example.com");
    expect(second).not.toBe(first);
  });
});

