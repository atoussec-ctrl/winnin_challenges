import { Button } from "../atoms/button";

export interface ErrorFallbackProps {
  readonly title?: string;
  readonly description?: string;
  readonly onRetry: () => void;
}

// UI de fallback reaproveitada pelos Error Boundaries do App Router
// (app/error.tsx e app/global-error.tsx). Presentational e sem estado.
export function ErrorFallback({
  title = "Algo deu errado",
  description = "Nao foi possivel carregar esta pagina. Tente novamente.",
  onRetry
}: ErrorFallbackProps) {
  return (
    <div
      className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center gap-3 rounded-md border border-border p-6 text-center"
      role="alert"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </div>
  );
}
