import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        surface: "#121215",
        "surface-raised": "#18181c",
        border: "#27272a",
        primary: {
          DEFAULT: "#10b981",
          hover: "#059669",
          muted: "rgba(16, 185, 129, 0.12)",
        },
        muted: "#71717a",
        foreground: "#fafafa",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
