import { CreateOrderUseCase } from "@desafio/domain";
import { describe, expect, it, vi } from "vitest";
import { OrderUnitOfWork } from "../order-unit-of-work";
import { OrdersRepository } from "../orders.repository";
import { OrdersService } from "../orders.service";
import { ProductsRepository } from "../products.repository";
import { UsersRepository } from "../users.repository";
import { OrdersByUserLoader } from "./orders-by-user.loader";

function createService(): OrdersService {
  const products = new ProductsRepository();
  const orders = new OrdersRepository();
  return new OrdersService(
    new UsersRepository(),
    products,
    orders,
    new CreateOrderUseCase(new OrderUnitOfWork(products, orders))
  );
}

describe("OrdersByUserLoader", () => {
  it("batches loads for multiple users requested in the same tick into a single service call", async () => {
    const service = createService();
    const user = await service.createUser({ email: "user@example.com", name: "User" });
    const other = await service.createUser({ email: "other@example.com", name: "Other" });
    const product = await service.createProduct({ name: "Keyboard", price: 100, stock: 5 });
    await service.createOrder({
      items: [{ productId: product.id, quantity: 1 }],
      userId: user.id
    });

    const listOrdersByUserIds = vi.spyOn(service, "listOrdersByUserIds");
    const loader = new OrdersByUserLoader(service);

    const [userOrders, otherOrders] = await Promise.all([
      loader.load(user.id),
      loader.load(other.id)
    ]);

    expect(listOrdersByUserIds).toHaveBeenCalledTimes(1);
    expect(listOrdersByUserIds).toHaveBeenCalledWith([user.id, other.id]);
    expect(userOrders).toHaveLength(1);
    expect(otherOrders).toHaveLength(0);
  });

  it("returns an empty array for a user without orders", async () => {
    const service = createService();
    const user = await service.createUser({ email: "user@example.com", name: "User" });
    const loader = new OrdersByUserLoader(service);

    expect(await loader.load(user.id)).toEqual([]);
  });
});
