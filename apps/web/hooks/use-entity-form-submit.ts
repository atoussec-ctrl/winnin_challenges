"use client";

import { useState } from "react";
import type { FormSubmitState } from "../components/organisms/form-contract";

export interface EntityFormSubmit<TInput> {
  readonly successMessage: string | null;
  readonly submit: (input: TInput, onSuccess?: () => void) => Promise<void>;
}

// Extrai o padrao repetido nos cards de cadastro: limpar a mensagem de
// sucesso, enviar, e so exibir sucesso (e rodar o callback de reset de
// campos) se o backend de fato aceitou o input.
export function useEntityFormSubmit<TInput>(
  form: FormSubmitState<TInput>,
  successMessage: string
): EntityFormSubmit<TInput> {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(input: TInput, onSuccess?: () => void): Promise<void> {
    setMessage(null);

    const created = await form.submit(input);

    if (created) {
      onSuccess?.();
      setMessage(successMessage);
    }
  }

  return { submit, successMessage: message };
}
