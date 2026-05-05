# 📋 Éléments manquants par étape - Format structuré

**Date** : 2026-01-22  
**Document de référence** : LES ETAPES D'ENREGISTREMENT DES ETABLISSEMENTS.docx

---

## Format : Étape → Élément manquant → Description fonctionnelle → Dépendances éventuelles

---

## ÉTAPE 1 : TYPE D'HÉBERGEMENT

| Étape | Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|-------|------------------|---------------------------|-------------------------|
| 1 | **Appart-hôtel** | Type d'hébergement spécifique manquant dans les options | Nécessite ajout de `apartment_hotel` dans enum `type` de la table `accommodations` |
| 1 | **Ecolodge** | Type d'hébergement spécifique manquant (actuellement "Lodge" générique) | Nécessite ajout de `ecolodge` dans enum `type` ou remplacement de `lodge` |
| 1 | **Appart-résidence** | Type d'hébergement spécifique manquant | Nécessite ajout de `apartment_residence` dans enum `type` |
| 1 | **Studio** | Type d'hébergement spécifique manquant | Nécessite ajout de `studio` dans enum `type` |
| 1 | **Logique conditionnelle** | La suite du formulaire doit dépendre du choix du type d'hébergement | Nécessite logique conditionnelle frontend/backend pour afficher/masquer des champs selon le type sélectionné |

---

## ÉTAPE 2 : LOCALISATION

| Étape | Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|-------|------------------|---------------------------|-------------------------|
| 2 | **Quartier** | Champ quartier ou zone précise dans la ville | Nécessite colonne `district` ou `neighborhood` (string) dans table `accommodations` |

---

## ÉTAPE 3 : INFORMATIONS GÉNÉRALES HÉBERGEMENT

| Étape | Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|-------|------------------|---------------------------|-------------------------|
| 3 | **Standing** | Classification par standing (luxe, standard, économique) | Nécessite colonne `standing` (enum: luxury, standard, economy) dans table `accommodations` |
| 3 | **Nombre d'étages** | Nombre d'étages de l'établissement (optionnel selon doc) | Nécessite colonne `floors_count` (integer, nullable) dans table `accommodations` |

---

## ÉTAPE 4 : SERVICES DE L'ÉTABLISSEMENT

| Étape | Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|-------|------------------|---------------------------|-------------------------|
| 4 | **Checkbox Restaurant** | Case à cocher "Restaurant oui/non" (actuellement seule la capacité est saisie) | Nécessite colonne `has_restaurant` (boolean) dans table `accommodations` |
| 4 | **Checkbox Bar** | Case à cocher "Bar oui/non" (actuellement seule la capacité est saisie) | Nécessite colonne `has_bar` (boolean) dans table `accommodations` |
| 4 | **Checkbox Piscine** | Case à cocher "Piscine oui/non" (actuellement dans amenities JSON) | Nécessite colonne `has_pool` (boolean) dans table `accommodations` |
| 4 | **Checkbox Salle de conférence** | Case à cocher "Salle de conférence oui/non" (actuellement seuls le nombre et la capacité sont saisis) | Nécessite colonne `has_conference_room` (boolean) dans table `accommodations` |
| 4 | **Capacité en mode cinéma** | Capacité spécifique de la salle de conférence en mode cinéma | Nécessite colonne `conference_cinema_capacity` (integer, nullable) dans table `accommodations` |
| 4 | **Espaces loisirs structurés** | Espaces loisirs avec options : Sport, Jeux, Cigare, Autres (champ libre) | Nécessite colonne `leisure_spaces` (JSON) dans table `accommodations` avec structure : `{sport: boolean, games: boolean, cigar: boolean, other: string}` |

---

## ÉTAPE 5 : CONFIGURATION DES CHAMBRES

