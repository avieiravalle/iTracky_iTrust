/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // ESSENCIAL: Ativa o modo escuro via classe CSS 'dark'
  theme: {
    extend: {},
  },
  plugins: [],
}