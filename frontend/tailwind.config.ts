import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#f8fafc",
        brand: "#0f766e",
        accent: "#f59e0b"
      }
    }
  },
  plugins: []
} satisfies Config;