| Étape | Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|-------|------------------|---------------------------|-------------------------|
| 5 | **Configuration chambres dans wizard** | Configuration détaillée des chambres pendant le wizard (actuellement créées après) | Nécessite intégration complète de la configuration chambres dans l'étape 5 du wizard, avec création des chambres pendant le processus |
| 5 | **Type Twin** | Type de chambre "Twin" manquant dans les options | Nécessite ajout de "Twin" dans `roomTypeOptions` du wizard |
| 5 | **Type Chambre communicante** | Type de chambre "Chambre communicante" manquant | Nécessite ajout de "Chambre communicante" dans `roomTypeOptions` |
| 5 | **Type Studio** | Type de chambre "Studio" manquant (différent du type d'hébergement) | Nécessite ajout de "Studio" dans `roomTypeOptions` |
| 5 | **Enfant mineur accepté** | Checkbox "Enfant mineur accepté ?" par type de chambre | Nécessite colonne `children_allowed` (boolean) dans table `rooms` |
| 5 | **Petit déjeuner inclus par type** | Petit déjeuner inclus spécifique à chaque type de chambre (actuellement au niveau établissement) | Nécessite colonne `breakfast_included` (boolean) dans table `rooms` |
| 5 | **Nombre personnes petit déj inclus** | Nombre de personnes pour petit déjeuner inclus par type | Nécessite colonne `breakfast_included_persons` (integer) dans table `rooms` |
| 5 | **Coût deuxième personne petit déj** | Coût du deuxième petit déjeuner si inclus pour 1 personne uniquement | Nécessite colonne `breakfast_second_person_price` (decimal) dans table `rooms` |
| 5 | **Dimensions lits** | Dimensions précises des lits (80x180, 90x180, 140x180, 160x200, 200x200) | Nécessite structure dans `bedding` JSON : `{type: string, dimensions: string, configuration: string}` ou colonnes dédiées |
| 5 | **Configuration lit** | Choix entre Grand lit, Lits séparés, Autre (champ libre) | Nécessite champ `bed_configuration` (enum: single_bed, double_bed, twin_beds, other) dans table `rooms`, avec `bed_configuration_other` (string, nullable) |
| 5 | **Climatisation centrale/réglable** | Distinction entre climatisation centrale et réglable | Nécessite champ `ac_type` (enum: central, adjustable) dans table `rooms` ou structure dans `basic_amenities` JSON |
| 5 | **Espace nuit** | Checkbox "Espace nuit" (toujours oui selon doc, mais doit être présent) | Nécessite colonne `has_bedroom` (boolean, défaut true) dans table `rooms` |
| 5 | **Dressing vs Penderie** | Choix entre Dressing ou Penderie (pas les deux) | Nécessite champ `storage_type` (enum: wardrobe, closet) dans table `rooms` |
| 5 | **Baignoire jacuzzi** | Distinction baignoire normale vs baignoire jacuzzi dans les options salle de bain | Nécessite structure dans `bathroom_features` JSON pour distinguer `bathtub` et `jacuzzi` ou colonnes séparées |
| 5 | **Double vasque** | Option "Double vasque" dans les équipements salle de bain | Nécessite ajout dans `bathroom_features` JSON ou colonne `has_double_sink` (boolean) |
| 5 | **Vue Parking** | Option "Parking" dans les types de vue (actuellement : Jardin, Mer, Montagne) | Nécessite ajout "Parking" dans enum `view_type` de table `rooms` |
| 5 | **Nommer les chambres** | Nommer individuellement chaque chambre (pas seulement le type) | Nécessite création de chambres individuelles avec noms uniques lors de la configuration, pas seulement types génériques |
| 5 | **Photos par type/chambre** | Photos liées exclusivement à chaque type/chambre avec nommage | Nécessite système de médias liés aux chambres individuelles créées, avec possibilité de nommer chaque image |

---

## ÉTAPE 6 : TARIFICATION

| Étape | Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|-------|------------------|---------------------------|-------------------------|
| 6 | **Petit déjeuner inclus par type** | Petit déjeuner inclus spécifique à chaque type de chambre (actuellement au niveau établissement) | Nécessite colonne `breakfast_included` (boolean) dans table `rooms` |
| 6 | **Nombre personnes petit déj inclus par type** | Nombre de personnes pour petit déjeuner inclus par type de chambre | Nécessite colonne `breakfast_included_persons` (integer) dans table `rooms` |
| 6 | **Supplément personne additionnelle petit déj** | Montant du supplément pour personne additionnelle au petit déjeuner | Nécessite colonne `breakfast_extra_person_price` (decimal) dans table `rooms` |

---

## ÉTAPE 7 : POLITIQUES

| Étape | Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|-------|------------------|---------------------------|-------------------------|
| 7 | **Politique d'annulation par type** | Choix entre Flexible, Modérée, Stricte (actuellement heures en integer) | Nécessite colonne `cancellation_policy_type` (enum: flexible, moderate, strict) dans table `accommodations` ou `rooms` |
| 7 | **Mapping heures ↔ type** | Correspondance entre type de politique et heures (ex: Flexible = 7j, Modérée = 48h, Stricte = 24h) | Nécessite logique de mapping ou remplacement de `cancellation_policy_hours` par `cancellation_policy_type` avec valeurs par défaut |

---

## ÉTAPE 8 : MÉDIAS GÉNÉRAUX

| Étape | Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|-------|------------------|---------------------------|-------------------------|
| 8 | **Catégorie médias** | Catégorisation des médias : Façade, Espaces communs, Restaurant, Piscine | Nécessite colonne `category` (enum: facade, common_areas, restaurant, pool) dans table `accommodation_images` |
| 8 | **Nommer les images** | Nom/titre pour chaque image uploadée | Nécessite colonne `title` ou `name` (string, nullable) dans table `accommodation_images` |
| 8 | **Condition Restaurant/Piscine** | Afficher catégorie Restaurant/Piscine seulement si ces services existent | Nécessite logique conditionnelle frontend basée sur `has_restaurant` et `has_pool` pour afficher/masquer ces catégories |

---

## ÉTAPE 9 : VALIDATION

| Étape | Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|-------|------------------|---------------------------|-------------------------|
| 9 | **Récapitulatif complet** | Page de récapitulatif de toutes les informations avant soumission | Nécessite création d'une étape de récapitulatif dans le wizard avec affichage de tous les champs remplis |
| 9 | **Engagement exactitude** | Checkbox d'engagement sur l'exactitude des informations avec validation obligatoire | Nécessite ajout d'une checkbox "J'engage sur l'exactitude des informations" avec validation obligatoire avant soumission |
| 9 | **Validation étape par étape** | Rendre obligatoire le remplissage d'une étape avant de passer à la suivante | Nécessite validation côté frontend (désactiver bouton "Suivant" si étape incomplète) et backend (vérification lors de la soumission) |

---

## RÉSUMÉ PAR PRIORITÉ

### 🔴 Priorité haute (bloquant pour conformité document fonctionnel)

1. **Configuration chambres dans wizard** (Étape 5) - Changement structurel majeur
2. **Validation étape par étape** (Étape 9) - Exigence explicite du document
3. **Types d'hébergement manquants** (Étape 1) - 4 types manquants
4. **Types de chambres manquants** (Étape 5) - Twin, Communicante, Studio

### 🟡 Priorité moyenne (fonctionnalités importantes)

1. **Petit déjeuner par type de chambre** (Étapes 5 et 6)
2. **Politique d'annulation par type** (Étape 7)
3. **Catégorisation médias** (Étape 8)
4. **Services avec checkboxes** (Étape 4)

### 🟢 Priorité basse (améliorations UX)

1. **Standing** (Étape 3)
2. **Quartier** (Étape 2)
3. **Nombre d'étages** (Étape 3)
4. **Détails configuration chambres** (Étape 5)

---

**Total éléments manquants identifiés : ~40 champs/fonctionnalités**
