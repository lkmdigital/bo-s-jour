// Authentification par cookie de session httpOnly (Sanctum stateful, migration 2026-08-31) —
// il n'y a plus de token à stocker côté client : le navigateur envoie le cookie
// automatiquement (voir lib/api.ts, withCredentials: true), et le cookie n'est jamais
// lisible par JavaScript, contrairement à un token en localStorage/sessionStorage
// (c'était la faille — une XSS ailleurs sur le site suffisait à voler la session entière).
// Ce module ne garde que ce qui reste légitimement utile côté client : l'e-mail mémorisé
// pour préremplir le formulaire de connexion (donnée non sensible).

const REMEMBERED_EMAIL_KEY = 'remembered_email';
const WAS_AUTHENTICATED_KEY = 'was_authenticated';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Simple indicateur "je pensais être connecté" (pas un secret — juste un booléen) : sert
 * uniquement à décider, côté client (lib/api.ts), si un 401 doit rediriger vers /auth/login
 * (session expirée) ou non (route protégée visitée sans jamais s'être connecté — ex. les
 * offres promotionnelles réservées aux inscrits). Ne contient aucune information sensible,
 * contrairement à l'ancien token stocké ici avant la migration vers le cookie httpOnly.
 */
export function markAuthenticated(value: boolean): void {
  safe(() => {
    if (value) window.localStorage.setItem(WAS_AUTHENTICATED_KEY, '1');
    else window.localStorage.removeItem(WAS_AUTHENTICATED_KEY);
  }, undefined);
}

export function wasAuthenticated(): boolean {
  return safe(() => window.localStorage.getItem(WAS_AUTHENTICATED_KEY) === '1', false);
}

export function setRememberedEmail(email: string | null): void {
  safe(() => {
    if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }, undefined);
}

export function getRememberedEmail(): string {
  return safe(() => window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || '', '');
}
