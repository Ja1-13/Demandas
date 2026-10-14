import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        "fit-blue": "#12358A",
        "fit-blue-dark": "#0D2A6E",
        "fit-blue-title": "#0F3B8C",
        "fit-green": "#16A34A",
        "fit-green-dark": "#15803D",
        "fit-cream": "#F6F7F9",
        ink: "#374151",
        muted: "#6b7280",
        line: "#e5e7eb",
        paper: "#F6F7F9",
        accent: "#16A34A",
      },
    },
  },
  plugins: [],
};

export default config;