import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Testes de integracao (Postgres real) rodam so via test:integration.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.int-spec.ts"],
    coverage: {
      all: true,
      exclude: [
        "src/**/*.dtos.ts",
        "src/**/*.module.ts",
        "src/**/*.models.ts",
        "src/**/*.spec.ts",
        "src/main.ts",
        // Adapters do Postgres: cobertos por testes de integracao contra um
        // banco real (pnpm test:integration), nao pelo gate unitario.
        "src/modules/orders/persistence/**"
      ],
      include: [
        "src/**/*.repository.ts",
        "src/**/*.resolver.ts",
        "src/**/*.service.ts",
        "src/**/*.validation.ts",
        "src/**/*controller.ts",
        "src/observability/**/*.ts",
        "src/config/**/*.ts",
        "src/modules/orders/loaders/**/*.ts",
        "src/modules/ai/**/*.ts",
        "src/**/*.factory.ts",
        "src/**/*.guard.ts"
      ],
      provider: "v8",
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95
      }
    }
  }
});
