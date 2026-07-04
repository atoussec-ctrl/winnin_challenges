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

  public listOrders(): readonly Order[] {
    return [...this.orders.values()];
  }

  public listOrdersByUserId(userId: string): readonly Order[] {
    return [...this.orders.values()].filter((order) => order.userId === userId);
  }

  public snapshot(): OrdersSnapshot {
    return new Map(this.orders);
  }

  public restore(snapshot: OrdersSnapshot): void {
    this.orders = new Map(snapshot);
  }
}
