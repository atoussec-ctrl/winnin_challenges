import type { EntityId, MoneyCents } from "../shared/types";

export interface OrderItemRequest {
  readonly productId: EntityId;
  readonly quantity: number;
}

export interface ProductSnapshot {
  readonly id: EntityId;
  readonly name: string;
  readonly priceCents: MoneyCents;
  readonly stock: number;
}

export interface OrderLine {
  readonly productId: EntityId;
  readonly quantity: number;
  readonly unitPriceCents: MoneyCents;
  readonly subtotalCents: MoneyCents;
}

export interface Order {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly items: readonly OrderLine[];
  readonly totalCents: MoneyCents;
  readonly createdAt: Date;
}

export interface StockDebit {
  readonly productId: EntityId;
  readonly quantity: number;
}

export interface ProductInventoryPort {
  findProductsForUpdate(productIds: readonly EntityId[]): Promise<readonly ProductSnapshot[]>;
  decrementStock(items: readonly StockDebit[]): Promise<void>;
}

export interface OrderWriterPort {
  nextOrderId(): EntityId;
  save(order: Order): Promise<void>;
}

export interface OrderTransactionContext {
  readonly inventory: ProductInventoryPort;
  readonly orders: OrderWriterPort;
}

export interface OrderUnitOfWorkPort {
  execute<T>(work: (context: OrderTransactionContext) => Promise<T>): Promise<T>;
}

