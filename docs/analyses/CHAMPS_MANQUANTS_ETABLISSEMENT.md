# Analyse des champs manquants - Formulaire d'ajout d'établissement

## Résumé
Ce document liste tous les champs manquants dans le formulaire actuel d'ajout d'établissement par rapport aux exigences.

## Champs manquants identifiés

### a) Informations sur l'établissement
- ✅ **Nom de l'établissement** - Existe déjà
- ❌ **Année d'ouverture** - À ajouter
- ❌ **Classement (étoile si disponible)** - À ajouter
- ✅ **Nombre de chambre** - Existe déjà (bedrooms)
- ❌ **Type de chambre** - À ajouter (room_types JSON)
- ✅ **Capacité d'accueil** - Existe déjà (max_guests)
- ❌ **Salle de conférence** - À ajouter (nombre et capacité)
- ❌ **Restaurant** - À ajouter (capacité)
- ❌ **Bar** - À ajouter (capacité)

### b) Services et équipements
- ✅ **Wi-Fi** - Existe dans amenities
- ✅ **Télévision** - Existe dans amenities
- ✅ **Climatiseur** - Existe dans amenities
- ✅ **Piscine** - Existe dans amenities
- ❌ **Navette** - À ajouter (shuttle_service)
- ✅ **Parking sécurisé** - Existe (Parking dans amenities)
- ✅ **Restaurant/bar** - Existe dans amenities
- ❌ **Buanderie** - À ajouter (laundry)
- ✅ **Petit déjeuner** - Existe dans amenities
- ❌ **Tarif petit déjeuner** - À ajouter (breakfast_price)
- ✅ **Service en chambre** - Existe (Service de chambre dans amenities)
- ❌ **Réception 24H/24** - À ajouter (reception_24h)
- ❌ **Espace fumeur** - À ajouter (smoking_area)
- ❌ **Animaux acceptés** - À ajouter (pets_allowed)
- ❌ **Autres équipements** - À ajouter (other_amenities - texte libre)

### c) Tarif et politique
- ❌ **Paiement de l'acompte à la réservation** - À ajouter (deposit_required, deposit_amount)
- ❌ **Politique d'annulation (48h avant)** - À ajouter (cancellation_policy_hours)
- ❌ **Type de paiement** - À ajouter (payment_methods: Mobile Money, Carte bancaire)
- ❌ **Condition particulière** - À ajouter (special_conditions)
- ❌ **Petit déjeuner inclus** - À ajouter (breakfast_included, breakfast_included_persons)
- ❌ **Horaire Check in** - À ajouter (check_in_time)
- ❌ **Horaire Check out** - À ajouter (check_out_time)
- ❌ **Facture soldée 48H avant** - À ajouter (invoice_paid_before_hours)

### d) Documents à fournir
- ❌ **Photo du propriétaire ou du gérant** - À gérer dans le profil hôte
- ❌ **Pièce d'identité** - À gérer dans le profil hôte
- ❌ **Photos de l'établissement (minimum 6)** - Existe déjà mais pas de minimum imposé
- ❌ **Copie de la licence d'exploitation ou l'agrément** - À gérer dans le profil hôte

## Statut de l'implémentation

### ✅ Migration créée
- Tous les champs ont été ajoutés à la table `accommodations`
- Migration: `2025_11_13_164659_add_establishment_details_to_accommodations_table.php`

### ⏳ À faire
1. Mettre à jour le formulaire frontend avec toutes les sections
2. Mettre à jour le contrôleur pour accepter les nouveaux champs
3. Ajouter la validation des champs requis
4. Gérer l'upload des documents (licence, etc.) dans le profil hôte

## Notes
- Les documents (photo propriétaire, pièce d'identité, licence) sont déjà gérés dans le profil hôte
- Le système de rooms existe déjà, il faut juste ajouter le champ `room_types` pour lister les types de chambres disponibles
- La commission de 10% est déjà gérée dans le système de paiement

