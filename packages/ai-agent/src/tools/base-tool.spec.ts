import { describe, expect, it } from "vitest";
import { runTool } from "./base-tool";

describe("runTool", () => {
  it("wraps a successful call in a ToolResult ok", async () => {
    const result = await runTool(() => Promise.resolve({ value: 42 }));

    expect(result).toEqual({ data: { value: 42 }, metadata: undefined, ok: true });
  });

  it("attaches metadata derived from the successful output", async () => {
    const result = await runTool(
      () => Promise.resolve({ items: [1, 2, 3] }),
      (output) => ({ count: output.items.length })
    );

    expect(result).toEqual({ data: { items: [1, 2, 3] }, metadata: { count: 3 }, ok: true });
  });

  it("wraps a thrown Error into a ToolResult error with its message", async () => {
    const result = await runTool(() => Promise.reject(new Error("port unavailable")));

    expect(result).toEqual({
      error: { code: "TOOL_EXECUTION_FAILED", message: "port unavailable" },
      ok: false
    });
  });

  it("stringifies a non-Error thrown value", async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- exercising a port that violates the Error contract on purpose
    const result = await runTool<never>(() => Promise.reject("raw string failure"));

    expect(result).toEqual({
      error: { code: "TOOL_EXECUTION_FAILED", message: "raw string failure" },
      ok: false
    });
  });
});
