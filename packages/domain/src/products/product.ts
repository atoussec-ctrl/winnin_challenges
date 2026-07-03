import type { EntityId, MoneyCents } from "../shared/types";

export interface Product {
  readonly id: EntityId;
  readonly name: string;
  readonly priceCents: MoneyCents;
  readonly stock: number;
  readonly createdAt: Date;
}

