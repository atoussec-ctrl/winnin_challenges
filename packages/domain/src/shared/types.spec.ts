import { describe, expect, it } from "vitest";
import { SystemClock } from "./types";

describe("SystemClock", () => {
  it("returns the current date", () => {
    expect(new SystemClock().now()).toBeInstanceOf(Date);
  });
});

