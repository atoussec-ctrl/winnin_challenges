import type { Order } from "@desafio/domain";

export interface StoredUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}

export interface StoredProduct {
  readonly id: string;
  readonly name: string;
  readonly priceCents: number;
  readonly stock: number;
  readonly createdAt: Date;
}

// Portas consumidas pelo OrdersService (camada de aplicacao). Distintas das
// portas de dominio (ProductInventoryPort/OrderWriterPort em @desafio/domain),
// que descrevem o que o caso de uso precisa dentro de uma transacao; estas
// aqui descrevem o que o service precisa para CRUD/consulta fora dela.
export interface UsersRepositoryPort {
  saveUser(input: { readonly name: string; readonly email: string }): StoredUser;
  findUserById(userId: string): StoredUser | undefined;
  hasUserWithEmail(email: string): boolean;
  listUsers(): readonly StoredUser[];
}

export interface ProductsRepositoryPort {
  saveProduct(input: {
    readonly name: string;
    readonly priceCents: number;
    readonly stock: number;
  }): StoredProduct;
  findProductById(productId: string): StoredProduct | undefined;
  listProducts(): readonly StoredProduct[];
}

export interface OrdersRepositoryPort {
  listOrders(): readonly Order[];
  listOrdersByUserId(userId: string): readonly Order[];
}

export const USERS_REPOSITORY = Symbol("USERS_REPOSITORY");
export const PRODUCTS_REPOSITORY = Symbol("PRODUCTS_REPOSITORY");
export const ORDERS_REPOSITORY = Symbol("ORDERS_REPOSITORY");
