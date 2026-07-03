"use client";

export interface ChartTooltipRow {
  readonly label: string;
  readonly value: string;
}

export interface ChartTooltipProps {
  readonly active?: boolean;
  readonly label?: string | number;
  readonly payload?: readonly { readonly payload?: unknown }[];
  readonly rows: (entry: unknown) => readonly ChartTooltipRow[];
  readonly title?: (entry: unknown, label?: string | number) => string;
}

export function ChartTooltip({ active, label, payload, rows, title }: ChartTooltipProps) {
  const entry = payload?.[0]?.payload;

  if (!active || entry === undefined) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-background p-2.5 text-xs shadow-md">
      <p className="mb-1 font-medium">{title ? title(entry, label) : String(label ?? "")}</p>
      <dl className="flex flex-col gap-0.5">
        {rows(entry).map((row) => (
          <div className="flex items-center justify-between gap-4" key={row.label}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
