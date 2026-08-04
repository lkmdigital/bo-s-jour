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

      // Enregistrer le Service Worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[Service Worker] Registered successfully:', registration.scope);

          // Vérifier les mises à jour périodiquement
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Toutes les heures

          // Écouter les mises à jour du Service Worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nouveau Service Worker disponible
                  console.log('[Service Worker] New version available');
                  // Optionnel : Afficher une notification pour recharger
                  if (confirm('Une nouvelle version est disponible. Recharger la page ?')) {
                    window.location.reload();
                  }
                }
              });
            }
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



