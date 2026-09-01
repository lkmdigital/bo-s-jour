# Docker (environnement local)

Conteneurise le projet pour le développement/test local — **n'affecte pas le déploiement
VPS actuel**, qui continue de tourner en Nginx + PHP-FPM classique via `./deploy.sh`
(rsync). C'est un chantier séparé, pas un prérequis à la mise en production.

## Services

| Service | Rôle |
|---|---|
| `mysql` | Base de données (port hôte `3307` pour ne pas entrer en conflit avec un MySQL local) |
| `redis` | Cache/sessions/queue (voir plus bas — évite le risque de deadlock `CACHE_STORE=database` découvert lors des tests de charge k6 du 2026-08-31) |
| `backend` | Laravel en PHP-FPM (port interne `9000`, pas exposé directement) |
| `backend-nginx` | Sert le backend, port hôte `8080` |
| `queue-worker` | `php artisan queue:work` — traite les jobs asynchrones (`ShouldQueue`) |
| `scheduler` | Boucle `php artisan schedule:run` toutes les 60s — équivalent conteneurisé du cron serveur (notamment `payments:flag-stuck-pending`, voir commit `dbcf742e`) |
| `frontend` | Next.js en mode `standalone`, port hôte `3000` |

## Démarrage

```bash
cp docker-compose.env.example .env
docker compose build
docker compose up -d

# Première fois seulement :
docker compose exec backend php artisan key:generate --show   # coller le résultat dans .env (APP_KEY=...), puis :
docker compose up -d --force-recreate backend queue-worker scheduler
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --force
```

- Backend : http://localhost:8080/api
- Frontend : http://localhost:3000

## Points vérifiés (2026-09-01)

Build + démarrage complet testés en conditions réelles : migrations (toutes, depuis le
début du projet) appliquées proprement sur une base MySQL 8.0 fraîche, seed OK, API et
frontend répondent, worker de queue fonctionnel (nécessite l'extension PHP `redis`,
déjà dans le `Dockerfile`).

## Pièges rencontrés en le construisant — évités pour toi

1. **Extension `redis` manquante** → `queue-worker` plantait en boucle
   (`Class "Redis" not found`) tant que `QUEUE_CONNECTION=redis` était utilisé sans
   l'extension PHP correspondante. Ajoutée au `Dockerfile` (`pecl install redis`).
2. **Chaque service avec son propre `build:` a sa PROPRE image** même si le contexte est
   identique — `docker compose build backend` ne reconstruit PAS automatiquement
   `queue-worker`/`scheduler` qui utilisent le même Dockerfile. Toujours lister les
   services explicitement : `docker compose build backend queue-worker scheduler`.
3. **Colima (VM Docker locale) peut se corrompre silencieusement si le disque hôte
   tombe à court d'espace pendant un build** (`fork/exec ...: input/output error`,
   `colima ssh -- df -h` renvoie lui-même une erreur I/O). `colima restart` répare dans
   la plupart des cas ; sinon `colima delete && colima start` (perd les images locales,
   pas les données du projet). **Garder au moins 3-4 Go libres sur le disque avant un
   build** — ce Mac est chroniquement proche de la limite, à surveiller.
4. **Un vieux process orphelin peut squatter un port** avant que Docker ne le mappe —
   si `curl http://localhost:3000` répond mais avec un comportement inattendu (mauvaise
   URL d'API, ancien code), vérifier `lsof -i :3000` : un `next dev`/`next start` lancé
   manuellement plus tôt peut rester actif et gagner la course sur le port avant le
   conteneur.
5. **`.env.production` de Next.js** (fichier local, gitignored, jamais dans le repo)
   est exclu du contexte de build via `.dockerignore` — sans ça, une valeur codée en
   dur localement pourrait silencieusement prendre le pas sur les `--build-arg`
   `NEXT_PUBLIC_*` du `docker-compose.yml`.

## `CACHE_STORE=redis` par défaut ici (différent du VPS actuel)

`docker-compose.env.example` utilise Redis pour le cache/session/queue — recommandation
déjà faite suite aux tests de charge k6 (`CACHE_STORE=database` provoque de vrais
deadlocks MySQL sous forte concurrence, voir `backend/tests/load/README.md`). Le VPS de
production est toujours en `database` tant que cette migration n'y a pas été faite
séparément — les deux environnements ne sont pas encore alignés sur ce point.

## Sécurité

- `MALIA_PAY_SANDBOX=true` par défaut — jamais d'appel opérateur réel depuis Docker local.
- `MAIL_MAILER=log` par défaut — jamais d'e-mail réel envoyé (leçon du 2026-09-01 : un
  dry-run avec de vrais identifiants SMTP a probablement envoyé un e-mail de test réel).
- `docker-compose.env.example` ne contient que des valeurs factices/vides — le vrai
  `.env` (à la racine, gitignored) n'est jamais commité.
