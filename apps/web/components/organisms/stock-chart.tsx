"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StockLevel } from "../../lib/analytics";
import { ChartCard } from "../molecules/chart-card";
import { ChartTooltip, type ChartTooltipRow } from "../molecules/chart-tooltip";

export interface StockChartProps {
  readonly data: readonly StockLevel[];
}

const toneLabels: Record<StockLevel["tone"], string> = {
  danger: "Sem estoque",
  success: "Saudavel",
  warning: "Baixo"
};

function tooltipRows(entry: unknown): readonly ChartTooltipRow[] {
  const level = entry as StockLevel;

  return [
    { label: "Estoque", value: `${level.stock} un` },
    { label: "Situacao", value: toneLabels[level.tone] }
  ];
}

export function StockChart({ data }: StockChartProps) {
  return (
    <ChartCard
      description="Produtos com menor estoque disponivel."
      emptyMessage="Nenhum produto cadastrado."
      hasData={data.length > 0}
      title="Estoque critico"
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
              <ChartTooltip rows={tooltipRows} title={(entry) => (entry as StockLevel).name} />
            }
            cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.5 }}
          />
          <Bar
            animationDuration={700}
            barSize={16}
            dataKey="stock"
            fill="var(--chart-accent)"
            radius={[0, 4, 4, 0]}
          >
            <LabelList dataKey="stock" fill="hsl(var(--muted-foreground))" fontSize={11} position="right" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
