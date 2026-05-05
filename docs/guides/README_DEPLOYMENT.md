# 📦 Fichiers de Déploiement

Ce dossier contient tous les fichiers nécessaires pour déployer MonBeauPays.com sur Hostinger.

## 📚 Documentation

1. **DEPLOYMENT_HOSTINGER.md** - Guide complet et détaillé de déploiement (Laravel + Next.js)
2. **DEPLOYMENT_NESTJS.md** - Guide complet de déploiement pour NestJS Admin
3. **COMMANDES_DEPLOIEMENT_NESTJS.md** - Commandes rapides pour déployer NestJS
4. **QUICK_START_DEPLOYMENT.md** - Guide rapide pour un déploiement express
5. **CHECKLIST_DEPLOIEMENT.md** - Checklist à suivre avant et après le déploiement

## 🛠️ Fichiers de Configuration

### Backend Laravel
- `backend/.htaccess` - Redirection vers public/
- `backend/public/.htaccess` - Configuration Apache pour Laravel
- `backend/env.production.template` - Template pour le fichier .env de production

### Frontend Next.js
- `frontend/env.production.template` - Template pour les variables d'environnement de production
- `frontend/next.config.js` - Configuration Next.js (mise à jour pour la production)

### NestJS Admin
- `nestjs-admin/ecosystem.config.js` - Configuration PM2 pour la production
- `nestjs-admin/env.production.template` - Template pour les variables d'environnement NestJS

### Scripts
- `deploy.sh` - Script automatisé de déploiement Laravel/Next.js
- `deploy-nestjs.sh` - Script automatisé de déploiement NestJS (sur le serveur)
- `prepare-nestjs-deploy.sh` - Script pour préparer l'archive NestJS avant upload

## 🚀 Démarrage Rapide

1. **Lisez** `QUICK_START_DEPLOYMENT.md` pour un déploiement rapide (Laravel + Next.js)
2. **Pour NestJS**, consultez `COMMANDES_DEPLOIEMENT_NESTJS.md` pour les commandes rapides
3. **Suivez** `CHECKLIST_DEPLOIEMENT.md` pour vous assurer de ne rien oublier
4. **Consultez** `DEPLOYMENT_HOSTINGER.md` pour les détails complets (Laravel + Next.js)
5. **Consultez** `DEPLOYMENT_NESTJS.md` pour les détails complets (NestJS)

## ⚙️ Configuration Requise

### Backend
- PHP 8.2+
- Composer
- MySQL/MariaDB
- Apache avec mod_rewrite

### Frontend
- Node.js 18+
- npm ou yarn

### NestJS Admin (Optionnel)
- Node.js 18+
- npm ou yarn
- PM2 (pour gérer le processus en production)

## 📝 Variables d'Environnement

### Backend (.env)
Copiez `backend/env.production.template` vers `backend/.env` et configurez :
- `APP_URL` - URL de votre API
- `DB_*` - Informations de connexion à la base de données
- `SANCTUM_STATEFUL_DOMAINS` - Domaines autorisés pour Sanctum
- `CORS_ALLOWED_ORIGINS` - Origines autorisées pour CORS

### Frontend (.env.production)
Copiez `frontend/env.production.template` vers `frontend/.env.production` et configurez :
- `NEXT_PUBLIC_API_URL` - URL complète de votre API (avec /api)

### NestJS Admin (.env)
Copiez `nestjs-admin/env.production.template` vers `nestjs-admin/.env` et configurez :
- `JWT_SECRET` - **DOIT être identique** à celui de Laravel
- `LARAVEL_API_URL` - URL de l'API Laravel en production
- `FRONTEND_URL` - URL du frontend (pour CORS)
- `PORT` - Port sur lequel NestJS écoute (par défaut 3001)

## 🔒 Sécurité

- ⚠️ **Ne jamais** commiter les fichiers `.env` ou `.env.production`
- ⚠️ **Vérifier** que les permissions sont correctes (`chmod 755` pour storage)
- ⚠️ **Activer** HTTPS/SSL sur votre domaine
- ⚠️ **Configurer** correctement CORS et Sanctum

## 🆘 Support

En cas de problème :
1. Consultez les logs : `backend/storage/logs/laravel.log`
2. Vérifiez les permissions des dossiers
3. Vérifiez la configuration CORS et Sanctum
4. Consultez la documentation Hostinger

---

**Bon déploiement ! 🚀**

