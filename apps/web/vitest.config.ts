import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@doonflow/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@doonflow/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "next/link": path.resolve(__dirname, "src/test/mocks/next-link.tsx"),
      "next/navigation": path.resolve(__dirname, "src/test/mocks/next-navigation.ts"),
    },
  },
});
