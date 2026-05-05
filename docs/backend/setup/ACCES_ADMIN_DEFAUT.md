# Compte administrateur par défaut

**Important :** Un compte créé via le formulaire d'inscription (Register) est toujours un **voyageur** (`user`), pas un admin. L'admin doit être créé **uniquement** avec la commande ci-dessous.

## Créer ou réinitialiser l’admin sur le serveur

En SSH sur le serveur :

```bash
ssh root@72.62.31.145
cd /chemin/vers/backend   # ex. /var/www/monbeaupays-backend ou selon votre déploiement
php artisan admin:create-default
```

Cela crée ou met à jour un utilisateur avec :

- **Email :** `admin@monbeaupays.com`
- **Mot de passe :** `AdminMonBeauPays2025!`

## Accès dashboard

1. Ouvrir la page de connexion de votre frontend (ex. `https://votresite.com/auth/login`).
2. Se connecter avec l’email et le mot de passe ci-dessus.
3. Aller sur le dashboard admin (ex. `/dashboard/admin`).

## Changer l’email ou le mot de passe

```bash
php artisan admin:create-default --email=votre@email.com --password=VotreMotDePasseSecurise
```

## Sécurité

- Changez le mot de passe après la première connexion en production.
- Ne commitez pas de fichier contenant des mots de passe réels.
