import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

// Bundle dédié à l'espace interne "Ops" (Blade), indépendant du frontend Next.js.
export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/css/ops.css', 'resources/js/ops.js'],
      refresh: true,
    }),
  ],
});
