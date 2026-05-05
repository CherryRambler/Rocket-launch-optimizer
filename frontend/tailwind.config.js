/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          900: "#0a0e1a",
          800: "#0d1117",
          700: "#0d1535",
        },
        cyan: { DEFAULT: "#00d4ff" },
        green: { DEFAULT: "#00ff88" },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
