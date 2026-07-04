import { Injectable } from "@nestjs/common";
import type { OrderTransactionContext, OrderUnitOfWorkPort } from "@desafio/domain";
import { OrdersRepository } from "./orders.repository";
import { ProductsRepository } from "./products.repository";

@Injectable()
export class OrderUnitOfWork implements OrderUnitOfWorkPort {
  private queue: Promise<unknown> = Promise.resolve();

  public constructor(
    private readonly products: ProductsRepository,
    private readonly orders: OrdersRepository
  ) {}

  public execute<T>(work: (context: OrderTransactionContext) => Promise<T>): Promise<T> {
    const run = this.queue.then(() => this.runExclusive(work));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async runExclusive<T>(
    work: (context: OrderTransactionContext) => Promise<T>
  ): Promise<T> {
    const productsBackup = this.products.snapshot();
    const ordersBackup = this.orders.snapshot();

    try {
      return await work({ inventory: this.products, orders: this.orders });
    } catch (error) {
      this.products.restore(productsBackup);
      this.orders.restore(ordersBackup);
      throw error;
    }
  }
}
