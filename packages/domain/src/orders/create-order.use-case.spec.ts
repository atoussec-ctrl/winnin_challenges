import { describe, expect, it } from "vitest";
import type { Clock } from "../shared/types";
import { ValidationDomainError } from "../shared/domain-error";
import { InsufficientStockError, ProductNotFoundError } from "./order-errors";
import type {
  Order,
  OrderTransactionContext,
  OrderUnitOfWorkPort,
  ProductSnapshot,
  StockDebit
} from "./order";
import { CreateOrderUseCase } from "./create-order.use-case";

class FixedClock implements Clock {
  public now(): Date {
    return new Date("2026-07-02T12:00:00.000Z");
  }
}

class InMemoryOrderUnitOfWork implements OrderUnitOfWorkPort {
  public readonly products = new Map<string, ProductSnapshot>();
  public readonly savedOrders: Order[] = [];
  public failOnDebit = false;
  private orderSequence = 1;

  public constructor(products: readonly ProductSnapshot[]) {
    products.forEach((product) => this.products.set(product.id, { ...product }));
  }

  public async execute<T>(work: (context: OrderTransactionContext) => Promise<T>): Promise<T> {
    const productBackup = new Map(
      [...this.products.entries()].map(([id, product]) => [id, { ...product }])
    );
    const orderBackup = [...this.savedOrders];

    const context: OrderTransactionContext = {
      inventory: {
        decrementStock: (items: readonly StockDebit[]) => {
          if (this.failOnDebit) {
            return Promise.reject(new Error("decrement failed"));
          }

          for (const item of items) {
            const product = this.products.get(item.productId);

            if (product) {
              this.products.set(product.id, {
                ...product,
                stock: product.stock - item.quantity
              });
            }
          }

          return Promise.resolve();
        },
        findProductsForUpdate: (productIds: readonly string[]) =>
          Promise.resolve(productIds.flatMap((productId) => {
            const product = this.products.get(productId);
            return product ? [{ ...product }] : [];
          }))
      },
      orders: {
        nextOrderId: () => `order-${this.orderSequence++}`,
        save: (order: Order) => {
          this.savedOrders.push(order);
          return Promise.resolve();
        }
      }
    };

    try {
      return await work(context);
    } catch (error) {
      this.products.clear();
      productBackup.forEach((product, id) => this.products.set(id, product));
      this.savedOrders.length = 0;
      this.savedOrders.push(...orderBackup);
      throw error;
    }
  }
}

describe("CreateOrderUseCase", () => {
  it("creates an order and decrements stock when inventory is sufficient", async () => {
    const unitOfWork = new InMemoryOrderUnitOfWork([
      { id: "product-1", name: "Keyboard", priceCents: 15000, stock: 4 },
      { id: "product-2", name: "Mouse", priceCents: 5000, stock: 10 }
    ]);
    const useCase = new CreateOrderUseCase(unitOfWork, new FixedClock());

    const order = await useCase.execute({
      items: [
        { productId: "product-1", quantity: 2 },
        { productId: "product-2", quantity: 1 }
      ],
      userId: "user-1"
    });

    expect(order).toMatchObject({
      id: "order-1",
      totalCents: 35000,
      userId: "user-1"
    });
    expect(order.createdAt.toISOString()).toBe("2026-07-02T12:00:00.000Z");
    expect(unitOfWork.products.get("product-1")?.stock).toBe(2);
    expect(unitOfWork.products.get("product-2")?.stock).toBe(9);
    expect(unitOfWork.savedOrders).toHaveLength(1);
  });

  it("rejects the order and preserves stock when inventory is insufficient", async () => {
    const unitOfWork = new InMemoryOrderUnitOfWork([
      { id: "product-1", name: "Keyboard", priceCents: 15000, stock: 1 }
    ]);
    const useCase = new CreateOrderUseCase(unitOfWork, new FixedClock());

    await expect(
      useCase.execute({
        items: [{ productId: "product-1", quantity: 2 }],
        userId: "user-1"
      })
    ).rejects.toBeInstanceOf(InsufficientStockError);

    expect(unitOfWork.products.get("product-1")?.stock).toBe(1);
    expect(unitOfWork.savedOrders).toHaveLength(0);
  });

  it("aggregates repeated products before validating stock and totals", async () => {
    const unitOfWork = new InMemoryOrderUnitOfWork([
      { id: "product-1", name: "Keyboard", priceCents: 15000, stock: 3 }
    ]);
    const useCase = new CreateOrderUseCase(unitOfWork, new FixedClock());

    const order = await useCase.execute({
      items: [
        { productId: "product-1", quantity: 1 },
        { productId: "product-1", quantity: 2 }
      ],
      userId: "user-1"
    });

    expect(order.items).toEqual([
      {
        productId: "product-1",
        quantity: 3,
        subtotalCents: 45000,
        unitPriceCents: 15000
      }
    ]);
    expect(unitOfWork.products.get("product-1")?.stock).toBe(0);
  });

  it("rolls back the saved order when stock debit fails", async () => {
    const unitOfWork = new InMemoryOrderUnitOfWork([
      { id: "product-1", name: "Keyboard", priceCents: 15000, stock: 3 }
    ]);
    unitOfWork.failOnDebit = true;
    const useCase = new CreateOrderUseCase(unitOfWork, new FixedClock());

    await expect(
      useCase.execute({
        items: [{ productId: "product-1", quantity: 1 }],
        userId: "user-1"
      })
    ).rejects.toThrow("decrement failed");

    expect(unitOfWork.products.get("product-1")?.stock).toBe(3);
    expect(unitOfWork.savedOrders).toHaveLength(0);
  });

  it("rejects blank user ids", async () => {
    const useCase = new CreateOrderUseCase(new InMemoryOrderUnitOfWork([]), new FixedClock());

    await expect(useCase.execute({ items: [{ productId: "product-1", quantity: 1 }], userId: " " }))
      .rejects.toBeInstanceOf(ValidationDomainError);
  });

  it("rejects empty orders", async () => {
    const useCase = new CreateOrderUseCase(new InMemoryOrderUnitOfWork([]), new FixedClock());

    await expect(useCase.execute({ items: [], userId: "user-1" })).rejects.toThrow(
      "Order must contain at least one item."
    );
  });

  it("rejects blank product ids", async () => {
    const useCase = new CreateOrderUseCase(new InMemoryOrderUnitOfWork([]), new FixedClock());

    await expect(useCase.execute({ items: [{ productId: " ", quantity: 1 }], userId: "user-1" }))
      .rejects.toThrow("Product id is required.");
  });

  it("rejects non-positive quantities", async () => {
    const useCase = new CreateOrderUseCase(new InMemoryOrderUnitOfWork([]), new FixedClock());

    await expect(useCase.execute({ items: [{ productId: "product-1", quantity: 0 }], userId: "user-1" }))
      .rejects.toThrow("Item quantity must be a positive integer.");
  });

  it("rejects missing products inside the transaction", async () => {
    const useCase = new CreateOrderUseCase(new InMemoryOrderUnitOfWork([]), new FixedClock());

    await expect(useCase.execute({ items: [{ productId: "missing", quantity: 1 }], userId: "user-1" }))
      .rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
