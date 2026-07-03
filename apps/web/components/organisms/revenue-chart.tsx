"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DailyRevenuePoint } from "../../lib/analytics";
import { formatCompactNumber } from "../../lib/format";
import { formatCurrencyBRL } from "../../lib/money";
import { ChartCard } from "../molecules/chart-card";
import { ChartTooltip, type ChartTooltipRow } from "../molecules/chart-tooltip";

export interface RevenueChartProps {
  readonly data: readonly DailyRevenuePoint[];
}

function tooltipRows(entry: unknown): readonly ChartTooltipRow[] {
  const point = entry as DailyRevenuePoint;

  return [
    { label: "Receita", value: formatCurrencyBRL(point.revenue) },
    { label: "Pedidos", value: String(point.orders) }
  ];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const hasData = data.some((point) => point.orders > 0);

  return (
    <ChartCard
      description="Receita diaria dos ultimos 14 dias."
      emptyMessage="Sem pedidos no periodo."
      hasData={hasData}
      title="Receita"
    >
      <ResponsiveContainer height={240} width="100%">
        <AreaChart data={[...data]} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeWidth={1} vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            interval="preserveStartEnd"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={(value: number) => formatCompactNumber(value)}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip rows={tooltipRows} />}
            cursor={{ stroke: "var(--chart-grid)" }}
          />
          <Area
            animationDuration={700}
            dataKey="revenue"
            dot={false}
            fill="var(--chart-accent)"
            fillOpacity={0.1}
            stroke="var(--chart-accent)"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
