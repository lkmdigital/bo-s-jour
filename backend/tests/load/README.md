# Tests de charge k6

Suite de test de charge pour le backend Laravel de bo séjour, écrite avec [k6](https://k6.io/).
Couvre 3 scénarios simultanés : navigation publique anonyme, session voyageur connecté,
tableaux de bord admin/hôte. Volontairement exclus : réservation/paiement (flux sensible,
jamais de charge synthétique dessus) et inscription en masse (évite de polluer la base de
faux comptes).

## Installation

```bash
brew install k6
```

## Lancer contre le backend local

1. Démarrer le backend sur un port dédié, **avec plusieurs workers** — le serveur de dev PHP
   (`php artisan serve`) est mono-thread par défaut et rejette une bonne partie des requêtes
   sous charge concurrente sans ça :

   ```bash
   cd backend
   PHP_CLI_SERVER_WORKERS=16 php artisan serve --host=127.0.0.1 --port=8010
   ```

2. Lancer le test (depuis ce dossier) :

   ```bash
   k6 run loadtest.js
   ```

   Contre un autre port : `BASE_URL=http://127.0.0.1:PORT k6 run loadtest.js`

## ⚠️ Le rate-limiter global fausse les résultats en local

L'API a un rate-limiter global (`throttle:240,1,global-api`,
[bootstrap/app.php](../../bootstrap/app.php)) qui plafonne à 240 requêtes/minute **par IP**.
En local, tout le trafic k6 sort de la même IP (127.0.0.1) — la charge simulée dépasse
largement 240/min, donc le limiteur bloque la majorité des requêtes bien avant que le
backend lui-même soit sous tension. Ce n'est pas un bug : c'est la protection anti-abus qui
fonctionne comme prévu (voir le commentaire dans `bootstrap/app.php`).

Pour mesurer la vraie capacité du backend (indépendamment de cette protection par IP),
relever temporairement la limite avant le run :

```php
// bootstrap/app.php — TEMPORAIRE, ne jamais commiter ce changement
$middleware->api(append: [
    'throttle:100000,1,global-api',
]);
```

Puis **revenir à `throttle:240,1,global-api` immédiatement après** (`git diff` doit être vide).
Le rate-limiter de connexion (`throttle:10,1,auth-login`, anti-bruteforce) est un compteur
séparé et reste actif quoi qu'il arrive — c'est volontaire, le script gère les 429 qu'il
génère via retry avec backoff (métrique `login_rate_limited_429`).

## Comptes de démo utilisés

`admin@monbeaupays.com` / `password123` et `host1@monbeaupays.com` / `password` — comptes
seedés par `database/seeders/AdminUserSeeder.php` et `DatabaseSeeder.php`, déjà en clair
dans ces fichiers (aucune credential nouvelle exposée par ce script).

## Contre la production

**Ne jamais lancer ce script contre `api.bosejour.ci` sans validation explicite au préalable**
— une charge « en masse » peut ralentir ou rendre indisponible le site pour les vrais
visiteurs pendant le test. Si besoin un jour, prévoir un moment creux et une charge maîtrisée
(`BASE_URL=https://api.bosejour.ci k6 run loadtest.js`), jamais le scénario réservation/paiement.

## Dernier résultat connu (2026-08-31, local, throttle global relevé temporairement)

- 5 910/5 910 checks réussis (100%), 0 erreur applicative
- ~58,7 req/s soutenues, 42 VUs simultanés
- Temps de réponse : moyenne 184 ms, p95 295 ms (seuil `p(95)<1000ms` largement respecté)
- Le throttle de login (10/min) a déclenché 36 fois pendant le run — comportement voulu
