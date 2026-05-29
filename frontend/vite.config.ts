import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// VITE_API_URL bo'lmasa build vaqtida noaniq "localhost:3000" ga tushib
// production'da har request fail bo'ladi. Build'ni loud failure bilan to'xtatamiz.
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  const apiUrl = env.VITE_API_URL || process.env["VITE_API_URL"];
  if (command === "build" && !apiUrl) {
    throw new Error(
      "[zakovat] VITE_API_URL o'rnatilmagan. Production build uchun .env'ga " +
        "VITE_API_URL=https://your-backend.example.com qo'shing."
    );
  }

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      // Dev proxy — frontend port 5174/5173 dan backend 8000 ga /api yo'llari
      // o'tkaziladi. Bu CORS muammolarini hal qiladi va same-origin saqlanadi.
      proxy: command === "serve" ? {
        "/api": {
          target: process.env["VITE_API_URL"] || "http://localhost:8000",
          changeOrigin: true,
        },
      } : undefined,
    },
    build: {
      target: "es2018",
      // Dev-uchun source map ko'rinadi, production'da o'chiq (kod hajmi va xavfsizlik).
      sourcemap: mode !== "production"
    }
  };
});
