/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './resources/views/ops/**/*.blade.php',
    // ops.js construit des lignes de log côté client (voir appendEntry()) : les classes
    // qu'il pose doivent apparaître ici, EN TOUTES LETTRES (jamais interpolées, sinon
    // Tailwind ne peut pas savoir qu'elles sont utilisées et les purge silencieusement).
    './resources/js/**/*.js',
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
