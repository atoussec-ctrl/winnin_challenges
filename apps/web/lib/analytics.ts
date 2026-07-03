import type { Order, OrderProduct, OrderUser } from "./orders";
import { getStockTone, type StockTone } from "./stock";

export interface OrdersKpis {
  readonly averageOrderValue: number;
  readonly lowStockCount: number;
  readonly outOfStockCount: number;
  readonly totalOrders: number;
  readonly totalRevenue: number;
  readonly totalUsers: number;
}

export interface DailyRevenuePoint {
  readonly date: string;
  readonly label: string;
  readonly orders: number;
  readonly revenue: number;
}

export interface ProductSales {
  readonly name: string;
  readonly productId: string;
  readonly quantity: number;
  readonly revenue: number;
}

export interface StockLevel {
  readonly name: string;
  readonly productId: string;
  readonly stock: number;
  readonly tone: StockTone;
}

export interface UserOrders {
  readonly name: string;
  readonly orders: number;
  readonly revenue: number;
  readonly userId: string;
}

export function calculateKpis(
  orders: readonly Order[],
  products: readonly OrderProduct[],
  users: readonly OrderUser[]
): OrdersKpis {
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const stockTones = products.map((product) => getStockTone(product.stock));

  return {
    averageOrderValue: orders.length === 0 ? 0 : totalRevenue / orders.length,
    lowStockCount: stockTones.filter((tone) => tone === "warning").length,
    outOfStockCount: stockTones.filter((tone) => tone === "danger").length,
    totalOrders: orders.length,
    totalRevenue,
    totalUsers: users.length
  };
}

function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildDailyRevenue(
  orders: readonly Order[],
  days: number,
  today: Date = new Date()
): readonly DailyRevenuePoint[] {
  const totalsByDay = new Map<string, { orders: number; revenue: number }>();

  for (const order of orders) {
    const key = order.createdAt.slice(0, 10);
    const totals = totalsByDay.get(key) ?? { orders: 0, revenue: 0 };
    totals.orders += 1;
    totals.revenue += order.total;
    totalsByDay.set(key, totals);
  }

  const series: DailyRevenuePoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = toUtcDayKey(day);
    const totals = totalsByDay.get(key) ?? { orders: 0, revenue: 0 };

    series.push({
      date: key,
      label: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
      orders: totals.orders,
      revenue: totals.revenue
    });
  }

  return series;
}

export function buildTopProducts(
  orders: readonly Order[],
  limit: number
): readonly ProductSales[] {
  const salesByProduct = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const sales = salesByProduct.get(item.product.id) ?? {
        name: item.product.name,
        quantity: 0,
        revenue: 0
      };
      sales.quantity += item.quantity;
      sales.revenue += item.price * item.quantity;
      salesByProduct.set(item.product.id, sales);
    }
  }

  return [...salesByProduct.entries()]
    .map(([productId, sales]) => ({
      name: sales.name,
      productId,
      quantity: sales.quantity,
      revenue: sales.revenue
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function buildStockLevels(
  products: readonly OrderProduct[],
  limit: number
): readonly StockLevel[] {
  return [...products]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, limit)
    .map((product) => ({
      name: product.name,
      productId: product.id,
      stock: product.stock,
      tone: getStockTone(product.stock)
    }));
}

export function buildOrdersByUser(
  orders: readonly Order[],
  limit: number
): readonly UserOrders[] {
  const ordersByUser = new Map<string, { name: string; orders: number; revenue: number }>();

  for (const order of orders) {
    const totals = ordersByUser.get(order.user.id) ?? {
      name: order.user.name,
      orders: 0,
      revenue: 0
    };
    totals.orders += 1;
    totals.revenue += order.total;
    ordersByUser.set(order.user.id, totals);
  }

  return [...ordersByUser.entries()]
    .map(([userId, totals]) => ({
      name: totals.name,
      orders: totals.orders,
      revenue: totals.revenue,
      userId
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
}
