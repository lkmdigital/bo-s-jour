# Plan d'attaque — Lot 2 : Fiche établissement (`/accommodations/[id]`)

Objectif : refondre la fiche au design bo séjour + combler les manques du brief voyageur.
Base : `app/accommodations/[id]/page.tsx` (975 l.) — on garde la logique (fetch, price-preview, rooms, similar, actions host/admin), on refond la présentation.

Légende : ✏️ modifier · ➕ créer · ⚙️ back

## 2.1 — En-tête & galerie
- ✏️ En-tête : nom, ville, note + nb avis (badge type `PropertyCard`), badges **Vérifié / Promo**, bouton favori + partager.
- ➕ **Galerie « Airbnb »** : 1 grande photo + grille 2×2 à droite, bouton « Voir toutes les photos » → lightbox (réutiliser `ImageLightbox`). Vidéos si présentes.

## 2.2 — Contenu principal (colonne gauche)
- ✏️ Description + **services/équipements** en grille avec icônes (Wifi, Parking, Piscine, SPA…).
- ➕ **Politique d'annulation** clairement affichée (Flexible / Modérée / Stricte) — dérivée de `cancellation_policy_hours` (48/24/0).
- ➕ **Mode de paiement** : Acompte (≥ 1 nuitée) ou Paiement intégral — dérivé de `deposit_required` / `deposit_amount`.
- ✏️ Horaires (check-in / check-out).
- ➕ Bandeau confiance : « Confirmation E-mail + WhatsApp », « Paiement sécurisé, remboursement 24h si refus ».

## 2.3 — Types d'hébergement (chambres)
- ✏️ `RoomsList` / `RoomCard` au design charte : photo, capacité, équipements, prix/nuit, dispo temps réel (selon dates), bouton **Réserver**.
- Sélection des dates (`DateSelector`) qui alimente l'encart + le prix.

## 2.4 — Encart réservation (sticky, colonne droite) ⭐
- ➕ Carte sticky : sélection dates + voyageurs, récap **temps réel** (prix/nuit × nuits, taxes, total).
- ➕ **Montant à payer en ligne** (acompte = 1ère nuitée, ou total) + **solde sur place**.
- ➕ Message **« 1ère nuitée garantie »** + politique d'annulation appliquée.
- ➕ CTA **Réserver** → tunnel `bookings/new` (Lot 3). Utilise `price-preview` (déjà en place).

## 2.5 — Avis & note
- ➕ Bloc avis : note globale + répartition, liste d'avis (avatar, nom, date, commentaire), `ReportReviewButton` conservé.

## 2.6 — Localisation
- ✏️ Remplacer le lien Google Maps par une **carte interactive** (réutiliser `ResultsMap` avec 1 pin) + adresse + lien itinéraire. Respecte le réglage `maps_provider` admin.

## 2.7 — Similaires
- ✏️ « Autres établissements à {ville} » avec `PropertyCard` (design charte) au lieu de `AccommodationCard`.

## Dépendances backend (à vérifier)
- Champs déjà présents : `cancellation_policy_hours`, `deposit_required`, `deposit_amount`, `latitude/longitude`, `amenities`, `check_in/out` horaires, `price-preview`.
- ⚙️ La **règle acompte ≥ 1 nuitée** et le **libellé politique** peuvent nécessiter un ajustement d'affichage (front) ; le calcul acompte vient de `price-preview`.

## ✅ ÉTAT (2026-08-04) — Lot 2 TERMINÉ & vérifié
- 2.1 galerie Airbnb + en-tête ✅ · 2.2 services icônes + politiques + paiement + horaires + bandeau confiance ✅ · 2.3 chambres restylées (+ fallback visibilité visiteur) ✅
- 2.4 encart `BookingSidebar` sticky : récap temps réel, **1ère nuitée garantie / paiement intégral** (via price-preview `payment_options`), CTA → `/bookings/new` ✅
- 2.5 `ReviewsSection` ✅ · 2.6 carte **Leaflet interactive** (`.leaflet-container`) ✅ · 2.7 similaires `PropertyCard` ✅
- Bonus : `AccommodationTabs` (nav Aperçu/Commodités/Emplacement/Chambres/Avis).
- Restait back (Lot 3) : réservation invité, Corporate, WhatsApp, remboursement auto.

## Ordre recommandé
2.1 galerie & en-tête → 2.3 chambres → 2.4 encart réservation (cœur) → 2.2 contenu/politiques → 2.6 carte → 2.5 avis → 2.7 similaires.
Front d'abord ; les manques back (mode paiement/annulation réels) suivront comme au Lot 1.
