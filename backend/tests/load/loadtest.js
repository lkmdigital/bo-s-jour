// Test de charge k6 — bo séjour (monbeaupays.com)
// Cible : backend Laravel LOCAL (php artisan serve) — jamais la production sans accord explicite.
// Voir README.md dans ce dossier pour le mode d'emploi complet.
//
// 3 scénarios simultanés :
//   1. public_browsing     — trafic anonyme (accueil/recherche/détail), le plus gros volume
//   2. authenticated_users — un voyageur connecté (login une fois puis activité de session : /me, notifications, fidélité)
//   3. admin_host_api      — tableaux de bord admin + hôte (endpoints authentifiés les plus lourds en requêtes DB)
//
// Volontairement EXCLU : réservation/paiement (flux sensible, écritures DB + appel Malia Pay,
// à ne jamais soumettre à une charge synthétique) et l'inscription en masse (éviterait de polluer
// la base locale de faux comptes — le login+/me est de toute façon le flux dominant en trafic réel).
//
// Lancer : k6 run loadtest.js
// Contre un autre port/hôte : BASE_URL=http://127.0.0.1:8010 k6 run loadtest.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8010';

const loginDuration = new Trend('login_duration');
const rateLimited = new Counter('login_rate_limited_429');

export const options = {
  scenarios: {
    public_browsing: {
      executor: 'ramping-vus',
      exec: 'publicBrowsing',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 30 },
        { duration: '60s', target: 30 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
    authenticated_users: {
      executor: 'constant-vus',
      exec: 'authenticatedFlow',
      vus: 8,
      duration: '95s',
      startTime: '5s',
    },
    admin_host_api: {
      executor: 'constant-vus',
      exec: 'adminHostApi',
      vus: 4,
      duration: '95s',
      startTime: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    // Les 429 du login sont un comportement voulu (anti-bruteforce, throttle:10,1) et
    // exclus volontairement du taux d'échec global — voir login_rate_limited_429.
    'http_req_failed{expected_response:true}': ['rate<0.02'],
  },
};

const DEMO_ACCOUNTS = [
  { email: 'admin@monbeaupays.com', password: 'password123', label: 'admin' },
  { email: 'host1@monbeaupays.com', password: 'password', label: 'host' },
];

function loginWithRetry(email, password, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/login`,
      JSON.stringify({ email, password }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /login' } }
    );
    loginDuration.add(Date.now() - start);

    if (res.status === 200) {
      const body = res.json();
      return body.token;
    }
    if (res.status === 429) {
      rateLimited.add(1);
      sleep(2 + Math.random() * 2); // le throttle est par fenêtre glissante d'1 min — on patiente et on retente
      continue;
    }
    check(res, { [`login ${email} inattendu (status ${res.status})`]: () => false });
    return null;
  }
  return null;
}

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
}

// --- Scénario 1 : navigation publique (anonyme) ---
export function publicBrowsing() {
  group('accueil + liste', () => {
    const list = http.get(`${BASE_URL}/api/accommodations?page=1`, { tags: { name: 'GET /accommodations' } });
    check(list, { 'liste 200': (r) => r.status === 200 });

    const suggestions = http.get(`${BASE_URL}/api/accommodations/suggestions?q=abidjan`, {
      tags: { name: 'GET /accommodations/suggestions' },
    });
    check(suggestions, { 'suggestions 200': (r) => r.status === 200 });
  });

  sleep(0.5);

  group('recherche filtrée', () => {
    const search = http.get(
      `${BASE_URL}/api/accommodations?city=Abidjan&sort=price_asc&page=1`,
      { tags: { name: 'GET /accommodations?filters' } }
    );
    check(search, { 'recherche 200': (r) => r.status === 200 });
  });

  sleep(0.5);

  group('page détail', () => {
    const detail = http.get(`${BASE_URL}/api/accommodations/30`, { tags: { name: 'GET /accommodations/{id}' } });
    check(detail, { 'détail 200': (r) => r.status === 200 });

    const reviews = http.get(`${BASE_URL}/api/accommodations/30/reviews`, {
      tags: { name: 'GET /accommodations/{id}/reviews' },
    });
    check(reviews, { 'avis 200': (r) => r.status === 200 });

    const similar = http.get(`${BASE_URL}/api/accommodations/30/similar`, {
      tags: { name: 'GET /accommodations/{id}/similar' },
    });
    check(similar, { 'similaires 200': (r) => r.status === 200 });
  });

  sleep(1);
}

// --- Scénario 2 : voyageur connecté (login une fois par VU, puis activité de session) ---
let travelerToken = null;

export function authenticatedFlow() {
  if (!travelerToken) {
    const account = DEMO_ACCOUNTS[__VU % DEMO_ACCOUNTS.length];
    travelerToken = loginWithRetry(account.email, account.password);
  }
  if (!travelerToken) {
    sleep(1);
    return;
  }

  const opts = authHeaders(travelerToken);

  group('session voyageur', () => {
    const me = http.get(`${BASE_URL}/api/me`, { ...opts, tags: { name: 'GET /me' } });
    check(me, { '/me 200': (r) => r.status === 200 });

    const notifs = http.get(`${BASE_URL}/api/me/notifications`, {
      ...opts,
      tags: { name: 'GET /me/notifications' },
    });
    check(notifs, { 'notifications 200': (r) => r.status === 200 });

    const loyalty = http.get(`${BASE_URL}/api/me/loyalty`, { ...opts, tags: { name: 'GET /me/loyalty' } });
    check(loyalty, { 'fidélité 200': (r) => r.status === 200 });
  });

  sleep(1 + Math.random());
}

// --- Scénario 3 : tableaux de bord admin + hôte (endpoints authentifiés les plus lourds) ---
let dashboardToken = null;
let dashboardRole = null;

export function adminHostApi() {
  if (!dashboardToken) {
    // Moitié des VUs testent le tableau de bord admin, l'autre moitié le tableau de bord hôte
    const account = __VU % 2 === 0 ? DEMO_ACCOUNTS[0] : DEMO_ACCOUNTS[1];
    dashboardToken = loginWithRetry(account.email, account.password);
    dashboardRole = account.label;
  }
  if (!dashboardToken) {
    sleep(1);
    return;
  }

  const opts = authHeaders(dashboardToken);

  if (dashboardRole === 'admin') {
    group('dashboard admin', () => {
      const analytics = http.get(`${BASE_URL}/api/analytics/admin`, { ...opts, tags: { name: 'GET /analytics/admin' } });
      check(analytics, { 'analytics admin 200': (r) => r.status === 200 });

      const map = http.get(`${BASE_URL}/api/admin/tourism/map`, { ...opts, tags: { name: 'GET /admin/tourism/map' } });
      check(map, { 'carte touristique 200': (r) => r.status === 200 });

      const stats = http.get(`${BASE_URL}/api/admin/tourism/stats`, { ...opts, tags: { name: 'GET /admin/tourism/stats' } });
      check(stats, { 'stats touristiques 200': (r) => r.status === 200 });
    });
  } else {
    group('dashboard hôte', () => {
      const analytics = http.get(`${BASE_URL}/api/analytics/host`, { ...opts, tags: { name: 'GET /analytics/host' } });
      check(analytics, { 'analytics hôte 200': (r) => r.status === 200 });

      const loyaltyStats = http.get(`${BASE_URL}/api/host/loyalty/stats`, {
        ...opts,
        tags: { name: 'GET /host/loyalty/stats' },
      });
      check(loyaltyStats, { 'stats fidélité hôte 200': (r) => r.status === 200 });
    });
  }

  sleep(1.5 + Math.random());
}
