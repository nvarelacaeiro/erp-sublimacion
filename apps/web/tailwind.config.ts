import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Norde brand palette ───────────────────────────────
        primary: {
          50:  '#f0f4f9',
          100: '#dde8f3',
          200: '#bad1e8',
          300: '#8bb6d9',
          400: '#5a95c8',
          500: '#3578b5',
          600: '#2660a0',
          700: '#1e3a5f',
          800: '#162d4a',
          900: '#0f1f33',
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
