'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/*
 * Mesure d'audience interne de boséjour (page « Audience » de l'espace Ops) : envoie à l'API le chemin de chaque
 * page vue. Aucun cookie, aucune donnée personnelle : le serveur ne garde qu'une empreinte du visiteur qui change
 * chaque jour. N'envoie rien en développement, ni dans les espaces connectés (/dashboard), ni si le visiteur a
 * activé « Ne pas me suivre » dans son navigateur. Le site de provenance n'est transmis qu'à la première page
 * de la visite.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';

export default function VisitTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!pathname || pathname === last.current) return;
    last.current = pathname;
    if (/^\/(dashboard|ops)(\/|$)/.test(pathname)) return;

    try {
      const dnt = navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1';
      if (dnt) return;

      const firstOfVisit = !sessionStorage.getItem('bs:visit');
      sessionStorage.setItem('bs:visit', '1');
      const body = JSON.stringify({ path: pathname, referrer: firstOfVisit ? document.referrer : '' });

      // « text/plain » : requête simple, sans pré-vérification CORS ; sendBeacon survit à la fermeture de l'onglet.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${API_URL}/track`, new Blob([body], { type: 'text/plain' }));
      } else {
        fetch(`${API_URL}/track`, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => undefined);
      }
    } catch {
      // stockage ou réseau indisponible : la mesure est un confort, jamais une cause d'erreur
    }
  }, [pathname]);

  return null;
}
