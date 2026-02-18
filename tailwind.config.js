/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sf: {
          bg: '#0F1117',
          'bg-s': '#161820',
          'bg-c': '#1C1E27',
          'bg-h': '#22242E',
          'bg-e': '#252836',
          em: '#34D399',
          'em-d': '#059669',
          co: '#F97066',
          am: '#FBBF24',
          sk: '#38BDF8',
          t: '#F1F2F6',
          ts: '#A0A3B1',
          tm: '#6B6F80',
          tf: '#454857',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
