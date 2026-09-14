import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BoSéjour - Votre séjour commence ici...',
    short_name: 'BoSéjour',
    description: 'Trouvez et réservez votre hébergement idéal en Côte d\'Ivoire',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#C1121F',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'fr',
    // Utiliser le logo existant (les navigateurs redimensionnent automatiquement)
    icons: [
      { src: '/images/payment-methods/logo/logo.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: '/images/payment-methods/logo/logo.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/images/payment-methods/logo/logo.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/images/payment-methods/logo/logo.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/images/payment-methods/logo/logo.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
      { src: '/images/payment-methods/logo/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/images/payment-methods/logo/logo.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/images/payment-methods/logo/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      {
        name: 'Rechercher',
        short_name: 'Recherche',
        description: 'Rechercher un hébergement',
        url: '/accommodations',
        icons: [
          { src: '/images/payment-methods/logo/logo.png', sizes: '96x96' },
        ],
      },
      {
        name: 'Mes réservations',
        short_name: 'Réservations',
        description: 'Voir mes réservations',
        url: '/bookings',
        icons: [
          { src: '/images/payment-methods/logo/logo.png', sizes: '96x96' },
        ],
      },
    ],
    categories: ['travel', 'lifestyle', 'business'],
  };
}



