import { ValidationDomainError } from "../shared/domain-error";
import type { Clock, EntityId } from "../shared/types";
import { SystemClock } from "../shared/types";
import { InsufficientStockError, ProductNotFoundError } from "./order-errors";
import type {
  Order,
  OrderItemRequest,
  OrderLine,
  OrderUnitOfWorkPort,
  ProductSnapshot,
  StockDebit
} from "./order";

export interface CreateOrderCommand {
  readonly userId: EntityId;
  readonly items: readonly OrderItemRequest[];
}

export class CreateOrderUseCase {
  public constructor(
    private readonly unitOfWork: OrderUnitOfWorkPort,
    private readonly clock: Clock = new SystemClock()
  ) {}

  public async execute(command: CreateOrderCommand): Promise<Order> {
    const requestedItems = this.aggregateAndValidateItems(command);

    return this.unitOfWork.execute(async (transaction) => {
      const products = await transaction.inventory.findProductsForUpdate(
        requestedItems.map((item) => item.productId)
      );

      const productsById = new Map(products.map((product) => [product.id, product]));
      const orderLines = this.buildOrderLines(requestedItems, productsById);
      const order: Order = {
        createdAt: this.clock.now(),
        id: transaction.orders.nextOrderId(),
        items: orderLines,
        totalCents: orderLines.reduce((total, item) => total + item.subtotalCents, 0),
        userId: command.userId
      };

      await transaction.orders.save(order);
      await transaction.inventory.decrementStock(this.toStockDebits(orderLines));

      return order;
    });
  }

  private aggregateAndValidateItems(command: CreateOrderCommand): readonly OrderItemRequest[] {
    if (command.userId.trim().length === 0) {
      throw new ValidationDomainError("User id is required.");
    }

    if (command.items.length === 0) {
      throw new ValidationDomainError("Order must contain at least one item.");
    }

    const quantitiesByProduct = new Map<EntityId, number>();

    for (const item of command.items) {
      if (item.productId.trim().length === 0) {
        throw new ValidationDomainError("Product id is required.");
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new ValidationDomainError("Item quantity must be a positive integer.");
      }

      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity
      );
    }

    return [...quantitiesByProduct.entries()].map(([productId, quantity]) => ({
      productId,
      quantity
    }));
  }

  private buildOrderLines(
    requestedItems: readonly OrderItemRequest[],
    productsById: ReadonlyMap<EntityId, ProductSnapshot>
  ): readonly OrderLine[] {
    return requestedItems.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new ProductNotFoundError(item.productId);
      }

      if (product.stock < item.quantity) {
        throw new InsufficientStockError(product.id, item.quantity, product.stock);
      }

      return {
        productId: product.id,
        quantity: item.quantity,
        subtotalCents: product.priceCents * item.quantity,
        unitPriceCents: product.priceCents
      };
    });
  }

  private toStockDebits(orderLines: readonly OrderLine[]): readonly StockDebit[] {
    return orderLines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity
    }));
  }
}

