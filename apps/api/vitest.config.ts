import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ["test/support/global-setup.ts"],
    setupFiles: ["test/support/setup-env.ts"],
    // Test files share one database: run them one after another.
    fileParallelism: false,
    root: "./",
    include: ["src/**/*.spec.ts"],
  },
});
