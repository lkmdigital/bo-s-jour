import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF0000', // rouge principal — charte bo séjour
          dark: '#CC0000',
          light: '#FF4D4D',
        },
        accent: {
          DEFAULT: '#0F0F0F', // noir profond
          dark: '#060606',
          light: '#1A1A1A',
        },
        secondary: {
          DEFAULT: '#4B5F5A', // gris-vert — couleur secondaire charte bo séjour
          dark: '#3A4A46',
          light: '#6B7F7A',
        },
        // Charte graphique Bosejour 2025 — tokens additifs, utilisés uniquement
        // dans les nouveaux espaces (dashboard partenaire/admin) pour ne pas
        // impacter la marque du reste du site.
        bosejour: {
          red: '#FF0000',
          black: '#000000',
          grayGreen: '#4B5F5A',
          grayDark: '#343434',
          beige: '#F7E8C6',
          roseAccent: '#EE233C',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        logo: ['var(--font-baloo)', 'Baloo 2', 'system-ui', 'sans-serif'],
        slogan: ['var(--font-dancing)', 'Dancing Script', 'cursive'],
      },
      borderRadius: {
        pill: '9999px',
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'bounce-subtle': 'bounce-subtle 0.6s ease-out',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'slide-up': {
          '0%': {
            transform: 'translateY(100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        'slide-in-right': {
          '0%': {
            transform: 'translateX(100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        'slide-in-left': {
          '0%': {
            transform: 'translateX(-100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        'bounce-subtle': {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        'pulse-slow': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.7',
          },
        },
        'shimmer': {
          '0%': {
            backgroundPosition: '-1000px 0',
          },
          '100%': {
            backgroundPosition: '1000px 0',
          },
        },
      },
    },
  },
  plugins: [],
}
export default config

