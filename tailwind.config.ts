import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5faff',
          100: '#e0f4ff',
          200: '#b8e4ff',
          300: '#80cfff',
          400: '#4bb8ff',
          500: '#0099ff',
          600: '#007acc',
          700: '#005c99',
          800: '#003d66',
          900: '#001f33',
        },
      },
    },
  },
  plugins: [],
};

export default config;
