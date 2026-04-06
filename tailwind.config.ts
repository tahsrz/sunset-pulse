import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary-color, #3b82f6)",
          foreground: "#ffffff",
        },
        slate: {
          950: "#020617",
        },
        accent: {
          DEFAULT: "#f97316", // Orange for recon/drone elements
          glow: "rgba(249, 115, 22, 0.3)",
        },
        intel: {
          blue: "#3b82f6",
          green: "#22c55e",
          purple: "#a855f7",
        }
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
        "recon-scan": "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))",
      },
      animation: {
        "pulse-fast": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "recon-sweep": "scan 4s linear infinite",
        "pulse-expand": "pulse-expand 4s cubic-bezier(0.16, 1, 0.3, 1) infinite",
        "pulse-glow": "pulse-glow 6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
      keyframes: {
        scan: {
          "0%": { top: "0%", opacity: "0" },
          "50%": { opacity: "0.5" },
          "100%": { top: "100%", opacity: "0" },
        },
        'pulse-expand': {
          '0%': { transform: 'scale(1)', opacity: '0', filter: 'blur(0px)' },
          '15%': { opacity: '0.7', filter: 'blur(1px)' },
          '100%': { transform: 'scale(5)', opacity: '0', filter: 'blur(12px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.1', transform: 'scale(1)', filter: 'blur(6px)' },
          '50%': { opacity: '0.4', transform: 'scale(1.08)', filter: 'blur(2px)' },
        },
      }
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};

export default config;
