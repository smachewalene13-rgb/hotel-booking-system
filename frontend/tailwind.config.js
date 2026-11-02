/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdfbf7',
          100: '#f7f2e9',
          200: '#edd8bc',
          300: '#e2bd8a',
          400: '#d7a258',
          500: '#c5872b',
          600: '#ad6e20',
          700: '#8c531b',
          800: '#73431c',
          900: '#5f371a',
        },
        navy: {
          800: '#0f172a',
          900: '#0a0f1d',
          950: '#05070f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
