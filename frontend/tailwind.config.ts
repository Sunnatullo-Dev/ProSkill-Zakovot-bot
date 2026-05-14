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
      },
      keyframes: {
        screenIn: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        resultCorrect: {
          "0%": { backgroundColor: "#22C55E" },
          "100%": { backgroundColor: "#0F1B2D" }
        },
        resultWrong: {
          "0%": { backgroundColor: "#EF4444" },
          "100%": { backgroundColor: "#0F1B2D" }
        }
      },
      animation: {
        "screen-in": "screenIn 300ms ease-out",
        pop: "pop 300ms ease-out",
        "result-correct": "screenIn 300ms ease-out, resultCorrect 500ms ease-out",
        "result-wrong": "screenIn 300ms ease-out, resultWrong 500ms ease-out"
      }
    }
  },
  plugins: []
} satisfies Config;
