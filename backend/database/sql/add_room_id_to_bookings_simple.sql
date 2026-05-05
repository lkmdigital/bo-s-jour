-- ======================================================================
-- Ajouter room_id à la table bookings (VERSION SIMPLE - HÉBERGEMENT MUTUALISÉ)
-- Date: 2026-01-21
-- ======================================================================

-- IMPORTANT: Exécutez ces commandes UNE PAR UNE dans phpMyAdmin
-- Si vous voyez une erreur "Duplicate column name" ou "Duplicate key name", 
-- c'est que la colonne/index existe déjà. C'EST NORMAL, ignorez l'erreur.

-- ======================================================================
-- COMMANDE 1: Ajouter la colonne room_id
-- ======================================================================
ALTER TABLE `bookings`
ADD COLUMN `room_id` BIGINT UNSIGNED NULL AFTER `accommodation_id`;

-- Si erreur: #1060 - Duplicate column name 'room_id'
-- → C'est que la colonne existe déjà, PASSEZ À LA COMMANDE SUIVANTE


-- ======================================================================
-- COMMANDE 2: Ajouter l'index
-- ======================================================================
ALTER TABLE `bookings`
ADD INDEX `bookings_room_id_index` (`room_id`);

-- Si erreur: #1061 - Duplicate key name 'bookings_room_id_index'
-- → C'est que l'index existe déjà, PASSEZ À LA COMMANDE SUIVANTE


-- ======================================================================
-- COMMANDE 3: Ajouter la contrainte de clé étrangère
-- ======================================================================
ALTER TABLE `bookings`
ADD CONSTRAINT `bookings_room_id_foreign` 
FOREIGN KEY (`room_id`) 
REFERENCES `rooms` (`id`) 
ON DELETE SET NULL;

-- Si erreur: #1826 - Duplicate foreign key constraint name
-- → C'est que la contrainte existe déjà, VOUS AVEZ TERMINÉ !


-- ======================================================================
-- VÉRIFICATION (optionnel)
-- ======================================================================
-- Pour vérifier que tout est OK, exécutez cette commande :
DESCRIBE bookings;

-- Vous devriez voir une ligne avec :
-- room_id | bigint unsigned | YES | MUL | NULL |


-- ======================================================================
-- Note: ON DELETE SET NULL permet de conserver la réservation 
-- même si la chambre est supprimée.
-- L'accommodation_id reste toujours présent pour la traçabilité.
-- ======================================================================
