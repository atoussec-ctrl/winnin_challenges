import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FormSubmitState } from "../components/organisms/form-contract";
import { useEntityFormSubmit } from "./use-entity-form-submit";

function buildForm(submit: FormSubmitState<{ name: string }>["submit"]): FormSubmitState<{
  name: string;
}> {
  return { errorMessage: null, isPending: false, submit };
}

describe("useEntityFormSubmit", () => {
  it("shows the success message and runs the callback when submit succeeds", async () => {
    const form = buildForm(vi.fn().mockResolvedValue(true));
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useEntityFormSubmit(form, "Criado com sucesso."));

    await act(async () => {
      await result.current.submit({ name: "A" }, onSuccess);
    });

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(result.current.successMessage).toBe("Criado com sucesso.");
  });

  it("does not show the success message nor run the callback when submit fails", async () => {
    const form = buildForm(vi.fn().mockResolvedValue(false));
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useEntityFormSubmit(form, "Criado com sucesso."));

    await act(async () => {
      await result.current.submit({ name: "A" }, onSuccess);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.successMessage).toBeNull();
  });

  it("clears a previous success message as soon as a new submit starts", async () => {
    const submit = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const form = buildForm(submit);
    const { result } = renderHook(() => useEntityFormSubmit(form, "Criado com sucesso."));

    await act(async () => {
      await result.current.submit({ name: "A" });
    });
    expect(result.current.successMessage).toBe("Criado com sucesso.");

    await act(async () => {
      await result.current.submit({ name: "B" });
    });
    expect(result.current.successMessage).toBeNull();
  });

  it("works without an onSuccess callback", async () => {
    const form = buildForm(vi.fn().mockResolvedValue(true));
    const { result } = renderHook(() => useEntityFormSubmit(form, "Criado com sucesso."));

    await act(async () => {
      await result.current.submit({ name: "A" });
    });

    expect(result.current.successMessage).toBe("Criado com sucesso.");
  });
});
