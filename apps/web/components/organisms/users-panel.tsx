"use client";

import { motion } from "framer-motion";
import type { Order, OrderUser } from "../../lib/orders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../atoms/card";

export interface UsersPanelProps {
  readonly isLoading: boolean;
  readonly orders: readonly Order[];
  readonly users: readonly OrderUser[];
}

export function UsersPanel({ isLoading, orders, users }: UsersPanelProps) {
  const orderCountByUserId = new Map<string, number>();

  for (const order of orders) {
    orderCountByUserId.set(order.user.id, (orderCountByUserId.get(order.user.id) ?? 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios</CardTitle>
        <CardDescription>Usuarios cadastrados e seus pedidos.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuario cadastrado.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {users.map((user, index) => (
              <motion.li
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-2 py-2 text-sm"
                initial={{ opacity: 0, y: 6 }}
                key={user.id}
                transition={{ delay: index * 0.03, duration: 0.2 }}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="break-all text-xs text-muted-foreground">{user.email}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {orderCountByUserId.get(user.id) ?? 0} pedido(s)
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
