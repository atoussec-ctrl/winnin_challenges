import { CreateOrderUseCase } from "@desafio/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { OrdersService } from "../../orders.service";
import { PgOrderUnitOfWork } from "./pg-order-unit-of-work";
import { PgOrdersRepository } from "./pg-orders.repository";
import { PgProductsRepository } from "./pg-products.repository";
import { PgUsersRepository } from "./pg-users.repository";
import { ensureSchema } from "./schema";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/desafio";

function createService(pool: Pool): OrdersService {
  return new OrdersService(
    new PgUsersRepository(pool),
    new PgProductsRepository(pool),
    new PgOrdersRepository(pool),
    new CreateOrderUseCase(new PgOrderUnitOfWork(pool))
  );
}

describe("Postgres persistence (integration)", () => {
  let pool: Pool;
  let service: OrdersService;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    await ensureSchema(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE users, products, orders, order_items RESTART IDENTITY CASCADE");
    service = createService(pool);
  });

  it("persists and hydrates users, products and orders", async () => {
    const user = await service.createUser({ email: "ana@example.com", name: "Ana" });
    const product = await service.createProduct({ name: "Teclado", price: 200, stock: 5 });

    const order = await service.createOrder({
      items: [{ productId: product.id, quantity: 2 }],
      userId: user.id
    });

    expect(order.total).toBe(400);
    expect((await service.listProducts())[0]?.stock).toBe(3);

    const orders = await service.listOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0]?.user.name).toBe("Ana");
    expect(orders[0]?.items[0]?.quantity).toBe(2);
    expect(orders[0]?.items[0]?.product.name).toBe("Teclado");
  });

  it("enforces a case-insensitive unique email at the database level", async () => {
    await service.createUser({ email: "ana@example.com", name: "Ana" });

    await expect(service.createUser({ email: "ana@example.com", name: "Other" })).rejects.toThrow(
      /already in use/
    );
    await expect(
      service.createUser({ email: "ANA@EXAMPLE.COM", name: "Other" })
    ).rejects.toBeTruthy();
  });

  it("serializes concurrent orders with SELECT FOR UPDATE so stock is never oversold", async () => {
    const user = await service.createUser({ email: "ana@example.com", name: "Ana" });
    const product = await service.createProduct({ name: "Teclado", price: 100, stock: 1 });

    const results = await Promise.allSettled([
      service.createOrder({ items: [{ productId: product.id, quantity: 1 }], userId: user.id }),
      service.createOrder({ items: [{ productId: product.id, quantity: 1 }], userId: user.id })
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await service.listProducts())[0]?.stock).toBe(0);
    expect(await service.listOrders()).toHaveLength(1);
  });

  it("rolls back the whole order when stock is insufficient", async () => {
    const user = await service.createUser({ email: "ana@example.com", name: "Ana" });
    const product = await service.createProduct({ name: "Teclado", price: 100, stock: 1 });

    await expect(
      service.createOrder({ items: [{ productId: product.id, quantity: 2 }], userId: user.id })
    ).rejects.toThrow(/units available/);

    expect((await service.listProducts())[0]?.stock).toBe(1);
    expect(await service.listOrders()).toEqual([]);
  });

  it("survives a restart: a fresh repository reads previously committed data", async () => {
    const user = await service.createUser({ email: "ana@example.com", name: "Ana" });
    await service.createProduct({ name: "Teclado", price: 100, stock: 1 });

    // Instancias novas (como se o processo tivesse reiniciado) contra o mesmo banco.
    const fresh = createService(pool);

    expect(await fresh.listUsers()).toEqual([expect.objectContaining({ id: user.id })]);
    expect((await fresh.listProducts())[0]?.name).toBe("Teclado");
  });
});
