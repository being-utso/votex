/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        page: "#090b12",
        panel: "#101526",
        line: "#232a3e",
        accent: "#7dd3fc",
        accentStrong: "#38bdf8",
        textMain: "#f8fafc",
        textMuted: "#9ca3af",
        success: "#4ade80",
        danger: "#fb7185"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(125,211,252,0.12), 0 20px 40px rgba(2,6,23,0.55)",
        card: "0 24px 48px rgba(15, 23, 42, 0.35)"
      },
      backdropBlur: {
        xs: "2px"
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"]
      },
      keyframes: {
        floatIn: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        }
      },
      animation: {
        floatIn: "floatIn 0.45s ease-out both"
      }
    }
  },
  plugins: []
};
