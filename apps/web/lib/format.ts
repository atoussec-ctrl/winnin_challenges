const compactFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  notation: "compact"
});

export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value);
}
