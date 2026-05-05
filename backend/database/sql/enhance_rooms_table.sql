-- Script SQL pour améliorer la table rooms avec des informations détaillées
-- À exécuter sur la base de données de production

-- Ajout des nouveaux champs pour le système de chambres amélioré
ALTER TABLE `rooms`
-- Type principal et sous-type
ADD COLUMN `room_category` VARCHAR(50) NULL COMMENT 'single, double, twin, triple, pmr, suite, other' AFTER `type`,
ADD COLUMN `room_subcategory` VARCHAR(50) NULL COMMENT 'standard, confort, superieure, deluxe, premium, junior, familiale',

-- Literie
ADD COLUMN `bedding` JSON NULL COMMENT 'Configuration des lits',
ADD COLUMN `bedding_custom` VARCHAR(255) NULL COMMENT 'Literie personnalisée',

-- Dimensions
ADD COLUMN `surface_area` DECIMAL(6,2) NULL COMMENT 'Superficie en m²',

-- Salle de bain
ADD COLUMN `bathroom_features` JSON NULL COMMENT 'shower, bathtub, jacuzzi, double_sink, pmr_adapted',
ADD COLUMN `has_guest_toilet` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Toilettes visiteurs séparées',
ADD COLUMN `has_additional_bathroom` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Salle de bain supplémentaire',

-- Équipements de base
ADD COLUMN `basic_amenities` JSON NULL COMMENT 'TV, climatisation, wifi, bureau, etc.',

-- Vue
ADD COLUMN `view_type` VARCHAR(50) NULL COMMENT 'garden, sea, mountain, pool, city, parking',
ADD COLUMN `view_price_modifier` INT NOT NULL DEFAULT 0 COMMENT 'Modificateur de prix en %',

-- Extérieur
ADD COLUMN `outdoor_features` JSON NULL COMMENT 'balcony, terrace',
ADD COLUMN `outdoor_area` DECIMAL(6,2) NULL COMMENT 'Superficie extérieure en m²',

-- Rangements
ADD COLUMN `storage_options` JSON NULL COMMENT 'dressing, wardrobe',

-- Espaces supplémentaires (suites)
ADD COLUMN `has_living_room` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Espace salon',
ADD COLUMN `living_room_features` JSON NULL COMMENT 'Détails du salon',
ADD COLUMN `has_kitchen` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cuisine/Kitchenette',
ADD COLUMN `kitchen_type` VARCHAR(50) NULL COMMENT 'full, kitchenette, corner',
ADD COLUMN `kitchen_equipment` JSON NULL COMMENT 'Équipements de cuisine',
ADD COLUMN `has_dining_area` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Coin salle à manger',
ADD COLUMN `dining_capacity` INT NULL COMMENT 'Nombre de places à table',

-- Pour suites familiales
ADD COLUMN `additional_bedrooms` INT NOT NULL DEFAULT 0 COMMENT 'Chambres supplémentaires',
ADD COLUMN `additional_bedrooms_config` JSON NULL COMMENT 'Configuration des chambres supplémentaires',

-- Commodités premium
ADD COLUMN `premium_amenities` JSON NULL COMMENT 'Mini-bar, coffre-fort, plateau courtoisie, etc.',

-- Options payantes
ADD COLUMN `paid_options` JSON NULL COMMENT 'Options avec supplément (prix, description)',

-- Piscine privée (villas/suites)
ADD COLUMN `has_private_pool` TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN `pool_heated` TINYINT(1) NULL DEFAULT 0,

-- Parking/Garage
ADD COLUMN `has_parking` TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN `parking_type` VARCHAR(50) NULL COMMENT 'garage, private, shared',
ADD COLUMN `parking_price` DECIMAL(10,2) NULL COMMENT 'Prix parking/nuit',

-- Accessibilité
ADD COLUMN `is_pmr_accessible` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Accessible PMR',
ADD COLUMN `pmr_features` JSON NULL COMMENT 'Caractéristiques PMR',

-- Tarification avancée
ADD COLUMN `single_occupancy_price` DECIMAL(10,2) NULL COMMENT 'Tarif 1 personne',
ADD COLUMN `extra_bed_price` DECIMAL(10,2) NULL COMMENT 'Supplément lit d\'appoint',
ADD COLUMN `max_extra_beds` INT NOT NULL DEFAULT 0 COMMENT 'Nombre max lits d\'appoint',

-- Tags dynamiques
ADD COLUMN `custom_tags` JSON NULL COMMENT 'Tags personnalisés',

-- Langues
ADD COLUMN `name_en` VARCHAR(255) NULL AFTER `name`,
ADD COLUMN `description_en` TEXT NULL AFTER `description`;

-- Commentaire sur la table
ALTER TABLE `rooms` COMMENT = 'Table des chambres avec informations détaillées selon normes internationales';

-- Afficher le résultat
SELECT 'Migration réussie : Table rooms mise à jour avec les nouveaux champs' AS status;
