"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProductSales } from "../../lib/analytics";
import { formatCurrencyBRL } from "../../lib/money";
import { ChartCard } from "../molecules/chart-card";
import { ChartTooltip, type ChartTooltipRow } from "../molecules/chart-tooltip";

export interface TopProductsChartProps {
  readonly data: readonly ProductSales[];
}

function tooltipRows(entry: unknown): readonly ChartTooltipRow[] {
  const sales = entry as ProductSales;

  return [
    { label: "Unidades", value: String(sales.quantity) },
    { label: "Receita", value: formatCurrencyBRL(sales.revenue) }
  ];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  return (
    <ChartCard
      description="Produtos mais vendidos por unidades."
      emptyMessage="Sem vendas registradas."
      hasData={data.length > 0}
      title="Mais vendidos"
    >
      <ResponsiveContainer height={240} width="100%">
        <BarChart
          data={[...data]}
          layout="vertical"
          margin={{ bottom: 0, left: 0, right: 32, top: 0 }}
        >
          <XAxis hide type="number" />
          <YAxis
            axisLine={false}
            dataKey="name"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
            tickLine={false}
            type="category"
            width={104}
          />
          <Tooltip
            content={
              <ChartTooltip rows={tooltipRows} title={(entry) => (entry as ProductSales).name} />
            }
            cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.5 }}
          />
          <Bar
            animationDuration={700}
            barSize={16}
            dataKey="quantity"
            fill="var(--chart-accent)"
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="quantity"
              fill="hsl(var(--muted-foreground))"
              fontSize={11}
              position="right"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
