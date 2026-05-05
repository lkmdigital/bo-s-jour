-- Ajouter le champ quantity (nombre total de chambres de ce type) à la table rooms
-- Date: 2026-01-22

-- IMPORTANT: Exécutez cette commande UNE PAR UNE dans phpMyAdmin
-- Si vous voyez une erreur "Duplicate column name", c'est que la colonne existe déjà. C'EST NORMAL, ignorez l'erreur.

-- ======================================================================
-- COMMANDE 1: Ajouter la colonne quantity
-- ======================================================================
ALTER TABLE `rooms`
ADD COLUMN `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Nombre total de chambres de ce type' AFTER `is_active`;

-- Si erreur: #1060 - Duplicate column name 'quantity'
-- → C'est que la colonne existe déjà, PASSEZ À LA COMMANDE SUIVANTE


-- ======================================================================
-- COMMANDE 2: Mettre à jour les chambres existantes
-- ======================================================================
-- Par défaut, toutes les chambres existantes ont quantity = 1 (chambre unique)
UPDATE `rooms` SET `quantity` = 1 WHERE `quantity` = 0 OR `quantity` IS NULL;


-- ======================================================================
-- VÉRIFICATION (optionnel)
-- ======================================================================
-- Pour vérifier que tout est OK, exécutez cette commande :
DESCRIBE rooms;

-- Vous devriez voir une ligne avec :
-- quantity | int unsigned | NO | | 1 |


-- ======================================================================
-- Note: 
-- - quantity = 1 : Chambre unique (une réservation la rend indisponible)
-- - quantity > 1 : Plusieurs chambres de ce type (la réservation décrémente le compteur)
-- ======================================================================
