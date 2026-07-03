"use client";

import { motion } from "framer-motion";
import { formatCurrencyBRL } from "../../lib/money";
import type { OrderProduct } from "../../lib/orders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../atoms/card";
import { StockBadge } from "../atoms/stock-badge";

export interface CatalogPanelProps {
  readonly isLoading: boolean;
  readonly products: readonly OrderProduct[];
}

export function CatalogPanel({ isLoading, products }: CatalogPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalogo</CardTitle>
        <CardDescription>Produtos com preco atual e estoque.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando produtos...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {products.map((product, index) => (
              <motion.li
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-2 py-2 text-sm"
                initial={{ opacity: 0, y: 6 }}
                key={product.id}
                transition={{ delay: index * 0.03, duration: 0.2 }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrencyBRL(product.price)}
                  </span>
                </div>
                <StockBadge stock={product.stock} />
              </motion.li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
