/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Pour le déploiement sur serveur Node.js, utilisez 'standalone'
  // Pour un build statique, utilisez 'export'
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // Proxy dev : les appels API passent par le front (même origine) -> pas de CORS,
  // pas de mixed-content, un seul tunnel ngrok suffit. Voir NEXT_PUBLIC_API_URL=/tunnel-api
  async rewrites() {
    return [
      {
        source: '/tunnel-api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        // Proxifie aussi les images/fichiers servis par Laravel
        source: '/tunnel-storage/:path*',
        destination: 'http://localhost:8000/storage/:path*',
      },
      {
        // Cookie CSRF Sanctum (migration cookie httpOnly, 2026-08-31) — route Laravel hors du
        // préfixe /api, donc un rewrite dédié plutôt qu'un chemin dérivé de /tunnel-api.
        source: '/tunnel-csrf-cookie',
        destination: 'http://localhost:8000/sanctum/csrf-cookie',
      },
    ];
  },
  images: {
    // Désactive l'optimisation Next pour éviter les erreurs d'upstream (certificat/HTTP)
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'apimonbeaupays.loyerpay.ci',
        pathname: '/storage/**',
      },
      {
        protocol: 'http',
        hostname: 'apimonbeaupays.loyerpay.ci',
        pathname: '/storage/**',
      },
      {
        protocol: 'http',
        hostname: '72.62.16.236',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'api.bosejour.ci',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'bosejour.ci',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'api.bosejour.ci',
        pathname: '/api/storage/**',
      },
      // Configuration pour le développement local
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
    ],
  },
}

module.exports = nextConfig

