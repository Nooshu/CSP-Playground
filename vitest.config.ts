import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __GIT_COMMIT_SHORT__: JSON.stringify("test1234"),
  },
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
        functions: 100,
        statements: 99,
        branches: 93,
      },
      reporter: ["text", "html"],
    },
  },
});
