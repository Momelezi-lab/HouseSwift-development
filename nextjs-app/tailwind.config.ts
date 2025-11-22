import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1A531A", // Dark green from logo
        secondary: "#90B890", // Light green from logo
        accent: "#1A531A",
        success: "#10b981",
        danger: "#ef4444",
        warning: "#f59e0b",
        info: "#1A531A",
        light: "#f8fafc",
        dark: "#1A531A",
      },
    },
  },
  plugins: [],
};
export default config;

