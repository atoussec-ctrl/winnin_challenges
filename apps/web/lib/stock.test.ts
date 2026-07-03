import { describe, expect, it } from "vitest";
import { getStockTone } from "./stock";

describe("getStockTone", () => {
  it("flags depleted stock as danger", () => {
    expect(getStockTone(0)).toBe("danger");
    expect(getStockTone(-1)).toBe("danger");
  });

  it("flags low stock as warning", () => {
    expect(getStockTone(1)).toBe("warning");
    expect(getStockTone(4)).toBe("warning");
  });

  it("flags healthy stock as success", () => {
    expect(getStockTone(5)).toBe("success");
    expect(getStockTone(100)).toBe("success");
  });
});
