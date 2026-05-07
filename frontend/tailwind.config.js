/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d9fe',
          300: '#a5c0fd',
          400: '#819efb',
          500: '#6079f8',
          600: '#4a59ed',
          700: '#3c47d3',
          800: '#323cab',
          900: '#2e3787',
        },
      },
    },
  },
  plugins: [],
};
