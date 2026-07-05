import { describe, expect, it } from "vitest";
import { OrderUnitOfWork } from "./order-unit-of-work";
import { OrdersRepository } from "./orders.repository";
import { ProductsRepository } from "./products.repository";

describe("OrderUnitOfWork", () => {
  it("exposes the products and orders repositories as the transaction context", async () => {
    const products = new ProductsRepository();
    const orders = new OrdersRepository();
    const unitOfWork = new OrderUnitOfWork(products, orders);

    await unitOfWork.execute((context) => {
      expect(context.inventory).toBe(products);
      expect(context.orders).toBe(orders);
      return Promise.resolve();
    });
  });

  it("serializes concurrent transactions", async () => {
    const unitOfWork = new OrderUnitOfWork(new ProductsRepository(), new OrdersRepository());
    const order: string[] = [];

    await Promise.all([
      unitOfWork.execute(async () => {
        order.push("first-start");
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push("first-end");
      }),
      unitOfWork.execute(() => {
        order.push("second-start");
        order.push("second-end");
        return Promise.resolve();
      })
    ]);

    expect(order).toEqual(["first-start", "first-end", "second-start", "second-end"]);
  });

  it("rolls back a stock debit that already happened once a later step fails", async () => {
    const products = new ProductsRepository();
    const orders = new OrdersRepository();
    const product = await products.saveProduct({ name: "Keyboard", priceCents: 15_000, stock: 5 });
    const unitOfWork = new OrderUnitOfWork(products, orders);
    const failure = new Error("payment gateway unavailable");

    await expect(
      unitOfWork.execute(async (context) => {
        // Simula um caso de uso que debita estoque com sucesso e SO DEPOIS falha
        // (ex.: uma etapa seguinte da transacao dando erro) - o commit parcial
        // (decrementStock) precisa ser desfeito mesmo sem tocar em orders.
        await context.inventory.decrementStock([{ productId: product.id, quantity: 2 }]);
        throw failure;
      })
    ).rejects.toBe(failure);

    expect((await products.findProductById(product.id))?.stock).toBe(5);
    expect(await orders.listOrders()).toEqual([]);
  });

  it("rolls back an order that was already saved once a later step fails", async () => {
    const products = new ProductsRepository();
    const orders = new OrdersRepository();
    const unitOfWork = new OrderUnitOfWork(products, orders);
    const failure = new Error("unexpected infrastructure error");

    await expect(
      unitOfWork.execute(async (context) => {
        await context.orders.save({
          createdAt: new Date("2026-07-03T00:00:00.000Z"),
          id: context.orders.nextOrderId(),
          items: [],
          totalCents: 0,
          userId: "user-1"
        });
        throw failure;
      })
    ).rejects.toBe(failure);

    expect(await orders.listOrders()).toEqual([]);
  });

  it("keeps the committed state when the work succeeds", async () => {
    const products = new ProductsRepository();
    const orders = new OrdersRepository();
    const product = await products.saveProduct({ name: "Keyboard", priceCents: 15_000, stock: 5 });
    const unitOfWork = new OrderUnitOfWork(products, orders);

    await unitOfWork.execute(async (context) => {
      await context.inventory.decrementStock([{ productId: product.id, quantity: 2 }]);
      await context.orders.save({
        createdAt: new Date("2026-07-03T00:00:00.000Z"),
        id: context.orders.nextOrderId(),
        items: [],
        totalCents: 0,
        userId: "user-1"
      });
    });

    expect((await products.findProductById(product.id))?.stock).toBe(3);
    expect(await orders.listOrders()).toHaveLength(1);
  });
});
