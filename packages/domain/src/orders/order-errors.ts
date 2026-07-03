import { DomainError } from "../shared/domain-error";
import type { EntityId } from "../shared/types";

export class ProductNotFoundError extends DomainError {
  public constructor(productId: EntityId) {
    super("PRODUCT_NOT_FOUND", `Product ${productId} was not found.`);
  }
}

export class InsufficientStockError extends DomainError {
  public constructor(
    public readonly productId: EntityId,
    public readonly requested: number,
    public readonly available: number
  ) {
    super(
      "INSUFFICIENT_STOCK",
      `Product ${productId} has ${available} units available, but ${requested} were requested.`
    );
  }
}

