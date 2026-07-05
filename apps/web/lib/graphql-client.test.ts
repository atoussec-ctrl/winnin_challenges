import { afterEach, describe, expect, it, vi } from "vitest";
import { postGraphql } from "./graphql-client";

const base = {
  endpoint: "https://api.example/graphql",
  label: "Test",
  query: "{ ping }",
  retryDelayMs: 1
};

function ok(data: unknown) {
  return { json: () => Promise.resolve({ data }), ok: true, status: 200 };
}

function status(code: number) {
  return { json: () => Promise.resolve({}), ok: code < 400, status: code };
}

describe("postGraphql", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the data payload on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ ping: "pong" })));

    await expect(postGraphql({ ...base })).resolves.toEqual({ ping: "pong" });
  });

  it("retries a 5xx response and succeeds on a later attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(status(503))
      .mockResolvedValueOnce(ok({ ping: "pong" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(postGraphql({ ...base })).resolves.toEqual({ ping: "pong" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a network failure and succeeds on a later attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(ok({ ping: "pong" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(postGraphql({ ...base })).resolves.toEqual({ ping: "pong" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 4xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(status(400));
    vi.stubGlobal("fetch", fetchMock);

    await expect(postGraphql({ ...base })).rejects.toThrow("Test request failed with status 400.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry GraphQL-level errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ errors: [{ message: "bad query" }] }),
      ok: true,
      status: 200
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(postGraphql({ ...base })).rejects.toThrow("bad query");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on an empty data payload without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(undefined));
    vi.stubGlobal("fetch", fetchMock);

    await expect(postGraphql({ ...base })).rejects.toThrow("Test returned an empty response.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("exhausts retries and throws the last server error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(status(500));
    vi.stubGlobal("fetch", fetchMock);

    await expect(postGraphql({ ...base, retries: 2 })).rejects.toThrow(
      "Test request failed with status 500."
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("aborts the request when it exceeds the timeout", async () => {
    const fetchMock = vi.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError"))
          );
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(postGraphql({ ...base, retries: 0, timeoutMs: 5 })).rejects.toThrow(/Test/);
  });
});
