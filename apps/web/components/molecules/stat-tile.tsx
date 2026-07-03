"use client";

import { Card } from "../atoms/card";
import { AnimatedNumber } from "./animated-number";

export interface StatTileProps {
  readonly format?: (value: number) => string;
  readonly hint?: string;
  readonly label: string;
  readonly value: number;
}

export function StatTile({ format, hint, label, value }: StatTileProps) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold leading-8">
        <AnimatedNumber format={format} value={value} />
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Card>
  );
}
