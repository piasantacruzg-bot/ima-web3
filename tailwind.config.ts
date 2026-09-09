import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#111114",
          soft: "#3a3a42",
        },
        paper: {
          DEFAULT: "#fafaf9",
          raised: "#ffffff",
        },
        line: {
          DEFAULT: "#e7e5e2",
          soft: "#f0efec",
        },
        brand: {
          DEFAULT: "#171717",
          accent: "#ff5a1f",
        },
        status: {
          success: "#1a7f4e",
          warning: "#b5760a",
          danger: "#c23b3b",
          info: "#2461c7",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: ["Georgia", "Iowan Old Style", "Times New Roman", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 17, 20, 0.04), 0 1px 8px rgba(17, 17, 20, 0.04)",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
