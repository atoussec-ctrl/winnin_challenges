"use client";

import { AnimatePresence, motion } from "framer-motion";
import { formatCurrencyBRL } from "../../lib/money";
import type { Order } from "../../lib/orders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../atoms/card";

export interface OrdersPanelProps {
  readonly isLoading: boolean;
  readonly orders: readonly Order[];
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString("pt-BR");
}

export function OrdersPanel({ isLoading, orders }: OrdersPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos</CardTitle>
        <CardDescription>Historico de pedidos com itens e total.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
        ) : orders.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum pedido criado ainda.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {orders.map((order) => (
                <motion.li
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-2 rounded-md border border-border p-3"
                  exit={{ opacity: 0, scale: 0.97 }}
                  initial={{ opacity: 0, scale: 0.97 }}
                  key={order.id}
                  layout
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold">{order.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {order.id} • {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrencyBRL(order.total)}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1 border-t border-border pt-2">
                    {order.items.map((item) => (
                      <li
                        className="flex items-center justify-between text-xs text-muted-foreground"
                        key={`${order.id}-${item.product.id}`}
                      >
                        <span>
                          {item.quantity}x {item.product.name}
                        </span>
                        <span className="tabular-nums">{formatCurrencyBRL(item.price)}</span>
                      </li>
                    ))}
                  </ul>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
