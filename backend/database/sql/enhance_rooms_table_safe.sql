-- Script SQL pour améliorer la table rooms avec des informations détaillées
-- Version SAFE : Vérifie si les colonnes existent avant de les ajouter
-- À exécuter sur la base de données de production

-- Vérifier d'abord les colonnes existantes
SELECT 'Vérification des colonnes existantes...' AS status;

-- Ajout conditionnel des nouveaux champs
SET @dbname = DATABASE();
SET @tablename = 'rooms';

-- room_category
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'room_category') > 0,
  "SELECT 'room_category existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN room_category VARCHAR(50) NULL COMMENT 'single, double, twin, triple, pmr, suite, other' AFTER type"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- room_subcategory
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'room_subcategory') > 0,
  "SELECT 'room_subcategory existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN room_subcategory VARCHAR(50) NULL COMMENT 'standard, confort, superieure, deluxe, premium, junior, familiale'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- bedding
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'bedding') > 0,
  "SELECT 'bedding existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN bedding JSON NULL COMMENT 'Configuration des lits'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- bedding_custom
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'bedding_custom') > 0,
  "SELECT 'bedding_custom existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN bedding_custom VARCHAR(255) NULL COMMENT 'Literie personnalisée'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- surface_area
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'surface_area') > 0,
  "SELECT 'surface_area existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN surface_area DECIMAL(6,2) NULL COMMENT 'Superficie en m²'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- bathroom_features
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'bathroom_features') > 0,
  "SELECT 'bathroom_features existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN bathroom_features JSON NULL COMMENT 'shower, bathtub, jacuzzi, double_sink, pmr_adapted'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- has_guest_toilet
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'has_guest_toilet') > 0,
  "SELECT 'has_guest_toilet existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN has_guest_toilet TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Toilettes visiteurs séparées'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- has_additional_bathroom
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'has_additional_bathroom') > 0,
  "SELECT 'has_additional_bathroom existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN has_additional_bathroom TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Salle de bain supplémentaire'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- basic_amenities
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'basic_amenities') > 0,
  "SELECT 'basic_amenities existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN basic_amenities JSON NULL COMMENT 'TV, climatisation, wifi, bureau, etc.'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- view_type
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'view_type') > 0,
  "SELECT 'view_type existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN view_type VARCHAR(50) NULL COMMENT 'garden, sea, mountain, pool, city, parking'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- view_price_modifier
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'view_price_modifier') > 0,
  "SELECT 'view_price_modifier existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN view_price_modifier INT NOT NULL DEFAULT 0 COMMENT 'Modificateur de prix en %'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- outdoor_features
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'outdoor_features') > 0,
  "SELECT 'outdoor_features existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN outdoor_features JSON NULL COMMENT 'balcony, terrace'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- outdoor_area
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'outdoor_area') > 0,
  "SELECT 'outdoor_area existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN outdoor_area DECIMAL(6,2) NULL COMMENT 'Superficie extérieure en m²'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- storage_options
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'storage_options') > 0,
  "SELECT 'storage_options existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN storage_options JSON NULL COMMENT 'dressing, wardrobe'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- has_living_room
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'has_living_room') > 0,
  "SELECT 'has_living_room existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN has_living_room TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Espace salon'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- living_room_features
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'living_room_features') > 0,
  "SELECT 'living_room_features existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN living_room_features JSON NULL COMMENT 'Détails du salon'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- has_kitchen
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'has_kitchen') > 0,
  "SELECT 'has_kitchen existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN has_kitchen TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cuisine/Kitchenette'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- kitchen_type
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'kitchen_type') > 0,
  "SELECT 'kitchen_type existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN kitchen_type VARCHAR(50) NULL COMMENT 'full, kitchenette, corner'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- kitchen_equipment
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'kitchen_equipment') > 0,
  "SELECT 'kitchen_equipment existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN kitchen_equipment JSON NULL COMMENT 'Équipements de cuisine'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- has_dining_area
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'has_dining_area') > 0,
  "SELECT 'has_dining_area existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN has_dining_area TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Coin salle à manger'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- dining_capacity
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'dining_capacity') > 0,
  "SELECT 'dining_capacity existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN dining_capacity INT NULL COMMENT 'Nombre de places à table'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- additional_bedrooms
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'additional_bedrooms') > 0,
  "SELECT 'additional_bedrooms existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN additional_bedrooms INT NOT NULL DEFAULT 0 COMMENT 'Chambres supplémentaires'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- additional_bedrooms_config
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'additional_bedrooms_config') > 0,
  "SELECT 'additional_bedrooms_config existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN additional_bedrooms_config JSON NULL COMMENT 'Configuration des chambres supplémentaires'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- premium_amenities
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'premium_amenities') > 0,
  "SELECT 'premium_amenities existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN premium_amenities JSON NULL COMMENT 'Mini-bar, coffre-fort, plateau courtoisie, etc.'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- paid_options
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'paid_options') > 0,
  "SELECT 'paid_options existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN paid_options JSON NULL COMMENT 'Options avec supplément (prix, description)'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- has_private_pool
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'has_private_pool') > 0,
  "SELECT 'has_private_pool existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN has_private_pool TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- pool_heated
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'pool_heated') > 0,
  "SELECT 'pool_heated existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN pool_heated TINYINT(1) NULL DEFAULT 0"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- has_parking
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'has_parking') > 0,
  "SELECT 'has_parking existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN has_parking TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- parking_type
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'parking_type') > 0,
  "SELECT 'parking_type existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN parking_type VARCHAR(50) NULL COMMENT 'garage, private, shared'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- parking_price
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'parking_price') > 0,
  "SELECT 'parking_price existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN parking_price DECIMAL(10,2) NULL COMMENT 'Prix parking/nuit'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- is_pmr_accessible
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'is_pmr_accessible') > 0,
  "SELECT 'is_pmr_accessible existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN is_pmr_accessible TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Accessible PMR'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- pmr_features
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'pmr_features') > 0,
  "SELECT 'pmr_features existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN pmr_features JSON NULL COMMENT 'Caractéristiques PMR'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- single_occupancy_price
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'single_occupancy_price') > 0,
  "SELECT 'single_occupancy_price existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN single_occupancy_price DECIMAL(10,2) NULL COMMENT 'Tarif 1 personne'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- extra_bed_price
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'extra_bed_price') > 0,
  "SELECT 'extra_bed_price existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN extra_bed_price DECIMAL(10,2) NULL COMMENT 'Supplément lit d appoint'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- max_extra_beds
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'max_extra_beds') > 0,
  "SELECT 'max_extra_beds existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN max_extra_beds INT NOT NULL DEFAULT 0 COMMENT 'Nombre max lits d appoint'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- custom_tags
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'custom_tags') > 0,
  "SELECT 'custom_tags existe déjà' AS status",
  "ALTER TABLE rooms ADD COLUMN custom_tags JSON NULL COMMENT 'Tags personnalisés'"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- name_en (vérifier avant d'ajouter)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'name_en') > 0,
  "SELECT 'name_en existe déjà - SKIP' AS status",
  "ALTER TABLE rooms ADD COLUMN name_en VARCHAR(255) NULL AFTER name"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- description_en (vérifier avant d'ajouter - CELUI QUI POSE PROBLÈME)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'description_en') > 0,
  "SELECT 'description_en existe déjà - SKIP' AS status",
  "ALTER TABLE rooms ADD COLUMN description_en TEXT NULL AFTER description"
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Message final
SELECT '✅ Migration terminée avec succès ! Toutes les colonnes ont été ajoutées ou déjà présentes.' AS status;
SELECT CONCAT('Total de colonnes dans rooms: ', COUNT(*)) AS total_columns 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rooms';
