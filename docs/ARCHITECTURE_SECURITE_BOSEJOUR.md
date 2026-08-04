# BOSEJOUR — Architecture, Sécurité et Conformité

> Document de réponse aux questions techniques et réglementaires sur la plateforme BOSEJOUR.
> Date : 08 juin 2026

---

## Table des matières

1. [Architecture de la solution](#1-architecture-de-la-solution)
2. [Données personnelles dans la base touristique](#2-données-personnelles-dans-la-base-touristique)
3. [Cadre réglementaire applicable](#3-cadre-réglementaire-applicable)
4. [Sécurisation des transactions Mobile Money](#4-sécurisation-des-transactions-mobile-money)
5. [Hébergement de la plateforme](#5-hébergement-de-la-plateforme)
6. [Journalisation des transactions financières](#6-journalisation-des-transactions-financières)
7. [Conservation des journaux d'activité et accès](#7-conservation-des-journaux-dactivité-et-accès)
8. [Tests d'intrusion (Pentest)](#8-tests-dintrusion-pentest)

---

## 1. Architecture de la solution

### 1.1 Stack technologique

| Couche | Technologie | Version |
|--------|------------|---------|
| **Frontend** | Next.js (React) + TypeScript | Next.js 14, React 18 |
| **Styling** | TailwindCSS | 3.4 |
| **State management** | Zustand + TanStack React Query | Zustand 4.5, React Query 5 |
| **Backend API** | Laravel (PHP) | Laravel 11, PHP 8.2 |
| **Authentification** | Laravel Sanctum (Bearer Token) | Sanctum 4.0 |
| **Base de données** | MySQL / MariaDB | — |
| **Passerelle de paiement** | Malia-Pay (agrégateur ivoirien) | API v1 REST |
| **OAuth** | Google, Microsoft (via Laravel Socialite) | Socialite 5.10 |
| **2FA** | Google Authenticator (TOTP) + OTP par email | pragmarx/google2fa 9.0 |
| **Notifications push** | OneSignal | API v1 |
| **Traitement d'images** | Intervention Image | 3.8 |
| **Serveur applicatif** | Node.js (standalone) + PM2 / PHP-FPM + Nginx | — |

### 1.2 Architecture applicative

```
┌──────────────────────────────────────────────────────────┐
│                    NAVIGATEUR CLIENT                      │
│              (Next.js SSR + Client-Side React)            │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS (TLS 1.2+)
                         ▼
┌──────────────────────────────────────────────────────────┐
│                     NGINX (Reverse Proxy)                 │
│         ┌──────────────┐    ┌──────────────────┐         │
│         │ bosejour.ci  │    │ api.bosejour.ci  │         │
│         │ → PM2 :3000  │    │ → PHP-FPM :9000  │         │
│         └──────────────┘    └──────────────────┘         │
└────────────────────────┬─────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌─────────────┐ ┌──────────┐ ┌────────────────┐
   │  MySQL /    │ │ Storage  │ │ Services tiers │
   │  MariaDB    │ │ (fichiers│ │ - Malia-Pay    │
   │             │ │  uploads)│ │ - OneSignal    │
   └─────────────┘ └──────────┘ │ - Google OAuth │
                                └────────────────┘
```

### 1.3 Principes d'architecture

- **API REST** : Toutes les communications frontend ↔ backend passent par des endpoints REST sécurisés (`/api/*`).
- **RBAC (Role-Based Access Control)** : Système de rôles et permissions granulaires (admin, host, user, contrôleur) avec middlewares `role:` et `permission:`.
- **SPA + SSR** : Next.js en mode standalone avec Server-Side Rendering pour le SEO et le chargement initial rapide.
- **Séparation des domaines** : Frontend (`bosejour.ci`) et API (`api.bosejour.ci`) sur des sous-domaines distincts avec CORS configuré.

---

## 2. Données personnelles dans la base touristique

**Oui, la base de données contient des données personnelles.** Voici le détail :

### 2.1 Données personnelles collectées

| Catégorie | Champs | Sensibilité |
|-----------|--------|-------------|
| **Identité** | Nom, email, téléphone, date de naissance, bio | Standard |
| **Adresse** | Adresse ligne 1/2, ville, code postal, pays | Standard |
| **Documents d'identité** | Type de pièce, numéro, scans recto/verso | **Élevée** |
| **Documents professionnels (hôtes)** | RCCM, numéro contribuable, licence d'exploitation | **Élevée** |
| **Connexion** | Mot de passe (hashé), IP dernière connexion, identifiants OAuth | **Élevée** |
| **2FA** | Secret TOTP, codes de récupération | **Élevée** |
| **Transactions** | Montants, références de paiement, données de transaction | **Élevée** |

### 2.2 Protections mises en place

1. **Chiffrement des données sensibles au repos** — Trait `EncryptsSensitiveData` utilisant le chiffrement AES-256-CBC via la clé applicative Laravel (`APP_KEY`). Les données sensibles sont chiffrées avant stockage et déchiffrées à la lecture.

2. **Mots de passe** — Hashés automatiquement via Bcrypt (cast `hashed` de Laravel). Les mots de passe ne sont jamais stockés en clair.

3. **Champs masqués en API** — Les champs `password`, `two_factor_secret`, `two_factor_recovery_codes`, `email_otp_code` sont dans la liste `$hidden` du modèle User et ne sont **jamais exposés** dans les réponses API.

4. **HTTPS obligatoire** — Header HSTS activé : `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`. Toutes les communications sont chiffrées en transit.

5. **Headers de sécurité HTTP** :
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Content-Security-Policy` restrictive
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(), microphone=(), camera=()`

6. **Sanitisation des entrées** — Le `SecurityService` filtre les caractères de contrôle et échappe les caractères HTML pour prévenir les injections XSS.

7. **Blocage IP automatique** — Détection et blocage des IPs suspectes après 10 tentatives en 1 heure, avec journalisation dans le canal sécurité.

8. **Stockage sécurisé des fichiers** — Les documents d'identité sont stockés dans `storage/app/` (répertoire non accessible publiquement). Seul le lien symbolique `public/storage` expose les fichiers publics (photos d'hébergements).

---

## 3. Cadre réglementaire applicable

### 3.1 Lois applicables

| Réglementation | Applicabilité | Justification |
|----------------|---------------|---------------|
| **Loi n°2013-450 du 19 juin 2013** relative à la protection des données à caractère personnel (Côte d'Ivoire) | **Oui — obligatoire** | BOSEJOUR est opéré depuis la Côte d'Ivoire, collecte et traite des données de résidents ivoiriens. L'ARTCI est l'autorité de contrôle compétente. |
| **Ordonnance n°2012-293** relative aux télécommunications et TIC | **Oui** | Plateforme en ligne opérant en Côte d'Ivoire. |
| **RGPD (Règlement UE 2016/679)** | **Potentiellement** | Si des utilisateurs européens utilisent la plateforme (touristes européens), le RGPD peut s'appliquer au titre de l'article 3.2 (offre de biens/services à des personnes dans l'UE). |
| **Convention de l'Union Africaine sur la cybersécurité et la protection des données (Convention de Malabo, 2014)** | **Oui** | La Côte d'Ivoire est signataire de cette convention. |

### 3.2 Actions de conformité recommandées

- **Déclaration à l'ARTCI** : Enregistrement obligatoire du traitement de données personnelles auprès de l'autorité compétente.
- **Politique de confidentialité** : Publication obligatoire sur le site, conforme à la loi ivoirienne, détaillant les finalités du traitement, les destinataires, les durées de conservation et les droits des utilisateurs.
- **Consentement explicite** : Collecte du consentement utilisateur lors de l'inscription pour le traitement des données personnelles.
- **Droits des utilisateurs** : Mise en œuvre des droits d'accès, de rectification et de suppression des données personnelles.
- **DPO (Délégué à la Protection des Données)** : Désignation recommandée, surtout en cas de traitement à grande échelle.
- **Mentions légales** : Publication des mentions légales obligatoires (identité de l'éditeur, hébergeur, etc.).

---

## 4. Sécurisation des transactions Mobile Money

### 4.1 Opérateurs intégrés

BOSEJOUR utilise **Malia-Pay** (`https://malia-pay.com`) comme agrégateur de paiement. Malia-Pay est un agrégateur ivoirien qui centralise les différents moyens de paiement. Les canaux supportés :

| Canal | Code interne | Identifiant API Malia-Pay |
|-------|-------------|---------------------------|
| **Wave Côte d'Ivoire** | `wave-ci` | `WAVECI` |
| **Orange Money CI** | `orange-ci` | `OMCI` |
| **Visa / Mastercard** | `visa-mastercard` | `CARD` |
| **Djamo** | `djamo` | `DJAMO` |

### 4.2 Architecture du flux de paiement

```
Client → API BOSEJOUR (initiate) → API Malia-Pay → Génération lien de paiement
                                                          ↓
Client ←────── Redirection vers page Malia-Pay ──────────┘
                                                          ↓
                                            Paiement Mobile Money / CB
                                            (environnement sécurisé Malia-Pay)
                                                          ↓
API BOSEJOUR (webhook) ←── Notification Malia-Pay ───────┘
        ↓
  DB::transaction {
    - Mise à jour statut paiement (completed/failed)
    - Mise à jour réservation (confirmed + code)
    - Création commission plateforme
    - Envoi emails confirmation (client + hôte)
    - Envoi code de réservation (message interne)
  }
```

### 4.3 Mécanismes de sécurisation

1. **Aucun stockage de données bancaires** — BOSEJOUR ne stocke jamais de données de carte bancaire ou de compte Mobile Money. Le paiement est intégralement délégué à Malia-Pay via un lien de paiement externe (redirection). BOSEJOUR ne voit que la référence de transaction et le statut.

2. **Webhook de confirmation côté serveur** — Le paiement n'est confirmé que lorsque le serveur BOSEJOUR reçoit un callback POST `/api/payments/webhook` de Malia-Pay avec la référence et le statut. Le client ne peut pas simuler un paiement réussi.

3. **Référence unique** — Chaque transaction a une référence alphanumérique unique de 15 caractères générée aléatoirement côté serveur.

4. **Rate limiting strict** — Limitation des tentatives de paiement : maximum 5 par minute par IP (`throttle:5,1`).

5. **Journalisation exhaustive** — Chaque étape du paiement est loggée : initiation, création du lien, réponse API Malia-Pay, webhook reçu, avec horodatage ISO 8601 et identifiants complets.

6. **Transactions atomiques en base** — Les webhooks de paiement sont traités dans des `DB::transaction` pour garantir la cohérence : soit toutes les opérations réussissent (paiement + réservation + commission), soit aucune.

7. **Protection anti-doublons** — Vérification qu'une seule commission est créée par réservation, avec contrôle que le total des commissions ne dépasse jamais le montant de la réservation.

8. **Montants vérifiés** — Le montant du paiement est calculé côté serveur (jamais côté client) et arrondi en entier pour compatibilité avec l'API Malia-Pay.

### 4.4 Options de paiement intelligentes

Le système applique des règles automatiques pour déterminer les options de paiement disponibles :

| Condition | Option disponible |
|-----------|-------------------|
| Moins de 48h avant l'arrivée | Paiement intégral obligatoire |
| Séjour long (≥ 7 nuits) | Paiement intégral obligatoire |
| Réservation non remboursable | Paiement intégral obligatoire |
| Réservation modifiable | Paiement intégral (avec réduction) OU Garantie (1ère nuitée) |

---

## 5. Hébergement de la plateforme

### 5.1 Infrastructure actuelle

| Élément | Détail |
|---------|--------|
| **Type** | VPS (Virtual Private Server) dédié |
| **Hébergeur** | Hébergeur international |
| **OS** | Linux (Ubuntu/Debian) |
| **Reverse proxy** | Nginx avec certificat SSL/TLS (HTTPS) |
| **Frontend** | Node.js en mode standalone, géré par PM2 (port 3000) |
| **Backend** | PHP-FPM (port 9000), Laravel 11 |
| **Base de données** | MySQL / MariaDB sur le même serveur |
| **Domaines** | `bosejour.ci` (frontend), `api.bosejour.ci` (API) |

### 5.2 Garanties de sécurité

- **HTTPS obligatoire** avec HSTS preload — chiffrement TLS de toutes les communications en transit.
- **Headers de sécurité HTTP complets** — CSP, X-Frame-Options DENY, X-XSS-Protection, Referrer-Policy, Permissions-Policy (voir section 2.2).
- **Accès SSH sécurisé** — Accès au serveur par clé SSH ou mot de passe.
- **Isolation des services** — Frontend (PM2 port 3000) et Backend (PHP-FPM port 9000) sont des processus séparés, isolés par Nginx.
- **Déploiement zero-downtime** — Scripts de déploiement automatisés avec backup avant mise à jour, swap atomique (pas d'interruption de service) et rollback automatique en cas d'erreur.
- **Backups automatiques** — 3 dernières versions conservées, restauration possible en quelques secondes.

### 5.3 Recommandations d'amélioration

- **Souveraineté des données** : Envisager un hébergeur local ou régional (ex : OVH Afrique, MTN Business Cloud, Africa RackSpace) pour se conformer pleinement à la loi ivoirienne sur la localisation des données.
- **Réplication de la base de données** : Mise en place d'une réplication sur un second datacenter pour la haute disponibilité.
- **Chiffrement au repos** : Activer le chiffrement du disque du VPS (LUKS ou équivalent).
- **WAF (Web Application Firewall)** : Ajouter un WAF (ex : Cloudflare, AWS WAF) devant Nginx pour filtrer les attaques courantes.
- **Monitoring** : Mettre en place un monitoring 24/7 (Uptime Robot, Datadog, Prometheus/Grafana).

---

## 6. Journalisation des transactions financières

### 6.1 Transactions journalisées

**Oui, toutes les transactions financières sont journalisées avec horodatage, identifiant utilisateur et montant.**

| Mécanisme | Données enregistrées |
|-----------|---------------------|
| **Table `payments`** | `id`, `user_id`, `booking_id`, `amount`, `status`, `payment_method`, `payment_reference`, `transaction_id`, `paid_at` (horodatage), `payment_data` (JSON complet incluant les données webhook Malia-Pay), `created_at`, `updated_at` |
| **Table `commissions`** | `id`, `booking_id`, `payment_id`, `host_id`, `booking_amount`, `commission_rate`, `commission_amount`, `host_amount`, `status`, `created_at`, `updated_at` |
| **Table `bookings`** | `id`, `user_id`, `total_price`, `amount_paid`, `deposit_amount`, `payment_status`, `payment_type`, `deposit_paid_at`, `created_at`, `updated_at` |
| **Logs applicatifs** | Chaque étape du paiement est loggée via `\Log::info()` avec : `payment_id`, `user_id`, `amount`, `reference`, `transaction_id`, horodatage |
| **Logs de sécurité** | Canal dédié `security` : IP, user_agent, URL, méthode HTTP, user_id, horodatage ISO 8601 |

### 6.2 Inviolabilité des logs

**État actuel :**

Les logs sont stockés dans `storage/logs/` sur le serveur avec rotation journalière. Les données transactionnelles sont en base de données MySQL avec horodatages automatiques (`created_at`, `updated_at`).

**Limites :** Les fichiers de logs sur le serveur pourraient théoriquement être modifiés par un utilisateur root.

**Recommandations pour garantir l'inviolabilité :**

- Externaliser les logs vers un service immuable (ex : AWS CloudWatch Logs, Datadog, Elasticsearch + Kibana, ou serveur syslog distant).
- Implémenter des checksums/hashes chaînés sur les entrées de logs financiers pour détecter toute modification.
- Mettre en place un journal d'audit en base de données avec des enregistrements immuables (INSERT-only, sans UPDATE/DELETE autorisé).
- Signer numériquement les logs de transactions critiques.

---

## 7. Conservation des journaux d'activité et accès

### 7.1 Durées de conservation

| Type de journal | Durée de conservation | Emplacement |
|-----------------|-----------------------|-------------|
| **Logs applicatifs généraux** | 30 jours (rotation quotidienne) | `storage/logs/laravel-YYYY-MM-DD.log` |
| **Logs de sécurité** | 90 jours (rotation quotidienne) | `storage/logs/security-YYYY-MM-DD.log` |
| **Logs upload média** | 30 jours | `storage/logs/media-upload-YYYY-MM-DD.log` |
| **Données transactionnelles** (en BDD) | **Illimitée** | Tables `payments`, `commissions`, `bookings` |
| **Historique activités utilisateur** | **Illimitée** | Table `user_activity_logs` |
| **Historique réservations** | **Illimitée** | Table `booking_histories` |
| **Historique validation hôtes** | **Illimitée** | Table `host_validation_histories` |
| **Notes admin** | **Illimitée** | Table `admin_notes` |

### 7.2 Matrice d'accès

| Niveau d'accès | Qui | Moyen d'accès |
|----------------|-----|---------------|
| **Fichiers de logs serveur** | Administrateur système (root SSH) | Accès SSH direct au serveur |
| **Logs de sécurité applicatifs** | Administrateurs avec permission `admin.dashboard.read` | Interface d'administration |
| **Transactions / Paiements** | Administrateurs + Hôtes (uniquement leurs propres données) | Dashboard API REST sécurisé (RBAC) |
| **Historique utilisateur** | Administrateurs avec permission `users.read` | Endpoint `/api/admin/users/{id}/activity-logs` |
| **Audit établissements** | Administrateurs avec permission `accommodations.read` | Endpoint `/api/admin/accommodations/{id}/audit-logs` |
| **Demandes de retrait** | Administrateurs avec rôle `admin` | Endpoint `/api/admin/withdrawal-requests` |

### 7.3 Recommandations

- Aligner la durée de conservation sur les **exigences légales ivoiriennes** (la loi n°2013-450 recommande une durée proportionnée à la finalité du traitement).
- Conserver les **logs de transactions financières au minimum 10 ans** (exigence fiscale courante en Côte d'Ivoire et dans la zone OHADA).
- Documenter formellement la **politique de rétention des données** dans la politique de confidentialité publiée sur le site.
- Mettre en place une **procédure de purge automatique** des données personnelles non transactionnelles après la durée de conservation légale.

---

## 8. Tests d'intrusion (Pentest)

### 8.1 État actuel

Aucun test d'intrusion formel n'a été réalisé à ce stade. Cependant, de nombreuses mesures de sécurité sont déjà implémentées (défense en profondeur).

### 8.2 Mesures de sécurité implémentées

| Couche | Mesure | Détail |
|--------|--------|--------|
| **Transport** | HTTPS + HSTS preload | Chiffrement TLS de toutes les communications |
| **Headers HTTP** | SecurityHeaders middleware | CSP, X-Frame-Options DENY, X-XSS-Protection, Referrer-Policy, Permissions-Policy |
| **Authentification** | Multi-facteur | Sanctum Bearer Token + 2FA TOTP (Google Authenticator) + OTP email |
| **Autorisation** | RBAC complet | Middlewares `role:` et `permission:` sur chaque route sensible |
| **Rate limiting** | Throttle granulaire | Login 5/min, Register 5/min, OTP 3/min, Paiement 5/min, Réservation 10/min |
| **Détection d'intrusion** | SecurityService | Blocage automatique d'IP après 10 tentatives suspectes par heure |
| **Journalisation** | LogSecurityEvents middleware | Traçabilité complète des accès aux routes sensibles et des erreurs 401/403 |
| **Sanitisation** | SecurityService | Filtrage XSS, échappement HTML, validation stricte des entrées (email, téléphone) |
| **Mots de passe** | Bcrypt | Hashage automatique, jamais stockés en clair |
| **Chiffrement** | AES-256-CBC | Chiffrement des données sensibles au repos via le trait EncryptsSensitiveData |
| **OAuth** | Google / Microsoft | Validation côté serveur via Laravel Socialite |
| **CSRF** | Token sécurisé | Génération via `random_bytes(32)`, vérification par `hash_equals` |

### 8.3 Recommandations pour les tests d'intrusion

**Il est impératif de réaliser un pentest avant le lancement commercial**, surtout pour une plateforme manipulant des paiements en ligne.

**Périmètre recommandé :**

1. **OWASP Top 10** : Injections SQL, XSS (Cross-Site Scripting), CSRF, broken authentication, insecure deserialization, etc.
2. **Endpoints de paiement** : Test des webhooks, tentatives de contournement du flux de paiement, replay attacks.
3. **Escalade de privilèges** : Tentatives de contournement du RBAC (accès admin depuis un compte utilisateur).
4. **Uploads de fichiers** : Test d'upload de fichiers malveillants via les champs de documents d'identité.
5. **Configuration serveur** : Audit Nginx, PHP-FPM, PM2, MySQL (ports ouverts, versions, configuration).
6. **API fuzzing** : Test de robustesse des endpoints API avec des données inattendues.

**Prestataires possibles :**

| Type | Exemples |
|------|----------|
| **Cabinets locaux (Côte d'Ivoire)** | ABYSTER, CIBERProtect, Africa CyberSecurity (Abidjan) |
| **Cabinets internationaux présents en CI** | KPMG CI, Deloitte CI, Orange Cyberdefense Afrique |
| **Plateformes de bug bounty** | HackerOne, Bugcrowd, YesWeHack |

**Fréquence recommandée :**

- **Avant le lancement** (obligatoire)
- **Annuellement** (maintenance)
- **Après chaque modification majeure** de l'architecture ou des flux de paiement

---

## Annexe : Récapitulatif des technologies

```
Frontend :
  - Next.js 14 (React 18, TypeScript)
  - TailwindCSS 3.4
  - Zustand 4.5 (state management)
  - TanStack React Query 5 (data fetching)
  - Framer Motion (animations)
  - Lucide React (icônes)
  - Axios (HTTP client)

Backend :
  - Laravel 11 (PHP 8.2)
  - Laravel Sanctum 4.0 (authentification API)
  - Laravel Socialite 5.10 (OAuth Google/Microsoft)
  - pragmarx/google2fa 9.0 (2FA TOTP)
  - Intervention Image 3.8 (traitement images)
  - Guzzle 7.2 (HTTP client)

Infrastructure :
  - Nginx (reverse proxy + SSL/TLS)
  - PM2 (process manager Node.js)
  - PHP-FPM (FastCGI process manager)
  - MySQL / MariaDB
  - Malia-Pay (agrégateur de paiement)
  - OneSignal (notifications push)
```
