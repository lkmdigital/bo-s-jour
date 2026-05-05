# 🔐 Guide d'accès au Dashboard Admin

## 📋 Prérequis

1. **Migrations Laravel exécutées** :
```bash
cd backend
php artisan migrate
php artisan db:seed --class=RolePermissionSeeder
```

2. **Backend Laravel démarré** sur `http://localhost:8000`

3. **Frontend Next.js démarré** sur `http://localhost:3000`

## 👤 Créer un utilisateur Admin

### Option 1 : Via Tinker (Recommandé)

```bash
cd backend
php artisan tinker
```

Puis dans Tinker :

```php
// Créer un utilisateur admin
$admin = App\Models\User::create([
    'name' => 'Admin',
    'email' => 'admin@monbeaupays.com',
    'password' => bcrypt('password123'),
    'role' => 'admin',
    'status' => 'active',
]);

// Assigner le rôle admin via RBAC
$adminRole = App\Models\Role::where('name', 'admin')->first();
$admin->roles()->attach($adminRole->id);

echo "Admin créé avec succès !\n";
echo "Email: admin@monbeaupays.com\n";
echo "Password: password123\n";
```

### Option 2 : Via Seeder

Créer un fichier `backend/database/seeders/AdminUserSeeder.php` :

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@monbeaupays.com'],
            [
                'name' => 'Administrateur',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $adminRole = Role::where('name', 'admin')->first();
        if ($adminRole) {
            $admin->roles()->syncWithoutDetaching([$adminRole->id]);
        }

        $this->command->info('Admin créé : admin@monbeaupays.com / password123');
    }
}
```

Puis exécuter :
```bash
php artisan db:seed --class=AdminUserSeeder
```

### Option 3 : Via SQL direct

```sql
INSERT INTO users (name, email, password, role, status, created_at, updated_at)
VALUES (
    'Admin',
    'admin@monbeaupays.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password123
    'admin',
    'active',
    NOW(),
    NOW()
);

-- Récupérer l'ID de l'utilisateur créé
SET @admin_id = LAST_INSERT_ID();

-- Assigner le rôle admin
INSERT INTO role_user (user_id, role_id, assigned_at, created_at, updated_at)
SELECT @admin_id, id, NOW(), NOW(), NOW()
FROM roles
WHERE name = 'admin';
```

## 🚀 Accéder au Dashboard Admin

### Méthode 1 : Connexion normale

1. Allez sur `http://localhost:3000/auth/login`
2. Connectez-vous avec :
   - **Email** : `admin@monbeaupays.com`
   - **Password** : `password123`
3. Vous serez automatiquement redirigé vers `/dashboard/admin`

### Méthode 2 : Accès direct

Une fois connecté en tant qu'admin, vous pouvez accéder directement à :
- `http://localhost:3000/dashboard/admin` - Dashboard principal
- `http://localhost:3000/dashboard/admin/users` - Gestion des utilisateurs
- `http://localhost:3000/dashboard/admin/hosts` - Gestion des hôtes
- `http://localhost:3000/dashboard/admin/accommodations` - Gestion des établissements
- `http://localhost:3000/dashboard/admin/inspections` - Gestion des inspections
- `http://localhost:3000/dashboard/admin/revenue` - Revenus

## 🔒 Vérification des permissions

Pour vérifier que votre utilisateur a bien les permissions :

```bash
cd backend
php artisan tinker
```

```php
$admin = App\Models\User::where('email', 'admin@monbeaupays.com')->first();
$admin->hasRole('admin'); // doit retourner true
$admin->hasPermission('users.read'); // doit retourner true
$admin->roles; // doit afficher les rôles
```

## 🛠️ Dépannage

### Problème : Redirection vers la page d'accueil au lieu du dashboard admin

**Solution** : Vérifiez que la redirection dans `frontend/app/auth/login/page.tsx` inclut le rôle admin :

```typescript
if (currentUser?.role === 'host') {
  router.push('/dashboard/host');
} else if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
  router.push('/dashboard/admin');
} else {
  router.push('/');
}
```

### Problème : Erreur 403 Forbidden

**Solution** : Vérifiez que :
1. Les migrations sont exécutées
2. Le seeder `RolePermissionSeeder` a été exécuté
3. L'utilisateur a bien le rôle assigné dans la table `role_user`

### Problème : L'API retourne une erreur

**Solution** : Vérifiez que :
1. Le backend Laravel est démarré
2. L'URL de l'API dans `frontend/lib/api.ts` est correcte
3. Les routes admin dans `backend/routes/api.php` sont bien définies

## 📝 Notes importantes

- **Sécurité** : Changez le mot de passe par défaut en production !
- **Super Admin** : Pour créer un super_admin, utilisez `'role' => 'super_admin'` ou assignez le rôle `super_admin` via RBAC
- **Permissions** : Les permissions sont vérifiées côté backend, assurez-vous que les routes sont protégées

## ✅ Checklist

- [ ] Migrations exécutées
- [ ] Seeder RolePermissionSeeder exécuté
- [ ] Utilisateur admin créé
- [ ] Rôle admin assigné à l'utilisateur
- [ ] Backend Laravel démarré
- [ ] Frontend Next.js démarré
- [ ] Connexion réussie avec le compte admin
- [ ] Redirection vers `/dashboard/admin` fonctionne

