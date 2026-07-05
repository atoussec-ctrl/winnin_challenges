import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { ProductsRepositoryPort, StoredProduct } from "../../repository.ports";

interface ProductRow {
  readonly id: string;
  readonly name: string;
  readonly price_cents: string;
  readonly stock: number;
  readonly created_at: Date;
}

// price_cents e bigint -> node-pg devolve string; centavos cabem em Number com
// folga no volume do desafio (mesma precisao do modelo in-memory).
export function toStoredProduct(row: ProductRow): StoredProduct {
  return {
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    priceCents: Number(row.price_cents),
    stock: row.stock
  };
}

export class PgProductsRepository implements ProductsRepositoryPort {
  public constructor(private readonly pool: Pool) {}

  public async saveProduct(input: {
    readonly name: string;
    readonly priceCents: number;
    readonly stock: number;
  }): Promise<StoredProduct> {
    const { rows } = await this.pool.query<ProductRow>(
      `INSERT INTO products (id, name, price_cents, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, price_cents, stock, created_at`,
      [randomUUID(), input.name, input.priceCents, input.stock]
    );

    return toStoredProduct(rows[0]!);
  }

  public async findProductById(productId: string): Promise<StoredProduct | undefined> {
    const { rows } = await this.pool.query<ProductRow>(
      "SELECT id, name, price_cents, stock, created_at FROM products WHERE id = $1",
      [productId]
    );

    return rows[0] ? toStoredProduct(rows[0]) : undefined;
  }

  public async listProducts(): Promise<readonly StoredProduct[]> {
    const { rows } = await this.pool.query<ProductRow>(
      "SELECT id, name, price_cents, stock, created_at FROM products ORDER BY created_at, id"
    );

    return rows.map(toStoredProduct);
  }
}
