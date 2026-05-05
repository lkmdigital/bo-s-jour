# Documentation — MonBeauPays.com

Plateforme de réservation d'hébergements en Côte d'Ivoire.

## Structure

```
docs/
├── API.md                    # Référence API REST
├── PLANS_TARIFAIRES.md       # Plans et tarifs
├── NETDATA_LOGS_VPS.md       # Monitoring VPS
│
├── deployment/               # Guides de déploiement
├── setup/                    # Installation et configuration générale
├── guides/                   # Guides fonctionnels
├── analyses/                 # Analyses et roadmap
├── fixes/                    # Correctifs généraux
│
├── backend/                  # Documentation backend (Laravel)
│   ├── SECURITY.md
│   ├── setup/                # Auth, email, OAuth, 2FA
│   ├── rooms/                # Gestion des chambres
│   └── fixes/                # Correctifs backend
│
└── frontend/                 # Documentation frontend (Next.js)
    ├── setup/                # Déploiement, fonts, PWA
    └── fixes/                # Correctifs frontend
```

## Par thème

### Démarrage rapide
- [START_HERE](setup/START_HERE.md) — Point d'entrée
- [SETUP](setup/SETUP.md) — Installation locale
- [QUICK_START_DEPLOYMENT](deployment/QUICK_START_DEPLOYMENT.md) — Déploiement rapide

### API
- [API Reference](API.md)

### Déploiement
- [Checklist déploiement](deployment/CHECKLIST_DEPLOIEMENT.md)
- [Déploiement VPS](deployment/DEPLOYMENT_VPS_72.62.31.145.md)
- [Déploiement unifié](deployment/DEPLOIEMENT_UNIFIE.md)

### Backend
- [Sécurité](backend/SECURITY.md)
- [Setup 2FA](backend/setup/SETUP_2FA.md)
- [Setup Email](backend/setup/SETUP_EMAIL_SYSTEM.md)
- [OAuth](backend/setup/OAUTH_SETUP.md)
- [Gestion chambres admin](backend/rooms/GESTION_CHAMBRES_ADMIN.md)

### Frontend
- [Déploiement VPS Hostinger](frontend/setup/DEPLOYMENT_VPS_HOSTINGER.md)
- [PWA Setup](frontend/setup/PWA_SETUP.md)
- [Vues admin chambres](frontend/VUES_ADMIN_CHAMBRES.md)
