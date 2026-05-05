# Création de la table promotions

## Problème
La table `promotions` n'existe pas encore sur le serveur de production, ce qui cause des erreurs lors de la création de réservations.

## Solution temporaire
Le code a été modifié pour gérer gracieusement l'absence de la table `promotions`. Les réservations fonctionneront sans promotion jusqu'à ce que la table soit créée.

## Créer la table sur le serveur de production

### Option 1 : Via migration Laravel (recommandé)
```bash
# Se connecter au serveur
ssh user@server

# Aller dans le répertoire du backend
cd /home/u698699576/domains/loyerpay.ci/public_html/apibackend

# Exécuter la migration
php artisan migrate
```

### Option 2 : Via SQL direct
Si vous avez accès à phpMyAdmin ou à la ligne de commande MySQL :

1. Se connecter à la base de données `u698699576_paysbase`
2. Exécuter le script SQL suivant (disponible dans `database/migrations/create_promotions_table.sql`) :

```sql
CREATE TABLE IF NOT EXISTS `promotions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `accommodation_id` bigint(20) unsigned NOT NULL,
  `room_id` bigint(20) unsigned DEFAULT NULL,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `promotions_accommodation_id_is_active_index` (`accommodation_id`,`is_active`),
  KEY `promotions_start_date_end_date_index` (`start_date`,`end_date`),
  KEY `promotions_accommodation_id_foreign` (`accommodation_id`),
  KEY `promotions_room_id_foreign` (`room_id`),
  CONSTRAINT `promotions_accommodation_id_foreign` FOREIGN KEY (`accommodation_id`) REFERENCES `accommodations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `promotions_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Vérification
Après avoir créé la table, vérifiez qu'elle existe :

```sql
SHOW TABLES LIKE 'promotions';
DESCRIBE promotions;
```

## Notes
- La table `promotions` est optionnelle pour le fonctionnement des réservations
- Les réservations fonctionneront sans promotion si la table n'existe pas
- Une fois la table créée, les promotions pourront être utilisées normalement
