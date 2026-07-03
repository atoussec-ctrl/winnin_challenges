import type { OrderProduct } from "./orders";

export interface OrderDraftItem {
  readonly id: string;
  readonly productId: string;
  readonly quantity: number;
}

let draftItemSequence = 0;

export function createDraftItem(): OrderDraftItem {
  draftItemSequence += 1;

  return {
    id: `draft-${draftItemSequence}`,
    productId: "",
    quantity: 1
  };
}

export function addDraftItem(items: readonly OrderDraftItem[]): readonly OrderDraftItem[] {
  return [...items, createDraftItem()];
}

export function updateDraftItem(
  items: readonly OrderDraftItem[],
  itemId: string,
  patch: Partial<Omit<OrderDraftItem, "id">>
): readonly OrderDraftItem[] {
  return items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
}

export function removeDraftItem(
  items: readonly OrderDraftItem[],
  itemId: string
): readonly OrderDraftItem[] {
  return items.filter((item) => item.id !== itemId);
}

export function calculateDraftTotal(
  items: readonly OrderDraftItem[],
  products: readonly OrderProduct[]
): number {
  const priceByProductId = new Map(products.map((product) => [product.id, product.price]));

  return items.reduce((total, item) => {
    const price = priceByProductId.get(item.productId);

    if (price === undefined || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return total;
    }

    return total + price * item.quantity;
  }, 0);
}

export function validateOrderDraft(
  userId: string,
  items: readonly OrderDraftItem[]
): readonly string[] {
  const errors: string[] = [];

  if (userId.length === 0) {
    errors.push("Selecione um usuario.");
  }

  if (items.length === 0) {
    errors.push("Adicione ao menos um item.");
  }

  if (items.some((item) => item.productId.length === 0)) {
    errors.push("Selecione um produto em todos os itens.");
  }

  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    errors.push("Quantidade deve ser um inteiro positivo.");
  }

  return errors;
}
