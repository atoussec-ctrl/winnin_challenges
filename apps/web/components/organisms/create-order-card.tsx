"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { formatCurrencyBRL } from "../../lib/money";
import {
  addDraftItem,
  calculateDraftTotal,
  createDraftItem,
  removeDraftItem,
  updateDraftItem,
  validateOrderDraft,
  type OrderDraftItem
} from "../../lib/order-draft";
import type { CreateOrderRequest, OrderProduct, OrderUser } from "../../lib/orders";
import { Button } from "../atoms/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../atoms/card";
import { Input } from "../atoms/input";
import { Select } from "../atoms/select";
import { FormField } from "../molecules/form-field";
import { InlineAlert } from "../molecules/inline-alert";
import type { FormSubmitState } from "./form-contract";

export interface CreateOrderCardProps {
  readonly form: FormSubmitState<CreateOrderRequest>;
  readonly products: readonly OrderProduct[];
  readonly users: readonly OrderUser[];
}

export function CreateOrderCard({ form, products, users }: CreateOrderCardProps) {
  const [items, setItems] = useState<readonly OrderDraftItem[]>(() => [createDraftItem()]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const total = calculateDraftTotal(items, products);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSuccessMessage(null);

    const validationErrors = validateOrderDraft(userId, items);

    if (validationErrors.length > 0) {
      setValidationMessage(validationErrors.join(" "));
      return;
    }

    setValidationMessage(null);

    const created = await form.submit({
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      userId
    });

    if (created) {
      setItems([createDraftItem()]);
      setUserId("");
      setSuccessMessage("Pedido criado com sucesso.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo pedido</CardTitle>
        <CardDescription>
          O total usa o preco atual de cada produto e o estoque e debitado de forma atomica.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <FormField htmlFor="order-user" label="Usuario">
            <Select
              id="order-user"
              onChange={(event) => setUserId(event.target.value)}
              value={userId}
            >
              <option value="">Selecione um usuario</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-end gap-2"
                  exit={{ opacity: 0, y: -8 }}
                  initial={{ opacity: 0, y: 8 }}
                  key={item.id}
                  layout
                  transition={{ duration: 0.15 }}
                >
                  {/* min-w forca o campo Produto a ocupar a linha inteira em cards estreitos. */}
                  <div className="min-w-[12rem] flex-1">
                    {/* Ids por indice: os ids de rascunho variam entre servidor e cliente (hidratacao). */}
                    <FormField htmlFor={`order-item-product-${index}`} label="Produto">
                      <Select
                        id={`order-item-product-${index}`}
                        onChange={(event) =>
                          setItems(
                            updateDraftItem(items, item.id, { productId: event.target.value })
                          )
                        }
                        value={item.productId}
                      >
                        <option value="">Selecione um produto</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} — {formatCurrencyBRL(product.price)} ({product.stock} un)
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </div>
                  <div className="w-20">
                    <FormField htmlFor={`order-item-quantity-${index}`} label="Qtd">
                      <Input
                        id={`order-item-quantity-${index}`}
                        min="1"
                        onChange={(event) =>
                          setItems(
                            updateDraftItem(items, item.id, {
                              quantity: Number(event.target.value)
                            })
                          )
                        }
                        step="1"
                        type="number"
                        value={item.quantity}
                      />
                    </FormField>
                  </div>
                  <Button
                    aria-label={`Remover item ${index + 1}`}
                    className="border border-border bg-transparent text-foreground hover:bg-muted"
                    disabled={items.length === 1}
                    onClick={() => setItems(removeDraftItem(items, item.id))}
                    type="button"
                  >
                    Remover
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Button
            className="border border-border bg-transparent text-foreground hover:bg-muted"
            onClick={() => setItems(addDraftItem(items))}
            type="button"
          >
            Adicionar item
          </Button>

          <div className="flex items-center justify-between rounded-md bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Total estimado</span>
            <span className="font-semibold tabular-nums">{formatCurrencyBRL(total)}</span>
          </div>

          <Button disabled={form.isPending} type="submit">
            {form.isPending ? "Enviando..." : "Criar pedido"}
          </Button>
          <InlineAlert message={validationMessage ?? form.errorMessage} tone="error" />
          <InlineAlert message={successMessage} tone="success" />
        </form>
      </CardContent>
    </Card>
  );
}
