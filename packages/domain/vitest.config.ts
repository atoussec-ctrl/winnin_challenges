import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      all: true,
      exclude: ["src/index.ts", "src/orders/order.ts", "src/products/product.ts", "src/users/user.ts"],
      include: ["src/**/*.ts"],
      provider: "v8",
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95
      }
    },
    globals: false
  }
});
