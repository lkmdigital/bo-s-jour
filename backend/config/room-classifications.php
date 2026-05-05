<?php

return [
    'categories' => [
        'single' => [
            'label' => 'Chambre Single',
            'capacity' => 1,
            'subcategories' => ['standard'],
        ],
        'double' => [
            'label' => 'Chambre Double',
            'capacity' => 2,
            'subcategories' => ['standard', 'confort', 'superieure', 'deluxe', 'premium'],
        ],
        'twin' => [
            'label' => 'Chambre Twin',
            'capacity' => 2,
            'subcategories' => ['standard'],
        ],
        'triple' => [
            'label' => 'Chambre Triple',
            'capacity' => 3,
            'subcategories' => ['standard'],
        ],
        'pmr' => [
            'label' => 'Chambre Accessible PMR',
            'capacity' => 2,
            'subcategories' => ['standard'],
        ],
        'suite' => [
            'label' => 'Suite',
            'capacity' => 2,
            'subcategories' => ['junior', 'superieure', 'familiale', 'executive'],
        ],
        'other' => [
            'label' => 'Autre',
            'capacity' => null,
            'subcategories' => ['studio', 'appartement', 'bungalow', 'villa'],
        ],
    ],

    'bedding_types' => [
        'single_80' => ['label' => 'Lit Single 80×180 cm', 'width' => 80, 'length' => 180],
        'single_90' => ['label' => 'Lit Single 90×180 cm', 'width' => 90, 'length' => 180],
        'double_140' => ['label' => 'Lit Double 140×180 cm', 'width' => 140, 'length' => 180],
        'queen_160' => ['label' => 'Lit Queen 160×200 cm', 'width' => 160, 'length' => 200],
        'king_200' => ['label' => 'Lit King 200×200 cm', 'width' => 200, 'length' => 200],
        'twin' => ['label' => '2 Lits Single séparés', 'count' => 2],
        'custom' => ['label' => 'Autre (à préciser)', 'custom' => true],
    ],

    'bathroom_features' => [
        'shower' => 'Douche',
        'bathtub' => 'Baignoire',
        'jacuzzi' => 'Jacuzzi',
        'italian_shower' => 'Douche à l\'italienne',
        'double_sink' => 'Double vasque',
        'support_bars' => 'Barres de soutien (PMR)',
        'adapted_toilet' => 'WC adapté (PMR)',
        'island_bathtub' => 'Baignoire îlot',
        'hammam_shower' => 'Douche hammam',
    ],

    'basic_amenities' => [
        'tv' => ['label' => 'Télévision', 'icon' => 'tv'],
        'air_conditioning' => ['label' => 'Climatisation', 'icon' => 'wind'],
        'wifi' => ['label' => 'Wi-Fi', 'icon' => 'wifi'],
        'desk' => ['label' => 'Bureau', 'icon' => 'briefcase'],
        'chair' => ['label' => 'Chaise', 'icon' => 'armchair'],
        'hairdryer' => ['label' => 'Sèche-cheveux', 'icon' => 'wind'],
        'minibar' => ['label' => 'Mini-bar', 'icon' => 'wine'],
        'courtesy_tray' => ['label' => 'Plateau de courtoisie', 'icon' => 'coffee'],
        'safe' => ['label' => 'Coffre-fort', 'icon' => 'lock'],
        'iron' => ['label' => 'Fer à repasser', 'icon' => 'sparkles'],
        'welcome_products' => ['label' => 'Produits d\'accueil', 'icon' => 'gift'],
        'coffee_machine' => ['label' => 'Machine à café', 'icon' => 'coffee'],
        'bathrobe' => ['label' => 'Peignoir', 'icon' => 'shirt'],
        'slippers' => ['label' => 'Chaussons', 'icon' => 'footprints'],
    ],

    'view_types' => [
        'city' => ['label' => 'Vue Ville', 'modifier' => 0],
        'garden' => ['label' => 'Vue Jardin', 'modifier' => 10],
        'pool' => ['label' => 'Vue Piscine', 'modifier' => 15],
        'sea' => ['label' => 'Vue Mer', 'modifier' => 30],
        'mountain' => ['label' => 'Vue Montagne', 'modifier' => 20],
        'parking' => ['label' => 'Vue Parking/Cour', 'modifier' => -5],
    ],

    'outdoor_features' => [
        'balcony' => 'Balcon',
        'terrace' => 'Terrasse',
        'garden' => 'Jardin privatif',
    ],

    'storage_options' => [
        'dressing' => 'Dressing',
        'wardrobe' => 'Penderie',
    ],

    'living_room_features' => [
        'sofa_2' => 'Canapé 2 places',
        'sofa_3' => 'Canapé 3 places',
        'sofa_convertible' => 'Canapé convertible',
        'armchair' => 'Fauteuil',
        'tv' => 'TV',
        'bar_corner' => 'Coin bar / Mini-bar',
    ],

    'kitchen_types' => [
        'full' => 'Cuisine complète',
        'kitchenette' => 'Kitchenette',
        'corner' => 'Coin cuisine',
    ],

    'kitchen_equipment' => [
        'fridge' => 'Réfrigérateur',
        'stove' => 'Plaques / Cuisinière',
        'microwave' => 'Micro-ondes',
        'dishes' => 'Vaisselle',
        'dishwasher' => 'Lave-vaisselle',
        'washing_machine' => 'Lave-linge',
        'oven' => 'Four',
        'coffee_maker' => 'Cafetière',
    ],

    'parking_types' => [
        'garage' => 'Garage privé',
        'private' => 'Parking privé attenant',
        'shared' => 'Parking partagé',
    ],

    'paid_options' => [
        'garage' => ['label' => 'Garage privé', 'type' => 'per_night'],
        'parking' => ['label' => 'Parking privé', 'type' => 'per_night'],
        'minibar_consumption' => ['label' => 'Mini-bar (consommations)', 'type' => 'variable'],
        'fruit_basket' => ['label' => 'Panier de fruits', 'type' => 'one_time'],
        'welcome_cocktail' => ['label' => 'Cocktail de bienvenue', 'type' => 'one_time'],
        'courtesy_tray' => ['label' => 'Plateau de courtoisie (thé/café)', 'type' => 'per_night'],
        'bathrobe_slippers' => ['label' => 'Peignoir et chaussons', 'type' => 'one_time'],
        'room_service' => ['label' => 'Room service', 'type' => 'per_service'],
    ],
];
