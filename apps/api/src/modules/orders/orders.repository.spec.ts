import type { Order } from "@desafio/domain";
import { describe, expect, it } from "vitest";
import { OrdersRepository } from "./orders.repository";

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    createdAt: new Date("2026-07-03T00:00:00.000Z"),
    id: "order-1",
    items: [],
    totalCents: 0,
    userId: "user-1",
    ...overrides
  };
}

describe("OrdersRepository", () => {
  it("generates sequential order ids", () => {
    const repository = new OrdersRepository();

    expect(repository.nextOrderId()).toBe("order-1");
    expect(repository.nextOrderId()).toBe("order-2");
  });

  it("saves and lists orders", async () => {
    const repository = new OrdersRepository();
    const order = buildOrder();

    await repository.save(order);

    expect(repository.listOrders()).toEqual([order]);
  });

  it("lists orders filtered by user id", async () => {
    const repository = new OrdersRepository();
    const firstOrder = buildOrder({ id: "order-1", userId: "user-1" });
    const secondOrder = buildOrder({ id: "order-2", userId: "user-2" });
    await repository.save(firstOrder);
    await repository.save(secondOrder);

    expect(repository.listOrdersByUserId("user-1")).toEqual([firstOrder]);
  });

  describe("snapshot and restore", () => {
    it("restores the exact state captured by a previous snapshot", async () => {
      const repository = new OrdersRepository();
      const order = buildOrder();
      await repository.save(order);

      const snapshot = repository.snapshot();
      await repository.save(buildOrder({ id: "order-2" }));
      expect(repository.listOrders()).toHaveLength(2);

      repository.restore(snapshot);

      expect(repository.listOrders()).toEqual([order]);
    });
  });
});
