import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Phase 10: strip console.* and debugger statements from production bundles
  // to reduce JS payload and avoid leaking debug logs to end-users.
  esbuild: mode === "production" ? { drop: ["console", "debugger"] } : undefined,
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    // Keep the production build conservative and stable.
    chunkSizeWarningLimit: 800,
  },
}));
