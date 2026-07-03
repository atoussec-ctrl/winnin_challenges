"use client";

import { useState, type FormEvent } from "react";
import type { CreateUserRequest } from "../../lib/orders";
import { Button } from "../atoms/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../atoms/card";
import { Input } from "../atoms/input";
import { FormField } from "../molecules/form-field";
import { InlineAlert } from "../molecules/inline-alert";
import type { FormSubmitState } from "./form-contract";

export function CreateUserCard({ form }: Readonly<{ form: FormSubmitState<CreateUserRequest> }>) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSuccessMessage(null);

    const created = await form.submit({ email, name });

    if (created) {
      setEmail("");
      setName("");
      setSuccessMessage("Usuario criado com sucesso.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo usuario</CardTitle>
        <CardDescription>Cadastre um usuario com email unico.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <FormField htmlFor="user-name" label="Nome">
            <Input
              id="user-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Maria Silva"
              required
              value={name}
            />
          </FormField>
          <FormField htmlFor="user-email" label="Email">
            <Input
              id="user-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="maria@example.com"
              required
              type="email"
              value={email}
            />
          </FormField>
          <Button disabled={form.isPending} type="submit">
            {form.isPending ? "Criando..." : "Criar usuario"}
          </Button>
          <InlineAlert message={form.errorMessage} tone="error" />
          <InlineAlert message={successMessage} tone="success" />
        </form>
      </CardContent>
    </Card>
  );
}
