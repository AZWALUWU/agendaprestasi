import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ command }) => ({
  plugins: [
    tanstackStart(),
    react(),
    tsconfigPaths(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "placeholder.svg",
      ],
      manifest: {
        name: "Agenda Prestasi",
        short_name: "Agenda Prestasi",
        description:
          "Temukan beasiswa, lomba, dan latihan tryout SNBT di satu tempat.",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "id",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/, /^\/auth\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html",
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),

    ...(command === "build" ? [cloudflare()] : []),
  ],

  /* 🔥 Tambahkan ini (penting) */
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));