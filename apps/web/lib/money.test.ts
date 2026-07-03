import { describe, expect, it } from "vitest";
import { formatCurrencyBRL } from "./money";

describe("formatCurrencyBRL", () => {
  it("formats values as Brazilian currency", () => {
    const formatted = formatCurrencyBRL(1234.5);

    expect(formatted).toContain("R$");
    expect(formatted).toContain("1.234,50");
  });

  it("formats zero", () => {
    expect(formatCurrencyBRL(0)).toContain("0,00");
  });
});
