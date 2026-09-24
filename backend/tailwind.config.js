/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './resources/views/ops/**/*.blade.php',
    // Vue de pagination Tailwind fournie par Laravel (utilisée par $payments->links()) —
    // sinon ses classes sont purgées, la pagination s'affiche sans aucun style.
    './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/tailwind.blade.php',
  ],
  theme: {
    extend: {
      colors: {
        // Même rouge que la marque BoSéjour côté frontend (frontend/tailwind.config.ts).
        primary: {
          DEFAULT: '#FF0000',
          dark: '#CC0000',
          light: '#FF4D4D',
        },
        accent: {
          DEFAULT: '#0F0F0F',
          dark: '#060606',
        },
      },
    },
  },
  plugins: [],
};
