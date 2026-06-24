import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        iron: {
          950: "#0b1117",
          900: "#101820",
          800: "#162330",
          700: "#203344"
        },
        brass: {
          500: "#c8903d",
          400: "#e2b15d"
        },
        piste: {
          500: "#2fbf71",
          600: "#279e5f"
        }
      },
      boxShadow: {
        blade: "0 24px 80px rgba(200, 144, 61, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
