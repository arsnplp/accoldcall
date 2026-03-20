import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        brand: {
          50: '#f0f3f7',
          100: '#dce4ed',
          200: '#b9c8db',
          300: '#96adc9',
          400: '#8299b8',
          500: '#6E87A6',
          600: '#5a7191',
          700: '#475b76',
          800: '#34445b',
          900: '#212e40',
        },
        danger: {
          50: '#fdf2f2',
          100: '#f9dada',
          200: '#e8a8a8',
          300: '#d68989',
          400: '#C86A6A',
          500: '#b55555',
          600: '#9a4444',
          700: '#7a3535',
          800: '#5a2727',
          900: '#3b1919',
        },
        success: {
          50: '#f2f8f5',
          100: '#e0efe8',
          200: '#c8e2d5',
          300: '#9FC3B3',
          400: '#7fb09a',
          500: '#609d82',
          600: '#4d8069',
          700: '#3a6150',
          800: '#284237',
          900: '#16231e',
        },
        accent: {
          50: '#faf8f0',
          100: '#f2edda',
          200: '#e3dbb8',
          300: '#C9BE8C',
          400: '#b5a76f',
          500: '#a19155',
          600: '#857643',
          700: '#695c34',
          800: '#4d4326',
          900: '#312b18',
        },
      },
      animation: {
        'pulse-recording': 'pulse-recording 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-recording': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
