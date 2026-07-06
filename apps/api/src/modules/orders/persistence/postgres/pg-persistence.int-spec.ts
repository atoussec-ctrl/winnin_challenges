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

  // DB-04: hasUserWithEmail + saveUser e check-then-act, nao atomico. Duas
  // criacoes concorrentes com o mesmo email passam ambas pelo fast-path e so o
  // indice unico do banco barra a segunda insercao - sem a traducao do erro
  // 23505, isso sobe como 500 em vez do 409 esperado.
  it("resolves a concurrent same-email race as a conflict, never as an unhandled error", async () => {
    const results = await Promise.allSettled([
      service.createUser({ email: "race@example.com", name: "First" }),
      service.createUser({ email: "race@example.com", name: "Second" })
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0]?.reason)).toMatch(/already in use/);
    expect(await service.listUsers()).toHaveLength(1);
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

  describe("indexes on the foreign key columns (DB-01)", () => {
    it.each([
      ["orders", "orders_user_id_idx"],
      ["order_items", "order_items_order_id_idx"],
      ["order_items", "order_items_product_id_idx"]
    ])("has an index on %s for %s", async (tableName, indexName) => {
      const { rows } = await pool.query(
        "SELECT 1 FROM pg_indexes WHERE tablename = $1 AND indexname = $2",
        [tableName, indexName]
      );

      expect(rows).toHaveLength(1);
    });
  });

  describe("CHECK constraints backing domain invariants (DB-02)", () => {
    it("rejects a product with negative stock", async () => {
      await expect(
        pool.query("INSERT INTO products (id, name, price_cents, stock) VALUES ($1, $2, $3, $4)", [
          "product-bad",
          "Teclado",
          100,
          -1
        ])
      ).rejects.toThrow(/violates check constraint/);
    });

    it("rejects a product with non-positive price", async () => {
      await expect(
        pool.query("INSERT INTO products (id, name, price_cents, stock) VALUES ($1, $2, $3, $4)", [
          "product-bad",
          "Teclado",
          0,
          1
        ])
      ).rejects.toThrow(/violates check constraint/);
    });

    it("rejects an order item with non-positive quantity", async () => {
      const user = await service.createUser({ email: "ana@example.com", name: "Ana" });
      const product = await service.createProduct({ name: "Teclado", price: 100, stock: 5 });
      await pool.query(
        "INSERT INTO orders (id, user_id, total_cents) VALUES ($1, $2, $3)",
        ["order-bad", user.id, 0]
      );

      await expect(
        pool.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents, subtotal_cents)
           VALUES ($1, $2, $3, $4, $5)`,
          ["order-bad", product.id, 0, 100, 0]
        )
      ).rejects.toThrow(/violates check constraint/);
    });

    it("rejects an order with negative total", async () => {
      const user = await service.createUser({ email: "ana@example.com", name: "Ana" });

      await expect(
        pool.query("INSERT INTO orders (id, user_id, total_cents) VALUES ($1, $2, $3)", [
          "order-bad",
          user.id,
          -1
        ])
      ).rejects.toThrow(/violates check constraint/);
    });
  });
});
