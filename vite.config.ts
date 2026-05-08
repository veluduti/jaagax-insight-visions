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
    // Raise warning ceiling slightly; per-chunk strategy below keeps real chunks small.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Phase 7: split heavy 3rd-party libs into their own long-cacheable chunks
        // so route-level code splits stay lean and the initial paint downloads less JS.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          // CRITICAL: keep React + all React-dependent runtime libs in ONE chunk so
          // forwardRef / hooks are defined before any consumer chunk evaluates.
          // Splitting Radix/Router/Query/etc into separate chunks caused
          // "Cannot read properties of undefined (reading 'forwardRef')" because
          // those chunks evaluated before vendor-react finished initializing.
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/") ||
            id.includes("/node_modules/react-router") ||
            id.includes("/node_modules/@radix-ui/") ||
            id.includes("/node_modules/@tanstack/") ||
            id.includes("react-hook-form")
          ) {
            return "vendor-react";
          }
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("mapbox-gl") || id.includes("maplibre")) return "vendor-map";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("zod")) return "vendor-forms";
          return "vendor";
        },
      },
    },
  },
}));
