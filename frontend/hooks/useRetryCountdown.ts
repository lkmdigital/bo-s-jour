import { useEffect, useState } from 'react';

/**
 * Décompte en secondes pour les erreurs 429 (Too Many Attempts). `initialSeconds` vient de
 * error.retryAfterSeconds, posé par l'intercepteur de lib/api.ts à partir de l'en-tête
 * Retry-After renvoyé par le backend. Retourne null une fois le décompte terminé (ou si
 * aucun délai n'est en cours), pour permettre de réafficher un état "vous pouvez réessayer".
 */
export function useRetryCountdown(initialSeconds: number | null | undefined): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(initialSeconds ?? null);

  useEffect(() => {
    setSecondsLeft(initialSeconds ?? null);
    if (!initialSeconds || initialSeconds <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((s) => (s !== null && s > 1 ? s - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds]);

  return secondsLeft;
}
