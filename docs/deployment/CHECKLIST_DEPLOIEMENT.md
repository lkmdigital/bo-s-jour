# ✅ Checklist de Déploiement - MonBeauPays.com

Utilisez cette checklist pour vous assurer que tous les éléments sont en place avant et après le déploiement.

## 📋 Pré-déploiement

### Backend Laravel
- [ ] Fichier `.env` créé et configuré avec les bonnes valeurs
- [ ] Base de données créée sur Hostinger
- [ ] Variables d'environnement configurées (DB, APP_URL, etc.)
- [ ] Composer installé (`composer install --no-dev`)
- [ ] Clé d'application générée (`php artisan key:generate`)
- [ ] Migrations exécutées (`php artisan migrate`)
- [ ] Seeders exécutés (rôles, permissions, admin, méthodes de paiement)
- [ ] Permissions configurées (`chmod -R 755 storage bootstrap/cache`)
- [ ] Lien symbolique créé (`php artisan storage:link`)
- [ ] Caches optimisés (`php artisan optimize`)
- [ ] Fichier `.htaccess` présent dans `public/`

### Frontend Next.js
- [ ] Fichier `.env.production` créé avec `NEXT_PUBLIC_API_URL`
- [ ] Dépendances installées (`npm ci --production`)
- [ ] Build de production créé (`npm run build`)
- [ ] Configuration `next.config.js` mise à jour pour la production
- [ ] Images distantes configurées dans `next.config.js`

### Infrastructure
- [ ] Domaine configuré (ou sous-domaine pour l'API)
- [ ] SSL/HTTPS activé
- [ ] PHP 8.2+ installé
- [ ] Node.js 18+ installé (si SSR)
- [ ] MySQL/MariaDB configuré
- [ ] Accès SSH/FTP configuré

## 🚀 Déploiement

### Upload des fichiers
- [ ] Fichiers backend uploadés vers `api/` (ou sous-domaine)
- [ ] Fichiers frontend uploadés (build `.next/` ou `out/`)
- [ ] Fichiers `public/` uploadés
- [ ] Fichier `.env` uploadé (sans être versionné)

### Configuration serveur
- [ ] Configuration Apache/Nginx pour le backend
- [ ] Configuration Apache/Nginx pour le frontend
- [ ] Redirections configurées (www vers non-www ou inversement)
- [ ] CORS configuré dans `config/cors.php`
- [ ] Sanctum configuré dans `config/sanctum.php`

### Base de données
- [ ] Base de données créée
- [ ] Utilisateur DB créé avec les bons privilèges
- [ ] Migrations exécutées
- [ ] Seeders exécutés
- [ ] Connexion testée

## ✅ Post-déploiement

### Tests fonctionnels
- [ ] Page d'accueil accessible
- [ ] API accessible (`/api/accommodations`)
- [ ] Connexion utilisateur fonctionne
- [ ] Inscription utilisateur fonctionne
- [ ] Affichage des hébergements
- [ ] Réservation fonctionne
- [ ] Upload d'images fonctionne
- [ ] Dashboard hôte accessible
- [ ] Dashboard admin accessible

### Tests de sécurité
- [ ] HTTPS fonctionne partout
- [ ] `.env` n'est pas accessible publiquement
- [ ] Fichiers sensibles protégés (`.htaccess`)
- [ ] CORS configuré correctement
- [ ] Tokens d'authentification fonctionnent

### Performance
- [ ] Cache Laravel activé
- [ ] Images optimisées
- [ ] Build Next.js optimisé
- [ ] Temps de chargement acceptable

### Monitoring
- [ ] Logs Laravel accessibles (`storage/logs/laravel.log`)
- [ ] Erreurs 500 surveillées
- [ ] Base de données surveillée
- [ ] Espace disque surveillé

## 🔧 Configuration Email (Optionnel)

- [ ] SMTP configuré dans `.env`
- [ ] Email de test envoyé
- [ ] Emails transactionnels fonctionnent (inscription, réservation)

## 📱 Tests multi-appareils

- [ ] Desktop fonctionne
- [ ] Mobile fonctionne
- [ ] Tablette fonctionne
- [ ] Différents navigateurs testés

## 🔄 Plan de rollback

- [ ] Backup de la base de données avant déploiement
- [ ] Backup des fichiers avant déploiement
- [ ] Procédure de rollback documentée
- [ ] Accès aux backups vérifié

## 📝 Documentation

- [ ] URLs de production documentées
- [ ] Identifiants admin documentés (stockés de manière sécurisée)
- [ ] Procédure de mise à jour documentée
- [ ] Contacts support documentés

---

**Date de déploiement:** _______________
**Version déployée:** _______________
**Déployé par:** _______________

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

