# Scripts SQL - Base de données

Ce dossier contient les scripts SQL pour créer les tables directement sur le serveur de production.

## 📁 Fichiers disponibles

### 1. `create_room_images_table.sql`

Crée la table `room_images` pour le système de gestion des images des chambres.

**Utilisation :**
```bash
mysql -u u698699576_paysuser -p u698699576_paysbase < create_room_images_table.sql
```

**Ou via phpMyAdmin :**
1. Se connecter à phpMyAdmin
2. Sélectionner la base `u698699576_paysbase`
3. Onglet "SQL"
4. Copier-coller le contenu du fichier
5. Exécuter

**Vérification :**
```sql
SHOW TABLES LIKE 'room_images';
DESCRIBE room_images;
```

## ⚠️ Important

Ces scripts SQL sont des **alternatives** aux migrations Laravel. 

**Recommandé :** Utiliser `php artisan migrate` quand possible.

**Utiliser ces scripts SQL uniquement si :**
- Vous n'avez pas accès SSH au serveur
- Les migrations Laravel échouent
- Vous préférez gérer les tables manuellement via phpMyAdmin

## 🔄 Migrations Laravel vs Scripts SQL

| Méthode | Avantages | Inconvénients |
|---------|-----------|---------------|
| `php artisan migrate` | Historique des migrations, Rollback facile, Versionné | Nécessite SSH |
| Scripts SQL | Fonctionne via phpMyAdmin, Contrôle total | Pas d'historique, Risque d'erreur manuelle |

## 📝 Ordre d'exécution

Si vous devez créer plusieurs tables, respectez cet ordre :

1. Tables principales (users, accommodations)
2. Tables dépendantes (rooms)
3. Tables de relations (room_images)

## 🛡️ Sécurité

- Toujours faire un **backup** de la base avant d'exécuter un script SQL
- Vérifier que les contraintes de clés étrangères sont respectées
- Tester d'abord sur un environnement de développement

## 📞 Support

En cas de problème :
1. Vérifier les logs Laravel : `storage/logs/laravel.log`
2. Vérifier les erreurs MySQL : `SHOW ERRORS;`
3. Consulter la documentation : `SQL_ROOM_IMAGES_README.md`
