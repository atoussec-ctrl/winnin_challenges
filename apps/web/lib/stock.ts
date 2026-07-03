export type StockTone = "danger" | "warning" | "success";

const LOW_STOCK_THRESHOLD = 5;

export function getStockTone(stock: number): StockTone {
  if (stock <= 0) {
    return "danger";
  }

  if (stock < LOW_STOCK_THRESHOLD) {
    return "warning";
  }

  return "success";
}
