"use client";

import { useEffect } from "react";
import { ErrorFallback } from "../components/molecules/error-fallback";

// Boundary de ultimo nivel: captura erros que acontecem no proprio root layout,
// por isso precisa renderizar suas proprias tags <html>/<body>.
export default function GlobalError({
  error,
  reset
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-background px-4">
        <ErrorFallback onRetry={reset} />
      </body>
    </html>
  );
}
