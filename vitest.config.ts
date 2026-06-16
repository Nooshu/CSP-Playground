import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "server/**/*.ts", "functions/**/*.ts"],
      exclude: ["src/vite-env.d.ts"],
    thresholds: {
      lines: 100,
      functions: 100,
      statements: 100,
      branches: 95,
    },
      reporter: ["text", "html"],
    },
  },
});
