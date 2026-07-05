import { randomUUID } from "node:crypto";
import type {
  Order,
  OrderTransactionContext,
  OrderUnitOfWorkPort,
  OrderWriterPort,
  ProductInventoryPort,
  ProductSnapshot,
  StockDebit
} from "@desafio/domain";
import type { Pool, PoolClient } from "pg";

interface ProductForUpdateRow {
  readonly id: string;
  readonly name: string;
  readonly price_cents: string;
  readonly stock: number;
}

// Inventario ligado ao client da transacao. findProductsForUpdate usa
// SELECT ... FOR UPDATE: trava as linhas dos produtos ate o COMMIT/ROLLBACK, de
// modo que dois pedidos concorrentes sobre o mesmo produto sao serializados
// pelo banco (o segundo espera o primeiro e enxerga o estoque ja debitado).
class PgTransactionalInventory implements ProductInventoryPort {
  public constructor(private readonly client: PoolClient) {}

  public async findProductsForUpdate(
    productIds: readonly string[]
  ): Promise<readonly ProductSnapshot[]> {
    const { rows } = await this.client.query<ProductForUpdateRow>(
      `SELECT id, name, price_cents, stock
       FROM products
       WHERE id = ANY($1::text[])
       ORDER BY id
       FOR UPDATE`,
      [productIds]
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      priceCents: Number(row.price_cents),
      stock: row.stock
    }));
  }

  public async decrementStock(items: readonly StockDebit[]): Promise<void> {
    for (const item of items) {
      await this.client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [
        item.quantity,
        item.productId
      ]);
    }
  }
}

class PgTransactionalOrders implements OrderWriterPort {
  public constructor(private readonly client: PoolClient) {}

  public nextOrderId(): string {
    return randomUUID();
  }

  public async save(order: Order): Promise<void> {
    await this.client.query(
      "INSERT INTO orders (id, user_id, total_cents, created_at) VALUES ($1, $2, $3, $4)",
      [order.id, order.userId, order.totalCents, order.createdAt]
    );

    for (const item of order.items) {
      await this.client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents, subtotal_cents)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.productId, item.quantity, item.unitPriceCents, item.subtotalCents]
      );
    }
  }
}

// Unit of Work real do Postgres: uma transacao por criacao de pedido. Rollback
// automatico em qualquer erro (estoque insuficiente, produto inexistente etc.),
// substituindo o snapshot/restore + mutex global do adapter in-memory pelo
// controle transacional e de lock do proprio banco.
export class PgOrderUnitOfWork implements OrderUnitOfWorkPort {
  public constructor(private readonly pool: Pool) {}

  public async execute<T>(work: (context: OrderTransactionContext) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await work({
        inventory: new PgTransactionalInventory(client),
        orders: new PgTransactionalOrders(client)
      });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
