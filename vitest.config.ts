import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "istanbul",
      all: true,
      include: ["src/**/*.ts", "server/**/*.ts", "functions/**/*.ts"],
      exclude: ["src/vite-env.d.ts"],
      thresholds: {
        lines: 100,
        functions: 98,
        statements: 99,
        branches: 91,
      },
      reporter: ["text", "html"],
    },
  },
});
