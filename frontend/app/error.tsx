'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw, LifeBuoy } from 'lucide-react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

/**
 * Error boundary de segment (Next.js App Router) — filet de rattrapage pour toute
 * erreur non gérée pendant le rendu d'une page (au lieu de l'écran d'erreur générique
 * de Next.js). Ne couvre pas une erreur dans app/layout.tsx lui-même — voir global-error.tsx
 * pour ce cas, plus rare.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Le digest (hash stable de l'erreur, généré par Next.js) permet de retrouver
    // l'incident correspondant côté serveur sans exposer le message technique au client.
    console.error('Erreur applicative :', error, error.digest ? `(digest: ${error.digest})` : '');

    // Auto-réparation (PWA / mobile) : une erreur de rendu juste après un déploiement vient souvent
    // de fichiers ou de données d'une ancienne version restés en cache sur l'appareil. On vide le
    // cache et le service worker, puis on recharge UNE fois (au plus toutes les 5 minutes) : le
    // visiteur retrouve la page sans avoir vu l'erreur. Si elle revient, l'écran d'erreur reste.
    try {
      const key = 'bosejour:autoheal';
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 5 * 60 * 1000) {
        sessionStorage.setItem(key, String(Date.now()));
        const clean = async () => {
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
          }
          if (window.caches) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
          }
        };
        clean().catch(() => undefined).finally(() => window.location.reload());
      }
    } catch {
      // stockage indisponible (navigation privée…) : on laisse l'écran d'erreur
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl">
          <div className="mb-8 text-9xl font-bold text-primary/20 dark:text-primary/10">
            :(
          </div>

          <h1 className="text-4xl font-bold mb-4">
            Un problème est survenu
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Quelque chose s'est mal passé de notre côté. Ce n'est pas de votre faute —
            réessayez, ou revenez à l'accueil si le problème persiste.
          </p>

          {error.digest && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mb-8 font-mono">
              Référence : {error.digest}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={reset}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Réessayer
            </button>

            <Link
              href="/"
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </Link>

            <Link
              href="/contact"
              className="btn-outline inline-flex items-center justify-center gap-2"
            >
              <LifeBuoy className="w-5 h-5" />
              Contacter le support
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
