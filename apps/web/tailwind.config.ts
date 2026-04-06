import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f4f7f1',
          100: '#e6ede0',
          200: '#ccdcc2',
          300: '#b3c8a5',
          400: '#adb79c',
          500: '#94a385',
          600: '#74866a',
          700: '#5e6d56',
          800: '#4a5644',
          900: '#384232',
        },
        cream: {
          DEFAULT: '#F0EEE1',
          dark:    '#EAE4D8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        brand: ['Barlow', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
