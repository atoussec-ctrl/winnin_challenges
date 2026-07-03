"use client";

import { useState, type FormEvent } from "react";
import type { CreateProductRequest } from "../../lib/orders";
import { Button } from "../atoms/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../atoms/card";
import { Input } from "../atoms/input";
import { FormField } from "../molecules/form-field";
import { InlineAlert } from "../molecules/inline-alert";
import type { FormSubmitState } from "./form-contract";

export function CreateProductCard({
  form
}: Readonly<{ form: FormSubmitState<CreateProductRequest> }>) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSuccessMessage(null);

    const created = await form.submit({
      name,
      price: Number(price),
      stock: Number(stock)
    });

    if (created) {
      setName("");
      setPrice("");
      setStock("");
      setSuccessMessage("Produto criado com sucesso.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo produto</CardTitle>
        <CardDescription>Cadastre um produto com preco e estoque.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <FormField htmlFor="product-name" label="Nome">
            <Input
              id="product-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Teclado mecanico"
              required
              value={name}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField htmlFor="product-price" label="Preco (R$)">
              <Input
                id="product-price"
                min="0.01"
                onChange={(event) => setPrice(event.target.value)}
                placeholder="150.00"
                required
                step="0.01"
                type="number"
                value={price}
              />
            </FormField>
            <FormField htmlFor="product-stock" label="Estoque">
              <Input
                id="product-stock"
                min="0"
                onChange={(event) => setStock(event.target.value)}
                placeholder="10"
                required
                step="1"
                type="number"
                value={stock}
              />
            </FormField>
          </div>
          <Button disabled={form.isPending} type="submit">
            {form.isPending ? "Criando..." : "Criar produto"}
          </Button>
          <InlineAlert message={form.errorMessage} tone="error" />
          <InlineAlert message={successMessage} tone="success" />
        </form>
      </CardContent>
    </Card>
  );
}
