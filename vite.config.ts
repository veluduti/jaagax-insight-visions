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
  build: {
    // Raise warning ceiling slightly; per-chunk strategy below keeps real chunks small.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Phase 7: split heavy 3rd-party libs into their own long-cacheable chunks
        // so route-level code splits stay lean and the initial paint downloads less JS.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-dom") || id.includes("scheduler") || id.includes("react/")) {
            return "vendor-react";
          }
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("mapbox-gl") || id.includes("maplibre")) return "vendor-map";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("zod") || id.includes("react-hook-form")) return "vendor-forms";
          return "vendor";
        },
      },
    },
  },
}));
