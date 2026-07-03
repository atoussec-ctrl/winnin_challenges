"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../atoms/card";

export interface ChartCardProps {
  readonly children: ReactNode;
  readonly description: string;
  readonly emptyMessage: string;
  readonly hasData: boolean;
  readonly title: string;
}

export function ChartCard({ children, description, emptyMessage, hasData, title }: ChartCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 justify-center">
        {hasData ? (
          children
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
