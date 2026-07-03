import { describe, expect, it } from "vitest";
import {
  buildDailyRevenue,
  buildOrdersByUser,
  buildStockLevels,
  buildTopProducts,
  calculateKpis
} from "./analytics";
import type { Order, OrderProduct, OrderUser } from "./orders";

const users: readonly OrderUser[] = [
  { createdAt: "2026-07-01T10:00:00.000Z", email: "ana@example.com", id: "user-1", name: "Ana" },
  { createdAt: "2026-07-01T11:00:00.000Z", email: "bia@example.com", id: "user-2", name: "Bia" }
];

const products: readonly OrderProduct[] = [
  { createdAt: "2026-07-01T09:00:00.000Z", id: "product-1", name: "Teclado", price: 100, stock: 8 },
  { createdAt: "2026-07-01T09:00:00.000Z", id: "product-2", name: "Mouse", price: 50, stock: 2 },
  { createdAt: "2026-07-01T09:00:00.000Z", id: "product-3", name: "Monitor", price: 900, stock: 0 }
];

function order(
  id: string,
  userIndex: number,
  createdAt: string,
  items: readonly { productIndex: number; quantity: number }[]
): Order {
  const orderItems = items.map(({ productIndex, quantity }) => {
    const product = products[productIndex];
    if (!product) {
      throw new Error(`invalid productIndex ${productIndex}`);
    }
    return { price: product.price, product, quantity };
  });
  const user = users[userIndex];
  if (!user) {
    throw new Error(`invalid userIndex ${userIndex}`);
  }

  return {
    createdAt,
    id,
    items: orderItems,
    total: orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    user
  };
}

const orders: readonly Order[] = [
  order("order-1", 0, "2026-07-01T12:00:00.000Z", [{ productIndex: 0, quantity: 2 }]),
  order("order-2", 0, "2026-07-02T12:00:00.000Z", [
    { productIndex: 1, quantity: 4 },
    { productIndex: 2, quantity: 1 }
  ]),
  order("order-3", 1, "2026-07-02T15:00:00.000Z", [{ productIndex: 1, quantity: 1 }])
];

describe("calculateKpis", () => {
  it("aggregates revenue, orders, ticket and stock alerts", () => {
    expect(calculateKpis(orders, products, users)).toEqual({
      averageOrderValue: 450,
      lowStockCount: 1,
      outOfStockCount: 1,
      totalOrders: 3,
      totalRevenue: 1350,
      totalUsers: 2
    });
  });

  it("handles empty data without dividing by zero", () => {
    expect(calculateKpis([], [], [])).toEqual({
      averageOrderValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalUsers: 0
    });
  });
});

describe("buildDailyRevenue", () => {
  it("zero-fills the window and sums revenue per UTC day", () => {
    const series = buildDailyRevenue(orders, 3, new Date("2026-07-03T18:00:00.000Z"));

    expect(series).toEqual([
      { date: "2026-07-01", label: "01/07", orders: 1, revenue: 200 },
      { date: "2026-07-02", label: "02/07", orders: 2, revenue: 1150 },
      { date: "2026-07-03", label: "03/07", orders: 0, revenue: 0 }
    ]);
  });

  it("ignores orders older than the window", () => {
    const series = buildDailyRevenue(orders, 1, new Date("2026-07-03T18:00:00.000Z"));

    expect(series).toEqual([{ date: "2026-07-03", label: "03/07", orders: 0, revenue: 0 }]);
  });
});

describe("buildTopProducts", () => {
  it("ranks products by quantity sold with revenue", () => {
    expect(buildTopProducts(orders, 2)).toEqual([
      { name: "Mouse", productId: "product-2", quantity: 5, revenue: 250 },
      { name: "Teclado", productId: "product-1", quantity: 2, revenue: 200 }
    ]);
  });

  it("returns empty for no orders", () => {
    expect(buildTopProducts([], 5)).toEqual([]);
  });
});

describe("buildStockLevels", () => {
  it("sorts most critical stock first with tones", () => {
    expect(buildStockLevels(products, 2)).toEqual([
      { name: "Monitor", productId: "product-3", stock: 0, tone: "danger" },
      { name: "Mouse", productId: "product-2", stock: 2, tone: "warning" }
    ]);
  });
});

describe("buildOrdersByUser", () => {
  it("ranks users by order count with revenue", () => {
    expect(buildOrdersByUser(orders, 5)).toEqual([
      { name: "Ana", orders: 2, revenue: 1300, userId: "user-1" },
      { name: "Bia", orders: 1, revenue: 50, userId: "user-2" }
    ]);
  });
});
