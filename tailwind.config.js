/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        poa: {
          dark: "#0b0f19",
          card: "#111827",
          border: "#1f293d",
          accent: "#38bdf8",
          neon: "#00f2fe",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b"
        }
      }
    },
  },
  plugins: [],
};
