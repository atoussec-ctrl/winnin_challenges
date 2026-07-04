import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      all: true,
      include: ["hooks/**/*.ts", "lib/**/*.ts"],
      provider: "v8",
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95
      }
    },
    environment: "jsdom"
  }
});
