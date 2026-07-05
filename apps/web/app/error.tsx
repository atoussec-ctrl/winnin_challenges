"use client";

import { useEffect } from "react";
import { ErrorFallback } from "../components/molecules/error-fallback";

// Error Boundary por rota (convencao do App Router): captura erros de render
// nas paginas e oferece um retry via reset().
export default function Error({
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <ErrorFallback onRetry={reset} />
    </main>
  );
}
