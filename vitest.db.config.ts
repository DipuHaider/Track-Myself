import path from "node:path";
import { defineConfig } from "vitest/config";

/* Database-backed suites need a real mongod. They run only when
   MONGODB_TEST_URI is set (CI starts a service container; locally point it at a
   scratch database), so the default `npm test` stays dependency-free. */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.dbtest.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
