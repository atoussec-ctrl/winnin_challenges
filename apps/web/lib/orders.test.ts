import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOrder,
  createProduct,
  createUser,
  listOrders,
  listProducts,
  listUsers
} from "./orders";

const user = {
  createdAt: "2026-07-03T00:00:00.000Z",
  email: "user@example.com",
  id: "user-1",
  name: "User"
};

const product = {
  createdAt: "2026-07-03T00:00:00.000Z",
  id: "product-1",
  name: "Keyboard",
  price: 150,
  stock: 2
};

const order = {
  createdAt: "2026-07-03T00:00:00.000Z",
  id: "order-1",
  items: [{ price: 150, product, quantity: 1 }],
  total: 150,
  user
};

function stubFetch(payload: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(payload),
    ok,
    status
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("orders API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("lists users", async () => {
    stubFetch({ data: { users: [user] } });

    await expect(listUsers()).resolves.toEqual([user]);
  });

  it("lists products", async () => {
    stubFetch({ data: { products: [product] } });

    await expect(listProducts()).resolves.toEqual([product]);
  });

  it("lists orders", async () => {
    stubFetch({ data: { orders: [order] } });

    await expect(listOrders()).resolves.toEqual([order]);
  });

  it("creates users sending the input variables", async () => {
    const fetchMock = stubFetch({ data: { createUser: user } });

    await expect(createUser({ email: user.email, name: user.name })).resolves.toEqual(user);

    const [, request] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(request.body)).toMatchObject({
      variables: { input: { email: user.email, name: user.name } }
    });
  });

  it("creates products", async () => {
    stubFetch({ data: { createProduct: product } });

    await expect(createProduct({ name: "Keyboard", price: 150, stock: 2 })).resolves.toEqual(
      product
    );
  });

  it("creates orders", async () => {
    stubFetch({ data: { createOrder: order } });

    await expect(
      createOrder({ items: [{ productId: product.id, quantity: 1 }], userId: user.id })
    ).resolves.toEqual(order);
  });

  it("uses the configured API base URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.internal:4000");
    const fetchMock = stubFetch({ data: { users: [] } });

    await listUsers();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.internal:4000/graphql",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("derives the base URL from the page location without env", async () => {
    vi.stubGlobal("window", {
      location: { hostname: "192.168.0.10", protocol: "http:" }
    });
    const fetchMock = stubFetch({ data: { users: [] } });

    await listUsers();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://192.168.0.10:3333/graphql",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("falls back to localhost outside the browser", async () => {
    vi.stubGlobal("window", undefined);
    const fetchMock = stubFetch({ data: { users: [] } });

    await listUsers();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/graphql",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on HTTP failures", async () => {
    stubFetch({}, false, 502);

    await expect(listUsers()).rejects.toThrow("Orders API request failed with status 502.");
  });

  it("throws GraphQL error messages", async () => {
    stubFetch({ errors: [{ message: "Email in use." }, { message: "Try again." }] });

    await expect(createUser({ email: "a@b.c", name: "A" })).rejects.toThrow(
      "Email in use.; Try again."
    );
  });

  it("throws when the response has no data", async () => {
    stubFetch({});

    await expect(listOrders()).rejects.toThrow("Orders API returned an empty response.");
  });
});
