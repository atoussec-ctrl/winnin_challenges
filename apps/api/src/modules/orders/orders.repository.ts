import { Injectable } from "@nestjs/common";
import type { Order, OrderWriterPort } from "@desafio/domain";
import type { OrdersRepositoryPort } from "./repository.ports";

export type OrdersSnapshot = ReadonlyMap<string, Order>;

@Injectable()
export class OrdersRepository implements OrderWriterPort, OrdersRepositoryPort {
  private orders = new Map<string, Order>();
  private sequence = 1;

  public nextOrderId(): string {
    return `order-${this.sequence++}`;
  }

  public save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
    return Promise.resolve();
  }

  public listOrders(): Promise<readonly Order[]> {
    return Promise.resolve([...this.orders.values()]);
  }

  // Agrupa em uma unica varredura da colecao, independente de quantos ids
  // forem pedidos - e o que permite ao DataLoader (orders-by-user.loader.ts)
  // resolver o field resolver User.orders sem problema de N+1.
  public listOrdersByUserIds(
    userIds: readonly string[]
  ): Promise<ReadonlyMap<string, readonly Order[]>> {
    const requested = new Set(userIds);
    const grouped = new Map<string, Order[]>();

    for (const order of this.orders.values()) {
      if (!requested.has(order.userId)) {
        continue;
      }

      const bucket = grouped.get(order.userId);

      if (bucket) {
        bucket.push(order);
      } else {
        grouped.set(order.userId, [order]);
      }
    }

    return Promise.resolve(grouped);
  }

  public snapshot(): OrdersSnapshot {
    return new Map(this.orders);
  }

  public restore(snapshot: OrdersSnapshot): void {
    this.orders = new Map(snapshot);
  }
}
