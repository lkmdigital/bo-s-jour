# Guide d'installation SQL - Table room_images

## Fichier SQL

Le fichier `database/sql/create_room_images_table.sql` contient le script SQL complet pour créer la table `room_images`.

## Installation sur le serveur de production

### Option 1 : Via migration Laravel (recommandé)

```bash
# Se connecter au serveur
ssh user@server

# Aller dans le répertoire du backend
cd /home/u698699576/domains/loyerpay.ci/public_html/apibackend

# Exécuter la migration
php artisan migrate
```

### Option 2 : Via phpMyAdmin

1. Se connecter à phpMyAdmin
2. Sélectionner la base de données `u698699576_paysbase`
3. Aller dans l'onglet "SQL"
4. Copier-coller le contenu de `database/sql/create_room_images_table.sql`
5. Cliquer sur "Exécuter"

### Option 3 : Via ligne de commande MySQL

```bash
# Se connecter à MySQL
mysql -u u698699576_paysuser -p u698699576_paysbase

# Exécuter le script
source /chemin/vers/backend/database/sql/create_room_images_table.sql;

# Ou directement
mysql -u u698699576_paysuser -p u698699576_paysbase < database/sql/create_room_images_table.sql
```

## Vérification de l'installation

```sql
-- Vérifier que la table existe
SHOW TABLES LIKE 'room_images';

-- Voir la structure de la table
DESCRIBE room_images;

-- Vérifier les index
SHOW INDEX FROM room_images;

-- Compter les enregistrements
SELECT COUNT(*) FROM room_images;
```

## Structure de la table

```sql
CREATE TABLE `room_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `room_id` bigint(20) unsigned NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `thumbnail_path` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `caption` varchar(255) DEFAULT NULL,
  `caption_en` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `room_images_room_id_foreign` (`room_id`),
  KEY `room_images_room_id_is_primary_index` (`room_id`,`is_primary`),
  KEY `room_images_room_id_sort_order_index` (`room_id`,`sort_order`),
  CONSTRAINT `room_images_room_id_foreign` FOREIGN KEY (`room_id`) 
    REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Champs de la table

| Champ | Type | Description |
|-------|------|-------------|
| id | bigint | Identifiant unique |
| room_id | bigint | ID de la chambre (FK) |
| image_path | varchar(255) | Chemin de l'image |
| thumbnail_path | varchar(255) | Chemin de la miniature (optionnel) |
| is_primary | tinyint(1) | Image principale (0/1) |
| sort_order | int | Ordre d'affichage |
| caption | varchar(255) | Légende en français |
| caption_en | varchar(255) | Légende en anglais |
| created_at | timestamp | Date de création |
| updated_at | timestamp | Date de mise à jour |

## Index créés

1. **PRIMARY** : Sur `id`
2. **room_images_room_id_foreign** : Sur `room_id`
3. **room_images_room_id_is_primary_index** : Sur `(room_id, is_primary)`
4. **room_images_room_id_sort_order_index** : Sur `(room_id, sort_order)`

## Contraintes

- **Foreign Key** : `room_id` référence `rooms.id` avec `ON DELETE CASCADE`
  - Si une chambre est supprimée, toutes ses images sont supprimées automatiquement

## Statistiques disponibles

### Pour les propriétaires (API `/api/analytics/host`)

```json
{
  "room_stats": {
    "total_rooms": 15,
    "active_rooms": 12,
    "inactive_rooms": 3,
    "rooms_needing_images": 3,
    "avg_images_per_room": 4.2,
    "room_bookings_last_30_days": 25
  }
}
```

### Pour les admins (API `/api/analytics/admin`)

```json
{
  "stats": {
    "room_stats": {
      "total_rooms": 150,
      "active_rooms": 120,
      "inactive_rooms": 30,
      "rooms_needing_images": 28,
      "avg_images_per_room": 3.8,
      "total_room_images": 570
    }
  }
}
```

## Requêtes utiles

### Chambres sans images suffisantes

```sql
SELECT 
    r.id,
    r.name,
    COUNT(ri.id) as image_count
FROM rooms r
LEFT JOIN room_images ri ON r.id = ri.room_id
GROUP BY r.id, r.name
HAVING image_count < 3 OR image_count IS NULL;
```

### Images principales par chambre

```sql
SELECT 
    r.id,
    r.name,
    ri.image_path as primary_image
FROM rooms r
LEFT JOIN room_images ri ON r.id = ri.room_id AND ri.is_primary = 1;
```

### Statistiques par établissement

```sql
SELECT 
    a.id,
    a.name,
    COUNT(DISTINCT r.id) as total_rooms,
    SUM(CASE WHEN r.is_active = 1 THEN 1 ELSE 0 END) as active_rooms,
    COUNT(ri.id) as total_images,
    ROUND(COUNT(ri.id) / NULLIF(COUNT(DISTINCT r.id), 0), 1) as avg_images_per_room
FROM accommodations a
LEFT JOIN rooms r ON a.id = r.accommodation_id
LEFT JOIN room_images ri ON r.id = ri.room_id
GROUP BY a.id, a.name;
```

## Dépannage

### Erreur : Table already exists

```sql
-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS room_images;

-- Puis réexécuter le script de création
```

### Erreur : Cannot add foreign key constraint

```sql
-- Vérifier que la table rooms existe
SHOW TABLES LIKE 'rooms';

-- Vérifier la structure de la table rooms
DESCRIBE rooms;

-- Si nécessaire, créer d'abord la table rooms
```

### Vérifier les permissions

```sql
-- Vérifier les permissions de l'utilisateur
SHOW GRANTS FOR 'u698699576_paysuser'@'localhost';
```

## Support

Pour toute question :
- Consulter ROOM_IMAGES_GUIDE.md
- Consulter ROOM_MANAGEMENT_SUMMARY.md
- Vérifier les logs : storage/logs/laravel.log
