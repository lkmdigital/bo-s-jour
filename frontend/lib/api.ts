import axios from 'axios';
import { markAuthenticated, wasAuthenticated } from './tokenStorage';

// IMPORTANT: Utiliser uniquement HTTPS pour éviter les erreurs Mixed Content
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';

// Vérifier que l'URL est en HTTPS en production
if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  if (API_URL.startsWith('http://')) {
    console.error('❌ ERREUR: L\'URL de l\'API doit être en HTTPS pour éviter les erreurs Mixed Content');
    console.error('URL actuelle:', API_URL);
  }
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Évite la page d'avertissement ngrok (gratuit) qui casse les appels API
  },
  // Authentification par cookie de session httpOnly (Sanctum stateful, migration 2026-08-31)
  // au lieu d'un token Bearer stocké côté client (localStorage) — withCredentials permet
  // l'envoi/la réception du cookie de session ET du cookie XSRF-TOKEN sur les requêtes
  // cross-origin (bosejour.ci -> api.bosejour.ci). axios lit XSRF-TOKEN et l'attache
  // automatiquement en en-tête X-XSRF-TOKEN (noms par défaut, déjà ceux attendus par Laravel).
  withCredentials: true,
});

/**
 * Pose le cookie XSRF-TOKEN nécessaire à la protection CSRF de Sanctum. Route Laravel hors
 * du préfixe /api (contrairement à toutes les autres routes de `api`) :
 * - En prod (NEXT_PUBLIC_API_URL absolue, ex. https://api.bosejour.ci/api) : on retire le
 *   suffixe /api pour retrouver l'origine et appeler {origine}/sanctum/csrf-cookie.
 * - En dev via le proxy tunnel (NEXT_PUBLIC_API_URL=/tunnel-api, chemin relatif — voir
 *   next.config.js) : /tunnel-api n'a pas de "/api" en fin de chemin (c'est "-api", pas
 *   "/api"), le retrait échouerait silencieusement ; on route donc vers /tunnel-csrf-cookie,
 *   un rewrite dédié dans next.config.js.
 * Exportée pour un appel explicite avant login/register (où l'absence de session préalable
 * rend l'automatisme de l'interceptor ci-dessous moins prévisible), qui s'en charge aussi
 * automatiquement pour toute autre requête mutante (booking, profil, avis, upload…).
 */
export async function ensureCsrfCookie(): Promise<void> {
  if (API_URL.startsWith('/')) {
    await axios.get('/tunnel-csrf-cookie', { withCredentials: true });
    return;
  }
  const origin = API_URL.replace(/\/api\/?$/, '');
  await axios.get(`${origin}/sanctum/csrf-cookie`, { withCredentials: true });
}

function hasCsrfCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return /(?:^|; )XSRF-TOKEN=/.test(document.cookie);
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use(async (config) => {
  // Ne pas définir Content-Type pour FormData, le navigateur le fait automatiquement
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  // Authentification par cookie de session (Sanctum stateful, migration 2026-08-31) :
  // toute requête mutante passe désormais par la protection CSRF de Laravel. Plutôt que
  // d'auditer chaque appel POST/PUT/PATCH/DELETE de l'app pour y ajouter un appel explicite
  // à ensureCsrfCookie(), on la pose ici une seule fois dès qu'elle manque — couvre
  // automatiquement toute requête mutante, présente ou future.
  const method = (config.method || 'get').toLowerCase();
  if (typeof window !== 'undefined' && MUTATING_METHODS.has(method) && !hasCsrfCookie()) {
    await ensureCsrfCookie();
  }

  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      error.message = 'Erreur réseau. Vérifiez votre connexion internet.';
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    // Ne rediriger que si l'utilisateur pensait être connecté (session expirée/révoquée)
    // Ne pas rediriger si l'utilisateur n'était pas connecté (requête publique)
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const hadSession = wasAuthenticated();
        markAuthenticated(false);

        // Rediriger uniquement si l'utilisateur avait une session
        // Cela signifie que sa session a expiré ou qu'il a été déconnecté
        if (hadSession) {
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/auth/')) {
            window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
          }
        }
        // Si hadSession est false, l'utilisateur n'était pas connecté,
        // donc on ne redirige pas - c'est une requête publique qui a échoué
      }
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      error.message = 'Ressource non trouvée';
    }

    // Handle 422 Validation errors
    if (error.response?.status === 422) {
      const errors = error.response.data.errors;
      if (errors) {
        const firstError = Object.values(errors)[0];
        error.message = Array.isArray(firstError) ? firstError[0] : firstError;
      }
    }

    // Handle 500 Server errors
    if (error.response?.status >= 500) {
      error.message = 'Erreur serveur. Veuillez réessayer plus tard.';
    }

    // Handle 429 Too Many Requests — expose le délai d'attente (header Retry-After,
    // renvoyé par ThrottleRequests) pour permettre un décompte côté UI plutôt qu'un
    // message statique.
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers?.['retry-after'], 10);
      error.retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
    }

    return Promise.reject(error);
  }
);

export default api;

