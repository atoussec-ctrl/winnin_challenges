import { describe, expect, it } from "vitest";
import { formatCompactNumber } from "./format";

const NBSP = " ";

describe("formatCompactNumber", () => {
  it("keeps small numbers as-is", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(842)).toBe("842");
  });

  it("compacts thousands and millions in pt-BR", () => {
    expect(formatCompactNumber(1_284)).toBe(`1,3${NBSP}mil`);
    expect(formatCompactNumber(12_900)).toBe(`12,9${NBSP}mil`);
    expect(formatCompactNumber(4_200_000)).toBe(`4,2${NBSP}mi`);
  });
});
