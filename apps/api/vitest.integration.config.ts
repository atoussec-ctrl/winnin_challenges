import { defineConfig } from "vitest/config";

// Testes de integracao (*.int-spec.ts) contra um Postgres real (DATABASE_URL).
// Ficam fora do `vitest run` padrao e do gate de cobertura unitario; rodam via
// `pnpm test:integration` (local: docker compose up -d postgres) e no CI com um
// service `postgres`.
export default defineConfig({
  test: {
    hookTimeout: 30_000,
    include: ["src/**/*.int-spec.ts"],
    testTimeout: 30_000
  }
});
