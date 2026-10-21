'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // En développement, le Service Worker sert des assets en cache et masque les
      // changements de code (Fast Refresh inclus) — on le désactive et on nettoie
      // toute installation précédente pour éviter de tester une version obsolète.
      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.unregister());
        });
        if (window.caches) {
          caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
        }
        return;
      }

      // Enregistrer le Service Worker. L'identifiant de build dans l'adresse fait que chaque
      // déploiement installe un nouveau service worker (qui vide les anciens caches).
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      // Quand une nouvelle version prend le relais, on recharge UNE fois (sans question posée au
      // visiteur) : l'ancienne page ne doit pas tourner avec des fichiers d'une autre version.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded) return;
        reloaded = true;
        window.location.reload();
      });

      navigator.serviceWorker
        .register(`/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? 'prod'}`, { updateViaCache: 'none' })
        .then((registration) => {
          registration.update().catch(() => undefined);
          // Vérifier les mises à jour toutes les 30 minutes, et au retour sur l'application
          // (PWA installée : on la rouvre souvent sans jamais recharger la page).
          setInterval(() => registration.update().catch(() => undefined), 30 * 60 * 1000);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
          });
        })
        .catch((error) => {
          console.error('[Service Worker] Registration failed:', error);
        });

      // Gérer les messages du Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[Service Worker] Message received:', event.data);
      });

      // Gérer les erreurs du Service Worker
      navigator.serviceWorker.addEventListener('error', (error) => {
        console.error('[Service Worker] Error:', error);
      });
    }
  }, []);

  return null;
}



