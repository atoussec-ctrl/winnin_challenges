import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateOrderInput, CreateProductInput, CreateUserInput } from "./order.models";

describe("CreateUserInput", () => {
  it("accepts a well-formed user", () => {
    const errors = validateSync(
      plainToInstance(CreateUserInput, { email: "maria@example.com", name: "Maria" })
    );

    expect(errors).toHaveLength(0);
  });

  it("rejects a blank name", () => {
    const errors = validateSync(plainToInstance(CreateUserInput, { email: "maria@example.com", name: " " }));

    expect(errors.some((error) => error.property === "name")).toBe(true);
  });

  it("rejects an invalid email format", () => {
    const errors = validateSync(plainToInstance(CreateUserInput, { email: "invalid", name: "Maria" }));

    expect(errors.some((error) => error.property === "email")).toBe(true);
  });
});

describe("CreateProductInput", () => {
  it("accepts a well-formed product", () => {
    const errors = validateSync(
      plainToInstance(CreateProductInput, { name: "Keyboard", price: 150, stock: 2 })
    );

    expect(errors).toHaveLength(0);
  });

  it("rejects a blank name", () => {
    const errors = validateSync(plainToInstance(CreateProductInput, { name: " ", price: 150, stock: 2 }));

    expect(errors.some((error) => error.property === "name")).toBe(true);
  });

  it.each([0, -1, 1_000_000_001])("rejects an out-of-range price %s", (price) => {
    const errors = validateSync(plainToInstance(CreateProductInput, { name: "Keyboard", price, stock: 2 }));

    expect(errors.some((error) => error.property === "price")).toBe(true);
  });

  it.each([-1, 1.5, 1_000_001])("rejects an out-of-range or non-integer stock %s", (stock) => {
    const errors = validateSync(
      plainToInstance(CreateProductInput, { name: "Keyboard", price: 150, stock })
    );

    expect(errors.some((error) => error.property === "stock")).toBe(true);
  });
});

describe("CreateOrderInput", () => {
  it("accepts a well-formed order", () => {
    const errors = validateSync(
      plainToInstance(CreateOrderInput, {
        items: [{ productId: "product-1", quantity: 1 }],
        userId: "user-1"
      })
    );

    expect(errors).toHaveLength(0);
  });

  it("rejects an empty item list", () => {
    const errors = validateSync(plainToInstance(CreateOrderInput, { items: [], userId: "user-1" }));

    expect(errors.some((error) => error.property === "items")).toBe(true);
  });

  it("rejects more than 100 items", () => {
    const items = Array.from({ length: 101 }, (_, index) => ({
      productId: `product-${index}`,
      quantity: 1
    }));

    const errors = validateSync(plainToInstance(CreateOrderInput, { items, userId: "user-1" }));

    expect(errors.some((error) => error.property === "items")).toBe(true);
  });

  it.each([0, -1, 1.5, 10_001])("rejects an out-of-range item quantity %s", (quantity) => {
    const errors = validateSync(
      plainToInstance(CreateOrderInput, {
        items: [{ productId: "product-1", quantity }],
        userId: "user-1"
      })
    );

    expect(errors.some((error) => error.property === "items")).toBe(true);
  });

  it("rejects an item with a blank product id", () => {
    const errors = validateSync(
      plainToInstance(CreateOrderInput, {
        items: [{ productId: " ", quantity: 1 }],
        userId: "user-1"
      })
    );

    expect(errors.some((error) => error.property === "items")).toBe(true);
  });
});
