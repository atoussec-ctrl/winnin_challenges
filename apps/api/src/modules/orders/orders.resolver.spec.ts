import { CreateOrderUseCase } from "@desafio/domain";
import { describe, expect, it } from "vitest";
import { OrderUnitOfWork } from "./order-unit-of-work";
import { OrdersRepository } from "./orders.repository";
import { OrdersResolver } from "./orders.resolver";
import { OrdersService } from "./orders.service";
import { ProductsRepository } from "./products.repository";
import { UsersRepository } from "./users.repository";

function createResolver(): OrdersResolver {
  const products = new ProductsRepository();
  const orders = new OrdersRepository();
  const service = new OrdersService(
    new UsersRepository(),
    products,
    orders,
    new CreateOrderUseCase(new OrderUnitOfWork(products, orders))
  );

  return new OrdersResolver(service);
}

describe("OrdersResolver", () => {
  it("wires queries and mutations end to end", async () => {
    const resolver = createResolver();

    const user = resolver.createUser({ email: "user@example.com", name: "User" });
    const product = resolver.createProduct({ name: "Keyboard", price: 150, stock: 3 });
    const order = await resolver.createOrder({
      items: [{ productId: product.id, quantity: 2 }],
      userId: user.id
    });

    expect(order.total).toBe(300);
    expect(resolver.users()).toHaveLength(1);
    expect(resolver.products()[0]?.stock).toBe(1);
    expect(resolver.orders()).toHaveLength(1);
  });

  it("resolves the orders field for a user", async () => {
    const resolver = createResolver();

    const user = resolver.createUser({ email: "user@example.com", name: "User" });
    const other = resolver.createUser({ email: "other@example.com", name: "Other" });
    const product = resolver.createProduct({ name: "Keyboard", price: 100, stock: 5 });
    await resolver.createOrder({
      items: [{ productId: product.id, quantity: 1 }],
      userId: user.id
    });

    expect(resolver.userOrders(user)).toHaveLength(1);
    expect(resolver.userOrders(other)).toHaveLength(0);
  });
});
