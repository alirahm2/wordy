import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on 0.0.0.0 — reachable from other devices on your Wi‑Fi
    port: 5173,
    proxy: {
      "/api/rss/spektrum": {
        target: "https://www.spektrum.de",
        changeOrigin: true,
        rewrite: () => "/alias/rss/spektrum-de-rss-feed/996406",
      },
      "/api/rss/geo": {
        target: "https://www.geo.de",
        changeOrigin: true,
        rewrite: () => "/feed/rss/geo/",
      },
      "/api/rss/zeit": {
        target: "https://newsfeed.zeit.de",
        changeOrigin: true,
        rewrite: () => "/index",
      },
      "/api/rss/sz": {
        target: "https://rss.sueddeutsche.de",
        changeOrigin: true,
        rewrite: () => "/rss/Topthemen",
      },
      "/api/rss/spiegel": {
        target: "https://www.spiegel.de",
        changeOrigin: true,
        rewrite: () => "/schlagzeilen/index.rss",
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
});
