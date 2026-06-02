import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [react()],
  build: {
    // The heaviest routes (editor, runner) are already split via React.lazy.
    // The remaining vendor bundle gzips to ~180kB, acceptable for a client SPA;
    // a manualChunks vendor split introduced circular chunks, so we keep Vite's
    // default chunking and lift the conservative size warning instead.
    chunkSizeWarningLimit: 900,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
});
