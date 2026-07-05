import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorFallback } from "./error-fallback";

describe("ErrorFallback", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a default title and description inside an alert region", () => {
    render(<ErrorFallback onRetry={() => undefined} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/algo deu errado/i)).toBeTruthy();
  });

  it("renders a custom title and description", () => {
    render(<ErrorFallback description="Detalhe do erro" onRetry={() => undefined} title="Falha" />);

    expect(screen.getByText("Falha")).toBeTruthy();
    expect(screen.getByText("Detalhe do erro")).toBeTruthy();
  });

  it("invokes onRetry when the retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorFallback onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
