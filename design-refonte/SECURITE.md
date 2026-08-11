# Sécurité — bo séjour (checklist)

État de la sécurité de la plateforme (backend Laravel 11 + frontend Next.js) et
liste des actions à mener. Cases à cocher pour le suivi.

Légende : ✅ fait · 🔴 critique (prod) · 🟠 recommandé · 🟢 bonus · 🔑 dépend du client

---

## ✅ Déjà en place (vérifié dans le code)

- [x] **Injection SQL** — Eloquent + requêtes **paramétrées** partout. Les `DB::raw`
      ne servent qu'aux agrégats (COUNT/SUM/DATE) sans entrée utilisateur ; les
      `whereRaw` utilisent le binding `?`. Pas de concaténation d'entrée utilisateur.
- [x] **Mass assignment** — tous les modèles utilisent `$fillable` (aucun `guarded = []`).
- [x] **En-têtes de sécurité** (`SecurityHeaders`) — `X-Frame-Options: DENY`,
      `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`,
      `Permissions-Policy`, **HSTS** (HTTPS), **CSP**.
- [x] **Auth** — tokens Sanctum, mots de passe **bcrypt**, 2FA (Google Authenticator),
      **vérification e-mail OTP** (une seule fois, à la création du compte),
      journalisation des événements (`LogSecurityEvents`).
- [x] **Rate limiting par route** — login, register, OTP, paiement, favoris, etc.
- [x] **Uploads KYC** validés (types image, max 5 Mo).
- [x] **XSS** — React échappe par défaut côté front ; `strip_tags` sur certaines entrées back.
- [x] **CORS** — liste blanche d'origines + méthodes/headers limités (jamais `*`).

### Ajouté le 2026-08-10
- [x] **🔴 #13 Authentification du webhook de paiement** — `PaymentController::verifyWebhookSignature`
      rejette les webhooks forgés. Accepte un **secret partagé** (header `X-Webhook-Secret`/
      `X-Webhook-Token`/`X-Api-Key`, query `token`, ou body `secret`) **OU** une **signature
      HMAC-SHA256** du corps (`X-Signature`). Comparaison à temps constant (`hash_equals`).
      → Config : `MALIA_PAY_WEBHOOK_SECRET` (à renseigner en prod **et** côté Malia Pay).
      Tant que vide : accepté avec avertissement journalisé (rétrocompat).
- [x] **🔴 #3 CORS nettoyé** — retrait des origines `http://` non chiffrées, IP brutes et
      vieux domaines (`monbeaupays.com`, `loyerpay.ci`). Défaut = localhost (dev) +
      `https://bosejour.ci`. Surchargeable via `CORS_ALLOWED_ORIGINS`.
- [x] **🟠 #6 Rate-limit global de l'API** — `throttle:120,1` (120 req/min par utilisateur/IP)
      sur tout le groupe `api`, en plus des limites strictes par route.
- [x] **🟠 #9 Expiration des tokens Sanctum** — `config/sanctum.php 'expiration'` = 30 jours
      (`SANCTUM_TOKEN_EXPIRATION`, minutes) ; purge quotidienne `sanctum:prune-expired` (Kernel).
- [x] **🟠 #7 Verrouillage après échecs de connexion** — après **5 échecs** (par e-mail + IP),
      **blocage 15 min** (429), compteur réinitialisé à la connexion réussie (`RateLimiter`).

---

## 🔴 Critique — à faire pour la production (réglages `.env` / serveur)

- [ ] **`APP_DEBUG=false`** et **`APP_ENV=production`** en prod.
      ⚠️ Actuellement `APP_DEBUG=true` : les erreurs renvoient la **stack trace complète**
      (fuite d'infos). Impératif avant mise en ligne.
- [ ] **HTTPS forcé partout** — `APP_URL=https://api.bosejour.ci`, redirection 301 http→https (Nginx).
- [ ] **`MALIA_PAY_WEBHOOK_SECRET`** renseigné en prod (+ configuré côté Malia Pay) 🔑.
- [x] **Secrets retirés du suivi git (#4, 2026-08-10)** — `git rm --cached` sur
      `frontend/.env.local.prod-backup`, `backend/backend-chambres.tar.gz`,
      `backend/app/Http/Controllers/AuthController.php.backup` + `.gitignore` durci
      (`.env`/`.env.*` sauf `.env.example`, `*prod-backup*`, `*.backup`, `*.bak`, `*.orig`).
- [ ] **🔴 Rotation des secrets exposés** — les fichiers ci-dessus **restent dans l'historique
      git** (déjà poussés sur GitHub). Considérer tout secret qu'ils contenaient comme
      **compromis** → **régénérer/changer** (clés API, mots de passe, `APP_KEY` prod, etc.).
- [ ] **Purge de l'historique** (optionnel mais recommandé) — `git filter-repo` ou BFG
      Repo-Cleaner pour effacer ces fichiers de tout l'historique, puis force-push
      (⚠️ destructif : tous les collaborateurs doivent re-cloner).
- [ ] **`APP_KEY`** unique et secret en prod (ne jamais régénérer sur prod).
- [ ] **`FRONTEND_URL=https://bosejour.ci`** en prod (retours de paiement Malia Pay).

---

## 🟠 Recommandé — durcissement

- [ ] **Cookies/session** — `SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=lax`.
- [ ] **CSP stricte** — auditer `Content-Security-Policy` (limiter `unsafe-inline`/`unsafe-eval`).
- [ ] **Uploads** — stockage hors webroot, vérification du **type MIME réel**, renommage des fichiers.
- [ ] **Webhook renforcé** — en plus de la signature, **re-vérifier la transaction** auprès de
      Malia Pay (appel API de confirmation) avant de valider un paiement 🔑.
- [ ] **Validation stricte** partout via FormRequests (auditer chaque endpoint public).
- [ ] **Logs** — ne jamais journaliser de secrets/PII ; rotation/purge.

---

## 🟢 Bonus

- [ ] **`composer audit`** + **`npm audit`** réguliers (CVE des dépendances).
- [ ] **2FA obligatoire** pour les comptes **admin**.
- [ ] **Backups chiffrés** + test de restauration.
- [ ] **Monitoring/alertes** sur `LogSecurityEvents` (tentatives échouées, pics).
- [ ] **WAF / Cloudflare** devant le site (anti-DDoS, filtrage).
- [ ] **`/.well-known/security.txt`** + politique de divulgation responsable.

---

## Variables `.env` de sécurité (récapitulatif prod)

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.bosejour.ci
FRONTEND_URL=https://bosejour.ci
CORS_ALLOWED_ORIGINS=https://bosejour.ci,https://www.bosejour.ci
MALIA_PAY_WEBHOOK_SECRET=<secret partagé avec Malia Pay>
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
```
