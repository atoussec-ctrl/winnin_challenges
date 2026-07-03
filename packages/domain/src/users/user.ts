import type { EntityId } from "../shared/types";

export interface User {
  readonly id: EntityId;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}

