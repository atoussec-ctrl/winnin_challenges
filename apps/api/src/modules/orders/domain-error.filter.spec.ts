import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import {
  InsufficientStockError,
  ProductNotFoundError,
  ValidationDomainError
} from "@desafio/domain";
import { describe, expect, it } from "vitest";
import { DomainErrorFilter } from "./domain-error.filter";

describe("DomainErrorFilter", () => {
  const filter = new DomainErrorFilter();

  it("translates ProductNotFoundError into a 404", () => {
    expect(() => filter.catch(new ProductNotFoundError("product-1"))).toThrow(NotFoundException);
  });

  it("translates InsufficientStockError into a 409", () => {
    expect(() => filter.catch(new InsufficientStockError("product-1", 5, 2))).toThrow(
      ConflictException
    );
  });

  it("translates any other DomainError into a 400", () => {
    expect(() => filter.catch(new ValidationDomainError("bad input"))).toThrow(
      BadRequestException
    );
  });

  it("preserves the original error message", () => {
    try {
      filter.catch(new ValidationDomainError("bad input"));
      throw new Error("expected filter.catch to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as Error).message).toBe("bad input");
    }
  });
});
