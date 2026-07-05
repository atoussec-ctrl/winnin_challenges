import { ConflictException } from "@nestjs/common";
import {
  CreateOrderUseCase,
  InsufficientStockError,
  ProductNotFoundError,
  ValidationDomainError,
  type OrderUnitOfWorkPort
} from "@desafio/domain";
import { describe, expect, it } from "vitest";
import { OrderUnitOfWork } from "./order-unit-of-work";
import { OrdersRepository } from "./orders.repository";
import { OrdersService } from "./orders.service";
import { ProductsRepository } from "./products.repository";
import type {
  OrdersRepositoryPort,
  ProductsRepositoryPort,
  StoredProduct,
  StoredUser,
  UsersRepositoryPort
} from "./repository.ports";
import { UsersRepository } from "./users.repository";

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

describe("OrdersService", () => {
  it("creates users, products and orders", async () => {
    const service = createService();
    const user = await service.createUser({
      email: "user@example.com",
      name: "User"
    });
    const product = await service.createProduct({
      name: "Keyboard",
      price: 150,
      stock: 2
    });

    const order = await service.createOrder({
      items: [{ productId: product.id, quantity: 1 }],
      userId: user.id
    });

    expect(order.total).toBe(150);
    expect(order.items[0]?.product.stock).toBe(1);
    expect(await service.listUsers()).toHaveLength(1);
    expect((await service.listProducts())[0]?.stock).toBe(1);
  });

  it("lists orders globally and by user", async () => {
    const service = createService();
    const firstUser = await service.createUser({ email: "first@example.com", name: "First" });
    const secondUser = await service.createUser({ email: "second@example.com", name: "Second" });
    const product = await service.createProduct({ name: "Keyboard", price: 100, stock: 5 });

    await service.createOrder({
      items: [{ productId: product.id, quantity: 1 }],
      userId: firstUser.id
    });
    await service.createOrder({
      items: [{ productId: product.id, quantity: 2 }],
      userId: secondUser.id
    });

    expect(await service.listOrders()).toHaveLength(2);

    const grouped = await service.listOrdersByUserIds([firstUser.id, secondUser.id, "missing"]);

    expect(grouped.get(firstUser.id)).toHaveLength(1);
    expect(grouped.get(secondUser.id)?.[0]?.total).toBe(200);
    expect(grouped.get("missing")).toEqual([]);
  });

  it("rejects duplicated emails ignoring case", async () => {
    const service = createService();
    await service.createUser({ email: "user@example.com", name: "User" });

    await expect(
      service.createUser({ email: "USER@example.com", name: "Other" })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects orders for unknown users", async () => {
    const service = createService();

    await expect(
      service.createOrder({
        items: [{ productId: "product-1", quantity: 1 }],
        userId: "missing"
      })
    ).rejects.toThrow("User missing was not found.");
  });

  it("rejects orders with missing products and keeps product stock unchanged", async () => {
    // A traducao para NotFoundException e responsabilidade do DomainErrorFilter
    // global (ver domain-error.filter.spec.ts); aqui o service so precisa
    // deixar o erro de dominio passar intacto.
    const service = createService();
    const user = await service.createUser({
      email: "user@example.com",
      name: "User"
    });

    await expect(
      service.createOrder({
        items: [{ productId: "missing", quantity: 1 }],
        userId: user.id
      })
    ).rejects.toThrow(ProductNotFoundError);

    expect(await service.listProducts()).toEqual([]);
  });

  it("serializes concurrent orders so stock is never oversold", async () => {
    const service = createService();
    const user = await service.createUser({ email: "user@example.com", name: "User" });
    const product = await service.createProduct({ name: "Keyboard", price: 100, stock: 1 });

    const results = await Promise.allSettled([
      service.createOrder({ items: [{ productId: product.id, quantity: 1 }], userId: user.id }),
      service.createOrder({ items: [{ productId: product.id, quantity: 1 }], userId: user.id })
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await service.listProducts())[0]?.stock).toBe(0);
    expect(await service.listOrders()).toHaveLength(1);
  });

  it("rejects orders with insufficient stock and rolls back state", async () => {
    const service = createService();
    const user = await service.createUser({
      email: "user@example.com",
      name: "User"
    });
    const product = await service.createProduct({
      name: "Keyboard",
      price: 150,
      stock: 1
    });

    await expect(
      service.createOrder({
        items: [{ productId: product.id, quantity: 2 }],
        userId: user.id
      })
    ).rejects.toThrow(InsufficientStockError);

    expect((await service.listProducts())[0]?.stock).toBe(1);
  });

  it("propagates domain validation errors unchanged", async () => {
    const service = createService();
    const user = await service.createUser({
      email: "user@example.com",
      name: "User"
    });

    await expect(
      service.createOrder({
        items: [],
        userId: user.id
      })
    ).rejects.toThrow(ValidationDomainError);
  });

  it("depends only on the repository ports, not on their concrete classes", async () => {
    // Fakes minimos que satisfazem as portas mas NAO sao instancias de
    // UsersRepository/ProductsRepository/OrdersRepository (sem os campos
    // privados delas) - so compila se OrdersService aceitar a interface.
    const fakeUser: StoredUser = {
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      email: "fake@example.com",
      id: "user-1",
      name: "Fake"
    };
    const users: UsersRepositoryPort = {
      findUserById: (userId) => Promise.resolve(userId === fakeUser.id ? fakeUser : undefined),
      hasUserWithEmail: () => Promise.resolve(false),
      listUsers: () => Promise.resolve([fakeUser]),
      saveUser: () => Promise.resolve(fakeUser)
    };
    const products: ProductsRepositoryPort = {
      findProductById: () => Promise.resolve(undefined),
      listProducts: () => Promise.resolve([]),
      saveProduct: (input): Promise<StoredProduct> =>
        Promise.resolve({
          createdAt: new Date("2026-07-03T00:00:00.000Z"),
          id: "product-1",
          ...input
        })
    };
    const orders: OrdersRepositoryPort = {
      listOrders: () => Promise.resolve([]),
      listOrdersByUserIds: () => Promise.resolve(new Map())
    };
    const service = new OrdersService(
      users,
      products,
      orders,
      new CreateOrderUseCase(new OrderUnitOfWork(new ProductsRepository(), new OrdersRepository()))
    );

    expect(await service.listUsers()).toEqual([
      { createdAt: fakeUser.createdAt, email: fakeUser.email, id: fakeUser.id, name: fakeUser.name }
    ]);
    expect(await service.listProducts()).toEqual([]);
    expect(await service.listOrders()).toEqual([]);
  });

  it("rethrows unknown errors from the unit of work untouched", async () => {
    const failure = new Error("infrastructure exploded");
    const brokenUnitOfWork: OrderUnitOfWorkPort = {
      execute: () => Promise.reject(failure)
    };
    const service = new OrdersService(
      new UsersRepository(),
      new ProductsRepository(),
      new OrdersRepository(),
      new CreateOrderUseCase(brokenUnitOfWork)
    );
    const user = await service.createUser({ email: "user@example.com", name: "User" });

    await expect(
      service.createOrder({
        items: [{ productId: "product-1", quantity: 1 }],
        userId: user.id
      })
    ).rejects.toBe(failure);
  });

  it("guards against missing users while mapping stored orders", async () => {
    const service = createService();
    const mapOrder = (service as unknown as {
      toOrderModel(order: {
        createdAt: Date;
        id: string;
        items: readonly [];
        totalCents: number;
        userId: string;
      }): Promise<unknown>;
    }).toOrderModel.bind(service);

    await expect(
      mapOrder({
        createdAt: new Date("2026-07-03T00:00:00.000Z"),
        id: "order-1",
        items: [],
        totalCents: 0,
        userId: "missing"
      })
    ).rejects.toThrow("User missing was not found.");
  });

  it("guards against missing products while mapping stored orders", async () => {
    const service = createService();
    const user = await service.createUser({
      email: "user@example.com",
      name: "User"
    });
    const mapOrder = (service as unknown as {
      toOrderModel(order: {
        createdAt: Date;
        id: string;
        items: readonly [
          {
            productId: string;
            quantity: number;
            subtotalCents: number;
            unitPriceCents: number;
          }
        ];
        totalCents: number;
        userId: string;
      }): Promise<unknown>;
    }).toOrderModel.bind(service);

    await expect(
      mapOrder({
        createdAt: new Date("2026-07-03T00:00:00.000Z"),
        id: "order-1",
        items: [
          {
            productId: "missing",
            quantity: 1,
            subtotalCents: 15000,
            unitPriceCents: 15000
          }
        ],
        totalCents: 15000,
        userId: user.id
      })
    ).rejects.toThrow("Product missing was not found.");
  });
});
