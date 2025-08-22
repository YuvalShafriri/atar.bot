/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Assistant', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      colors: {
        'primary-blue': '#2563eb',
        'primary-blue-dark': '#1d4ed8',
        'text-dark': '#1f2937',
        'text-light': '#4b5563',
        'bg-light': '#f9fafb',
        'border-color': '#e5e7eb'
      }
    },
  },
  plugins: [],
}
