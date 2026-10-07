import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["dotenv/config"],
    root: "./",
    include: ["test/**/*.e2e-spec.ts"],
  },
});
