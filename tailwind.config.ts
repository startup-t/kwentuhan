import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body:    ["'DM Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        kw: {
          bg:         "#F7F7FA",
          surface:    "#FFFFFF",
          surfaceAlt: "#F0EFF6",
          border:     "#E8E6F0",
          accent:     "#6C5CE7",
          accentSoft: "#EDE9FF",
          accentDeep: "#4A3FCF",
          text:       "#1A1730",
          subtext:    "#8B87A8",
          muted:      "#C4C1D8",
          wild:       "#E8527A",
          wildSoft:   "#FFECF1",
          deep:       "#3B82F6",
          deepSoft:   "#EFF6FF",
          success:    "#10B981",
          successSoft:"#ECFDF5",
          warn:       "#F59E0B",
        },
      },
      borderRadius: {
        "2.5xl": "1.25rem",
        "3xl":   "1.5rem",
        "4xl":   "2rem",
      },
      boxShadow: {
        "card-sm": "0 2px 8px rgba(108,92,231,0.06), 0 0 0 1px rgba(108,92,231,0.07)",
        "card":    "0 4px 24px rgba(108,92,231,0.10), 0 0 0 1px rgba(108,92,231,0.08)",
        "card-lg": "0 8px 40px rgba(108,92,231,0.14), 0 0 0 1px rgba(108,92,231,0.09)",
        "card-hover":"0 12px 48px rgba(108,92,231,0.18), 0 0 0 1px rgba(108,92,231,0.12)",
        "btn":     "0 4px 16px rgba(108,92,231,0.30)",
        "btn-lg":  "0 6px 24px rgba(108,92,231,0.38)",
        "inset":   "inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.04)",
      },
      animation: {
        "slide-up":    "slideUp 0.48s cubic-bezier(0.34,1.4,0.64,1) both",
        "slide-up-sm": "slideUpSm 0.36s cubic-bezier(0.34,1.4,0.64,1) both",
        "fade-in":     "fadeIn 0.28s ease both",
        "scale-in":    "scaleIn 0.32s cubic-bezier(0.34,1.56,0.64,1) both",
        "float":       "float 5s ease-in-out infinite",
        "spin-slow":   "spin 8s linear infinite",
        "pulse-soft":  "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%":   { opacity:"0", transform:"translateY(36px) scale(0.96)" },
          "100%": { opacity:"1", transform:"translateY(0) scale(1)" },
        },
        slideUpSm: {
          "0%":   { opacity:"0", transform:"translateY(16px)" },
          "100%": { opacity:"1", transform:"translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity:"0" },
          "100%": { opacity:"1" },
        },
        scaleIn: {
          "0%":   { opacity:"0", transform:"scale(0.88)" },
          "100%": { opacity:"1", transform:"scale(1)" },
        },
        float: {
          "0%,100%": { transform:"translateY(0)" },
          "50%":     { transform:"translateY(-10px)" },
        },
        pulseSoft: {
          "0%,100%": { opacity:"0.6" },
          "50%":     { opacity:"1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
