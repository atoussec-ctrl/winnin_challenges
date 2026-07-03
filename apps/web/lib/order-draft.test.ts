import { describe, expect, it } from "vitest";
import {
  addDraftItem,
  calculateDraftTotal,
  createDraftItem,
  removeDraftItem,
  updateDraftItem,
  validateOrderDraft
} from "./order-draft";
import type { OrderProduct } from "./orders";

const products: readonly OrderProduct[] = [
  {
    createdAt: "2026-07-03T00:00:00.000Z",
    id: "product-1",
    name: "Keyboard",
    price: 150,
    stock: 3
  },
  {
    createdAt: "2026-07-03T00:00:00.000Z",
    id: "product-2",
    name: "Mouse",
    price: 80,
    stock: 10
  }
];

describe("order draft helpers", () => {
  it("creates items with unique stable ids", () => {
    const first = createDraftItem();
    const second = createDraftItem();

    expect(first.id).not.toBe(second.id);
    expect(first).toMatchObject({ productId: "", quantity: 1 });
  });

  it("adds an empty item", () => {
    const items = addDraftItem([]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: "", quantity: 1 });
  });

  it("updates an item by id without touching the others", () => {
    const items = addDraftItem(addDraftItem([]));
    const targetId = items[1]?.id ?? "";

    const updated = updateDraftItem(items, targetId, { productId: "product-2", quantity: 3 });

    expect(updated[0]).toEqual(items[0]);
    expect(updated[1]).toMatchObject({ id: targetId, productId: "product-2", quantity: 3 });
  });

  it("removes an item by id", () => {
    const items = addDraftItem(addDraftItem([]));
    const removedId = items[0]?.id ?? "";

    const remaining = removeDraftItem(items, removedId);

    expect(remaining).toEqual([items[1]]);
  });

  it("calculates the total for valid items only", () => {
    const total = calculateDraftTotal(
      [
        { id: "a", productId: "product-1", quantity: 2 },
        { id: "b", productId: "product-2", quantity: 1 },
        { id: "c", productId: "unknown", quantity: 5 },
        { id: "d", productId: "product-2", quantity: 0 },
        { id: "e", productId: "product-2", quantity: 1.5 }
      ],
      products
    );

    expect(total).toBe(380);
  });

  it("accepts a complete draft", () => {
    expect(
      validateOrderDraft("user-1", [{ id: "a", productId: "product-1", quantity: 1 }])
    ).toEqual([]);
  });

  it("collects every draft problem", () => {
    expect(validateOrderDraft("", [])).toEqual([
      "Selecione um usuario.",
      "Adicione ao menos um item."
    ]);
    expect(validateOrderDraft("user-1", [{ id: "a", productId: "", quantity: 0.5 }])).toEqual([
      "Selecione um produto em todos os itens.",
      "Quantidade deve ser um inteiro positivo."
    ]);
  });
});
