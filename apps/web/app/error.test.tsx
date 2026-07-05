import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

describe("route error boundary", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the fallback and retries via reset()", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reset = vi.fn();

    render(<ErrorPage error={new Error("boom")} reset={reset} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("logs the error for observability", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error("kaboom");

    render(<ErrorPage error={error} reset={() => undefined} />);

    expect(consoleError).toHaveBeenCalledWith(error);
  });
});
