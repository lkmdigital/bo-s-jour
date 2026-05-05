-- Exemple d'insertion d'une chambre avec le système amélioré
-- Chambre Double Supérieure Vue Mer

INSERT INTO `rooms` (
    `accommodation_id`,
    `name`,
    `name_en`,
    `type`,
    `room_category`,
    `room_subcategory`,
    `capacity`,
    `price_per_night`,
    `single_occupancy_price`,
    `surface_area`,
    `bedding`,
    `bathroom_features`,
    `basic_amenities`,
    `view_type`,
    `view_price_modifier`,
    `outdoor_features`,
    `outdoor_area`,
    `premium_amenities`,
    `paid_options`,
    `description`,
    `description_en`,
    `is_active`,
    `created_at`,
    `updated_at`
) VALUES (
    1, -- Remplacer par l'ID de votre établissement
    'Chambre Double Supérieure Vue Mer',
    'Superior Double Room Sea View',
    'double',
    'double',
    'superieure',
    2,
    75000.00,
    63750.00, -- -15% pour occupation simple
    35.50,
    '{"type": "queen_160", "count": 1}',
    '["shower", "bathtub", "double_sink"]',
    '["tv", "air_conditioning", "wifi", "desk", "minibar", "safe", "hairdryer"]',
    'sea',
    30, -- +30% pour vue mer
    '["balcony"]',
    8.50,
    '["courtesy_tray", "welcome_products"]',
    '{"parking": {"price": 5000, "type": "per_night"}, "room_service": {"price": 3000, "type": "per_service"}}',
    'Magnifique chambre double supérieure avec vue panoramique sur la mer. Équipée d\'un grand lit Queen, d\'une salle de bain avec douche et baignoire, et d\'un balcon privé de 8.5m². Tous les équipements modernes pour un séjour confortable.',
    'Beautiful superior double room with panoramic sea view. Equipped with a large Queen bed, bathroom with shower and bathtub, and a private balcony of 8.5m². All modern amenities for a comfortable stay.',
    1,
    NOW(),
    NOW()
);

-- Exemple 2: Suite Junior avec salon
INSERT INTO `rooms` (
    `accommodation_id`,
    `name`,
    `name_en`,
    `type`,
    `room_category`,
    `room_subcategory`,
    `capacity`,
    `price_per_night`,
    `surface_area`,
    `bedding`,
    `bathroom_features`,
    `basic_amenities`,
    `view_type`,
    `view_price_modifier`,
    `has_living_room`,
    `living_room_features`,
    `outdoor_features`,
    `premium_amenities`,
    `description`,
    `is_active`,
    `created_at`,
    `updated_at`
) VALUES (
    1, -- Remplacer par l'ID de votre établissement
    'Suite Junior Vue Piscine',
    'Junior Suite Pool View',
    'suite',
    'suite',
    'junior',
    2,
    120000.00,
    55.00,
    '{"type": "king_200", "count": 1}',
    '["shower", "bathtub", "jacuzzi", "double_sink"]',
    '["tv", "air_conditioning", "wifi", "desk", "minibar", "safe", "coffee_machine", "hairdryer"]',
    'pool',
    15, -- +15% pour vue piscine
    1,
    '["sofa_2", "armchair", "tv", "bar_corner"]',
    '["terrace"]',
    '["courtesy_tray", "welcome_products", "bathrobe", "slippers"]',
    'Suite spacieuse avec chambre séparée, salon élégant et terrasse privée avec vue sur la piscine. Salle de bain de luxe avec jacuzzi. Service premium inclus.',
    1,
    NOW(),
    NOW()
);

-- Exemple 3: Chambre Single Standard
INSERT INTO `rooms` (
    `accommodation_id`,
    `name`,
    `name_en`,
    `type`,
    `room_category`,
    `room_subcategory`,
    `capacity`,
    `price_per_night`,
    `surface_area`,
    `bedding`,
    `bathroom_features`,
    `basic_amenities`,
    `view_type`,
    `description`,
    `is_active`,
    `created_at`,
    `updated_at`
) VALUES (
    1, -- Remplacer par l'ID de votre établissement
    'Chambre Single Standard',
    'Standard Single Room',
    'single',
    'single',
    'standard',
    1,
    35000.00,
    18.00,
    '{"type": "single_90", "count": 1}',
    '["shower"]',
    '["tv", "air_conditioning", "wifi", "desk", "hairdryer"]',
    'garden',
    'Chambre confortable pour une personne avec lit single, salle de bain privée avec douche, et tous les équipements essentiels. Vue sur le jardin.',
    1,
    NOW(),
    NOW()
);

SELECT 'Exemples de chambres insérés avec succès' AS status;
