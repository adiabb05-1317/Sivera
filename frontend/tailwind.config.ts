import type { Config } from "tailwindcss"

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Default Flowterview theme colors
        primary: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#334155",
          foreground: "#f8fafc",
        },
        accent: {
          DEFAULT: "#0ea5e9",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#64748b",
          foreground: "#f8fafc",
        },

        // UI element colors
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: "#3f3f46",
        input: "#3f3f46",
        ring: "#10b981",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sound-wave": {
          "0%, 100%": { height: "0.25rem" },
          "50%": { height: "1rem" }
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "pulse-slow": {
          "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
          "50%": { transform: "translate(-50%, -50%) scale(1.05)" },
        },
        "pulse-medium": {
          "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
          "50%": { transform: "translate(-50%, -50%) scale(1.08)" },
        },
        "pulse-fast": {
          "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
          "50%": { transform: "translate(-50%, -50%) scale(1.1)" },
        },
        "pulse-golden": {
          "0%": { boxShadow: "0 0 0 0 rgba(255, 165, 0, 0.7)" },
          "70%": { boxShadow: "0 0 0 10px rgba(255, 165, 0, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255, 165, 0, 0)" },
        },
        "subtle-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "float": {
          "0%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(10deg)" },
          "100%": { transform: "translateY(0) rotate(0deg)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5", filter: "blur(10px)" },
          "50%": { opacity: "0.8", filter: "blur(15px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 400ms ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "pulse-medium": "pulse-medium 2.5s ease-in-out infinite",
        "pulse-fast": "pulse-fast 2s ease-in-out infinite",
        "sound-wave": "sound-wave 1.5s infinite ease-in-out",
        "pulse-golden": "pulse-golden 2s infinite",
        "subtle-pulse": "subtle-pulse 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config
