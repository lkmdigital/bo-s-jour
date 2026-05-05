-- Ajouter room_id à la table bookings pour lier les réservations aux chambres
-- Date: 2026-01-21

-- IMPORTANT: Si la colonne existe déjà, vous verrez une erreur "Duplicate column name"
-- C'est normal, vous pouvez ignorer cette erreur.

-- Ajouter la colonne room_id si elle n'existe pas
ALTER TABLE `bookings`
ADD COLUMN IF NOT EXISTS `room_id` BIGINT UNSIGNED NULL AFTER `accommodation_id`;

-- Ajouter l'index (si erreur "Duplicate key name", ignorer)
ALTER TABLE `bookings`
ADD INDEX IF NOT EXISTS `bookings_room_id_index` (`room_id`);

-- Ajouter la contrainte de clé étrangère
-- Note: Si vous avez une erreur ici, vérifiez que la table 'rooms' existe
ALTER TABLE `bookings`
ADD CONSTRAINT `bookings_room_id_foreign` 
  FOREIGN KEY (`room_id`) 
  REFERENCES `rooms` (`id`) 
  ON DELETE SET NULL;

-- Note: ON DELETE SET NULL permet de conserver la réservation même si la chambre est supprimée
-- L'accommodation_id reste toujours présent pour la traçabilité
