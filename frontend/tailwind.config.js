/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aws: {
          orange: "#FF9900",
          dark: "#232F3E",
          blue: "#1A73E8",
        },
      },
    },
  },
  plugins: [],
};
