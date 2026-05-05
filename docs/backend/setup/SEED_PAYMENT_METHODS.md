# Exécution du seeder des méthodes de paiement

Pour créer les méthodes de paiement dans la base de données, exécutez :

```bash
cd backend
php artisan db:seed --class=PaymentMethodSeeder
```

Ou si vous voulez exécuter tous les seeders :

```bash
php artisan migrate:fresh --seed
```

Les méthodes de paiement suivantes seront créées :
- Wave CI
- Visa/Mastercard
- Orange CI
- Djamo

