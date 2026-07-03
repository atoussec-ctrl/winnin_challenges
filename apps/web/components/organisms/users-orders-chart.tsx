"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { UserOrders } from "../../lib/analytics";
import { formatCurrencyBRL } from "../../lib/money";
import { ChartCard } from "../molecules/chart-card";
import { ChartTooltip, type ChartTooltipRow } from "../molecules/chart-tooltip";

export interface UsersOrdersChartProps {
  readonly data: readonly UserOrders[];
}

function tooltipRows(entry: unknown): readonly ChartTooltipRow[] {
  const totals = entry as UserOrders;

  return [
    { label: "Pedidos", value: String(totals.orders) },
    { label: "Receita", value: formatCurrencyBRL(totals.revenue) }
  ];
}

export function UsersOrdersChart({ data }: UsersOrdersChartProps) {
  return (
    <ChartCard
      description="Usuarios com mais pedidos emitidos."
      emptyMessage="Sem pedidos registrados."
      hasData={data.length > 0}
      title="Pedidos por usuario"
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
              <ChartTooltip rows={tooltipRows} title={(entry) => (entry as UserOrders).name} />
            }
            cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.5 }}
          />
          <Bar
            animationDuration={700}
            barSize={16}
            dataKey="orders"
            fill="var(--chart-accent)"
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="orders"
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
