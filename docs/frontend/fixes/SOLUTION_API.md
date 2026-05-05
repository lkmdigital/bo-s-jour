# Solution : API ne fonctionne plus

 ACCÈS DASHBOARD ADMIN ---
Email    : admin@monbeaupays.com
Mot de passe : AdminMonBeauPays2025!
## 🔍 Diagnostic
password : @Lkmdigital1
Le problème vient probablement du **2FA** que nous venons d'ajouter. Le backend retourne maintenant `requires_2fa: true` si le 2FA est activé, mais le frontend ne savait pas gérer cette réponse.

## ✅ Correction Appliquée

J'ai mis à jour le code pour gérer correctement la réponse 2FA :

1. **`lib/auth.ts`** : Détecte si le 2FA est requis et lance une erreur spéciale
2. **`app/auth/login/page.tsx`** : Affiche un message approprié si le 2FA est requis

## 🚀 Déploiement

### Sur le serveur frontend :

```bash
ssh root@72.62.31.145

cd /var/www/monbeaupays-frontend

# 1. Mettre à jour le code
git pull  # ou rsync depuis votre machine

# 2. Rebuild
rm -rf .next
npm run build

# 3. Redémarrer
pm2 restart monbeaupays-frontend

# 4. Vérifier
pm2 logs monbeaupays-frontend --lines 20
```

## ⚠️ Si le problème persiste

### Option 1 : Désactiver temporairement le 2FA pour un utilisateur

Sur le serveur backend :
```sql
UPDATE users SET two_factor_enabled = 0 WHERE email = 'votre@email.com';
```

### Option 2 : Désactiver la vérification 2FA dans le login (temporaire)

Dans `AuthController.php`, commentez la vérification 2FA :
```php
// Vérifier si le 2FA est activé
// if ($user->two_factor_enabled) {
//     ...
// }
```

Puis vider le cache :
```bash
php artisan config:clear
php artisan cache:clear
```

## 📋 Vérification

1. Ouvrez `https://bosejour.ci`
2. Essayez de vous connecter
3. Si le 2FA est activé, vous verrez un message explicatif
4. Si le 2FA n'est pas activé, la connexion devrait fonctionner normalement

## 🔍 Test

Pour tester sans 2FA :
1. Connectez-vous avec un compte qui n'a pas le 2FA activé
2. La connexion devrait fonctionner normalement

Pour tester avec 2FA :
1. Le message d'erreur devrait maintenant être clair
2. Le frontend ne plantera plus



