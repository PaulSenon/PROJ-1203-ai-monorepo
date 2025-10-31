import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
// import alchemy from "alchemy/cloudflare/vite";
import { defineConfig } from "vite";
// import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({}),
    react(),
    // alchemy(), // this breaks everything
    // VitePWA({
    //   registerType: "autoUpdate",
    //   manifest: {
    //     name: "ai-monorepo",
    //     short_name: "ai-monorepo",
    //     description: "ai-monorepo - PWA Application",
    //     theme_color: "#0c0c0c",
    //   },
    //   pwaAssets: { disabled: false, config: true },
    //   devOptions: { enabled: true },
    // }),
    // Inspect(),
    // analyzer({
    //   openAnalyzer: false,
    // }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
