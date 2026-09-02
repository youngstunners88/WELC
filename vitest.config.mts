import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // `server-only` throws by design when imported outside a React Server
      // Component. Under Vitest we map it to the package's own no-op build so
      // server-side modules (e.g. crypto/messages) stay unit-testable without
      // weakening the guard in the real Next.js build.
      "server-only": path.resolve(dirname, "./node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
