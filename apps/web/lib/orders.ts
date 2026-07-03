import { resolveOrdersApiBaseUrl } from "./api-base-url";
import { postGraphql } from "./graphql-client";

export interface OrderUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: string;
}

export interface OrderProduct {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly stock: number;
  readonly createdAt: string;
}

export interface OrderItem {
  readonly product: OrderProduct;
  readonly quantity: number;
  readonly price: number;
}

export interface Order {
  readonly id: string;
  readonly user: OrderUser;
  readonly items: readonly OrderItem[];
  readonly total: number;
  readonly createdAt: string;
}

export interface CreateUserRequest {
  readonly name: string;
  readonly email: string;
}

export interface CreateProductRequest {
  readonly name: string;
  readonly price: number;
  readonly stock: number;
}

export interface CreateOrderRequest {
  readonly userId: string;
  readonly items: readonly { readonly productId: string; readonly quantity: number }[];
}

const USERS_QUERY = `
  query Users {
    users {
      id
      name
      email
      createdAt
    }
  }
`;

const PRODUCTS_QUERY = `
  query Products {
    products {
      id
      name
      price
      stock
      createdAt
    }
  }
`;

const ORDER_FIELDS = `
  id
  total
  createdAt
  user {
    id
    name
    email
    createdAt
  }
  items {
    quantity
    price
    product {
      id
      name
      price
      stock
      createdAt
    }
  }
`;

const ORDERS_QUERY = `
  query Orders {
    orders {
      ${ORDER_FIELDS}
    }
  }
`;

const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      createdAt
    }
  }
`;

const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      price
      stock
      createdAt
    }
  }
`;

const CREATE_ORDER_MUTATION = `
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      ${ORDER_FIELDS}
    }
  }
`;

async function requestOrdersApi<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  // Sem env, deriva do hostname da pagina para funcionar em dispositivos na rede local.
  const baseUrl = resolveOrdersApiBaseUrl(
    process.env.NEXT_PUBLIC_API_URL,
    typeof window === "undefined" ? undefined : window.location
  );
  return postGraphql<T>({
    endpoint: `${baseUrl}/graphql`,
    label: "Orders API",
    query,
    variables
  });
}

export async function listUsers(): Promise<readonly OrderUser[]> {
  const data = await requestOrdersApi<{ readonly users: readonly OrderUser[] }>(USERS_QUERY);
  return data.users;
}

export async function listProducts(): Promise<readonly OrderProduct[]> {
  const data = await requestOrdersApi<{ readonly products: readonly OrderProduct[] }>(
    PRODUCTS_QUERY
  );
  return data.products;
}

export async function listOrders(): Promise<readonly Order[]> {
  const data = await requestOrdersApi<{ readonly orders: readonly Order[] }>(ORDERS_QUERY);
  return data.orders;
}

export async function createUser(input: CreateUserRequest): Promise<OrderUser> {
  const data = await requestOrdersApi<{ readonly createUser: OrderUser }>(CREATE_USER_MUTATION, {
    input
  });
  return data.createUser;
}

export async function createProduct(input: CreateProductRequest): Promise<OrderProduct> {
  const data = await requestOrdersApi<{ readonly createProduct: OrderProduct }>(
    CREATE_PRODUCT_MUTATION,
    { input }
  );
  return data.createProduct;
}

export async function createOrder(input: CreateOrderRequest): Promise<Order> {
  const data = await requestOrdersApi<{ readonly createOrder: Order }>(CREATE_ORDER_MUTATION, {
    input
  });
  return data.createOrder;
}
