const brlFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency"
});

export function formatCurrencyBRL(value: number): string {
  return brlFormatter.format(value);
}
