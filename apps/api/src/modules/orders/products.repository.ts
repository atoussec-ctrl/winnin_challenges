import { Injectable } from "@nestjs/common";
import type { ProductInventoryPort, ProductSnapshot, StockDebit } from "@desafio/domain";
import type { ProductsRepositoryPort, StoredProduct } from "./repository.ports";

export type ProductsSnapshot = ReadonlyMap<string, StoredProduct>;

@Injectable()
export class ProductsRepository implements ProductInventoryPort, ProductsRepositoryPort {
  private products = new Map<string, StoredProduct>();
  private sequence = 1;

  public saveProduct(input: {
    readonly name: string;
    readonly priceCents: number;
    readonly stock: number;
  }): StoredProduct {
    const product: StoredProduct = {
      createdAt: new Date(),
      id: `product-${this.sequence++}`,
      name: input.name,
      priceCents: input.priceCents,
      stock: input.stock
    };

    this.products.set(product.id, product);
    return product;
  }

  public findProductById(productId: string): StoredProduct | undefined {
    return this.products.get(productId);
  }

  public listProducts(): readonly StoredProduct[] {
    return [...this.products.values()];
  }

  public findProductsForUpdate(
    productIds: readonly string[]
  ): Promise<readonly ProductSnapshot[]> {
    return Promise.resolve(
      productIds.flatMap((productId) => {
        const product = this.products.get(productId);

        return product
          ? [
              {
                id: product.id,
                name: product.name,
                priceCents: product.priceCents,
                stock: product.stock
              }
            ]
          : [];
      })
    );
  }

  public decrementStock(items: readonly StockDebit[]): Promise<void> {
    for (const item of items) {
      const product = this.products.get(item.productId);

      if (product) {
        this.products.set(product.id, { ...product, stock: product.stock - item.quantity });
      }
    }

    return Promise.resolve();
  }

  public snapshot(): ProductsSnapshot {
    return new Map([...this.products.entries()].map(([id, product]) => [id, { ...product }]));
  }

  public restore(snapshot: ProductsSnapshot): void {
    this.products = new Map(snapshot);
  }
}
