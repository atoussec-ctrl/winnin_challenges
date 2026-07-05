import { describe, expect, it } from "vitest";
import { ProductsRepository } from "./products.repository";

describe("ProductsRepository", () => {
  it("saves a product with a sequential id and a creation timestamp", async () => {
    const repository = new ProductsRepository();

    const first = await repository.saveProduct({ name: "Keyboard", priceCents: 15_000, stock: 5 });
    const second = await repository.saveProduct({ name: "Mouse", priceCents: 5_000, stock: 10 });

    expect(first.id).toBe("product-1");
    expect(second.id).toBe("product-2");
    expect(first.createdAt).toBeInstanceOf(Date);
  });

  it("finds a product by id and lists every stored product", async () => {
    const repository = new ProductsRepository();
    const product = await repository.saveProduct({ name: "Keyboard", priceCents: 15_000, stock: 5 });

    expect(await repository.findProductById(product.id)).toEqual(product);
    expect(await repository.findProductById("missing")).toBeUndefined();
    expect(await repository.listProducts()).toEqual([product]);
  });

  describe("as a ProductInventoryPort", () => {
    it("returns snapshots only for products that exist", async () => {
      const repository = new ProductsRepository();
      const product = await repository.saveProduct({ name: "Keyboard", priceCents: 15_000, stock: 5 });

      const snapshots = await repository.findProductsForUpdate([product.id, "missing"]);

      expect(snapshots).toEqual([
        { id: product.id, name: "Keyboard", priceCents: 15_000, stock: 5 }
      ]);
    });

    it("decrements stock for the given items", async () => {
      const repository = new ProductsRepository();
      const product = await repository.saveProduct({ name: "Keyboard", priceCents: 15_000, stock: 5 });

      await repository.decrementStock([{ productId: product.id, quantity: 2 }]);

      expect((await repository.findProductById(product.id))?.stock).toBe(3);
    });

    it("ignores debits for products that no longer exist", async () => {
      const repository = new ProductsRepository();

      await expect(
        repository.decrementStock([{ productId: "missing", quantity: 1 }])
      ).resolves.toBeUndefined();
    });
  });

  describe("snapshot and restore", () => {
    it("restores the exact state captured by a previous snapshot", async () => {
      const repository = new ProductsRepository();
      const product = await repository.saveProduct({ name: "Keyboard", priceCents: 15_000, stock: 5 });

      const snapshot = repository.snapshot();
      await repository.decrementStock([{ productId: product.id, quantity: 5 }]);
      expect((await repository.findProductById(product.id))?.stock).toBe(0);

      repository.restore(snapshot);

      expect((await repository.findProductById(product.id))?.stock).toBe(5);
    });

    it("does not let mutations after snapshot() leak into the captured copy", async () => {
      const repository = new ProductsRepository();
      const product = await repository.saveProduct({ name: "Keyboard", priceCents: 15_000, stock: 5 });

      const snapshot = repository.snapshot();
      await repository.saveProduct({ name: "Mouse", priceCents: 5_000, stock: 1 });

      repository.restore(snapshot);

      expect(await repository.listProducts()).toEqual([product]);
    });
  });
});
