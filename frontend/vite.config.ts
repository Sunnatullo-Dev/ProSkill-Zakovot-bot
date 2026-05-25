import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// VITE_API_URL bo'lmasa build vaqtida noaniq "localhost:3000" ga tushib
// production'da har request fail bo'ladi. Build'ni loud failure bilan to'xtatamiz.
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  if (command === "build" && !env.VITE_API_URL) {
    throw new Error(
      "[zakovat] VITE_API_URL o'rnatilmagan. Production build uchun .env'ga " +
        "VITE_API_URL=https://your-backend.example.com qo'shing."
    );
  }

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173
    },
    build: {
      target: "es2018",
      // Dev-uchun source map ko'rinadi, production'da o'chiq (kod hajmi va xavfsizlik).
      sourcemap: mode !== "production"
    }
  };
});
