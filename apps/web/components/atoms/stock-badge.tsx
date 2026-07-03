import { getStockTone } from "../../lib/stock";
import { cn } from "../../lib/utils";
import { toneClasses } from "./tone-classes";

export function StockBadge({ stock }: Readonly<{ stock: number }>) {
  return (
    <span
      className={cn(
        "inline-flex min-w-12 items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold tabular-nums",
        toneClasses[getStockTone(stock)]
      )}
    >
      {stock} un
    </span>
  );
}
