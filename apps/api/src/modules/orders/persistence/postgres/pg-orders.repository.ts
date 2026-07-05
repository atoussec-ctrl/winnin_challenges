import type { Order, OrderLine } from "@desafio/domain";
import type { Pool } from "pg";
import type { OrdersRepositoryPort } from "../../repository.ports";

interface OrderRow {
  readonly id: string;
  readonly user_id: string;
  readonly total_cents: string;
  readonly created_at: Date;
}

interface OrderItemRow {
  readonly order_id: string;
  readonly product_id: string;
  readonly quantity: number;
  readonly unit_price_cents: string;
  readonly subtotal_cents: string;
}

function toOrderLine(row: OrderItemRow): OrderLine {
  return {
    productId: row.product_id,
    quantity: row.quantity,
    subtotalCents: Number(row.subtotal_cents),
    unitPriceCents: Number(row.unit_price_cents)
  };
}

export class PgOrdersRepository implements OrdersRepositoryPort {
  public constructor(private readonly pool: Pool) {}

  public async listOrders(): Promise<readonly Order[]> {
    const { rows } = await this.pool.query<OrderRow>(
      "SELECT id, user_id, total_cents, created_at FROM orders ORDER BY created_at, id"
    );

    return this.hydrate(rows);
  }

  public async listOrdersByUserIds(
    userIds: readonly string[]
  ): Promise<ReadonlyMap<string, readonly Order[]>> {
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT id, user_id, total_cents, created_at
       FROM orders
       WHERE user_id = ANY($1::text[])
       ORDER BY created_at, id`,
      [userIds]
    );

    const orders = await this.hydrate(rows);
    const grouped = new Map<string, Order[]>();

    for (const order of orders) {
      const bucket = grouped.get(order.userId);
      if (bucket) {
        bucket.push(order);
      } else {
        grouped.set(order.userId, [order]);
      }
    }

    return grouped;
  }

  // Uma unica query de itens para todos os pedidos carregados (evita N+1 ao
  // hidratar as linhas de cada pedido).
  private async hydrate(orderRows: readonly OrderRow[]): Promise<Order[]> {
    if (orderRows.length === 0) {
      return [];
    }

    const orderIds = orderRows.map((row) => row.id);
    const { rows: itemRows } = await this.pool.query<OrderItemRow>(
      `SELECT order_id, product_id, quantity, unit_price_cents, subtotal_cents
       FROM order_items
       WHERE order_id = ANY($1::text[])`,
      [orderIds]
    );

    const itemsByOrder = new Map<string, OrderLine[]>();
    for (const item of itemRows) {
      const bucket = itemsByOrder.get(item.order_id);
      if (bucket) {
        bucket.push(toOrderLine(item));
      } else {
        itemsByOrder.set(item.order_id, [toOrderLine(item)]);
      }
    }

    return orderRows.map((row) => ({
      createdAt: row.created_at,
      id: row.id,
      items: itemsByOrder.get(row.id) ?? [],
      totalCents: Number(row.total_cents),
      userId: row.user_id
    }));
  }
}
