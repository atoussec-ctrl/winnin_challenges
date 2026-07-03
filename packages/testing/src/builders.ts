import type { ProductSnapshot } from "@desafio/domain";

export function productSnapshotBuilder(overrides: Partial<ProductSnapshot> = {}): ProductSnapshot {
  return {
    id: "product-1",
    name: "Keyboard",
    priceCents: 15000,
    stock: 10,
    ...overrides
  };
}

export function uniqueEmail(prefix = "qa"): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
}

