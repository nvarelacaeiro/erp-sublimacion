import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Norde brand palette ───────────────────────────────
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          DEFAULT: '#2ECC8F',
          50:  '#edfbf4',
          100: '#d4f7e5',
          200: '#a8efcc',
          300: '#6de3ac',
          400: '#2ECC8F',
          500: '#1fb87d',
          600: '#169364',
          700: '#147550',
          800: '#135d41',
          900: '#114d37',
        },
        // ── Neutral backgrounds ──────────────────────────────
        surface: {
          DEFAULT: '#F0F4F8',
          dark:    '#E8EEF5',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        brand: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
