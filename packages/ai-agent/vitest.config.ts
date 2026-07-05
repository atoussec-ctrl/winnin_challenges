import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      all: true,
      exclude: [
        "src/index.ts",
        "src/agents/create-starter-orchestrator.ts",
        "src/contracts/thread.ts",
        "src/llm/llm.port.ts"
      ],
      include: ["src/**/*.ts"],
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
