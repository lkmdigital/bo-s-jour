-- ======================================================================
-- Ajouter room_id à la table bookings (VERSION SÉCURISÉE)
-- Date: 2026-01-21
-- ======================================================================

-- ÉTAPE 1: Créer une procédure pour vérifier et ajouter la colonne
-- Cette procédure vérifie si la colonne existe avant de l'ajouter

DELIMITER $$

DROP PROCEDURE IF EXISTS AddRoomIdToBookings$$

CREATE PROCEDURE AddRoomIdToBookings()
BEGIN
    -- Déclarer les variables
    DECLARE column_exists INT DEFAULT 0;
    DECLARE index_exists INT DEFAULT 0;
    DECLARE fk_exists INT DEFAULT 0;
    
    -- Vérifier si la colonne existe déjà
    SELECT COUNT(*) INTO column_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'room_id'
      AND TABLE_SCHEMA = DATABASE();
    
    -- Si la colonne n'existe pas, l'ajouter
    IF column_exists = 0 THEN
        ALTER TABLE `bookings`
        ADD COLUMN `room_id` BIGINT UNSIGNED NULL AFTER `accommodation_id`;
        
        SELECT 'Colonne room_id ajoutée avec succès !' AS message;
    ELSE
        SELECT 'Colonne room_id existe déjà, pas de modification.' AS message;
    END IF;
    
    -- Vérifier si l'index existe
    SELECT COUNT(*) INTO index_exists
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'bookings_room_id_index'
      AND TABLE_SCHEMA = DATABASE();
    
    -- Si l'index n'existe pas, l'ajouter
    IF index_exists = 0 THEN
        ALTER TABLE `bookings`
        ADD INDEX `bookings_room_id_index` (`room_id`);
        
        SELECT 'Index bookings_room_id_index ajouté avec succès !' AS message;
    ELSE
        SELECT 'Index bookings_room_id_index existe déjà, pas de modification.' AS message;
    END IF;
    
    -- Vérifier si la contrainte de clé étrangère existe
    SELECT COUNT(*) INTO fk_exists
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_NAME = 'bookings'
      AND CONSTRAINT_NAME = 'bookings_room_id_foreign'
      AND TABLE_SCHEMA = DATABASE();
    
    -- Si la clé étrangère n'existe pas, l'ajouter
    IF fk_exists = 0 THEN
        ALTER TABLE `bookings`
        ADD CONSTRAINT `bookings_room_id_foreign`
        FOREIGN KEY (`room_id`)
        REFERENCES `rooms` (`id`)
        ON DELETE SET NULL;
        
        SELECT 'Contrainte bookings_room_id_foreign ajoutée avec succès !' AS message;
    ELSE
        SELECT 'Contrainte bookings_room_id_foreign existe déjà, pas de modification.' AS message;
    END IF;
    
END$$

DELIMITER ;

-- ÉTAPE 2: Exécuter la procédure
CALL AddRoomIdToBookings();

-- ÉTAPE 3: Supprimer la procédure (nettoyage)
DROP PROCEDURE IF EXISTS AddRoomIdToBookings;

-- ======================================================================
-- FIN DU SCRIPT
-- ======================================================================

-- Note: ON DELETE SET NULL permet de conserver la réservation même si la chambre est supprimée
-- L'accommodation_id reste toujours présent pour la traçabilité
