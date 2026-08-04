# Plan d'attaque — Phase 1 : Parcours Voyageur

Objectif : refondre le parcours public (découverte → réservation → confirmation → compte) au design bo séjour + combler les manques du brief.
Principe : **on migre vers `components/ui/` au fur et à mesure**. On garde l'API Laravel ; les manques back sont signalés ⚠️.

Légende : ✏️ modifier · ➕ créer · ⚙️ dépend du backend

---

## LOT 1 — Découverte & recherche
**Écrans** : Home ✅ (fidèle au Figma), Résultats de recherche ✅ (`/accommodations`).

### Résultats — FAIT (finalisé 2026-08-04)
`app/accommodations/page.tsx` : barre de recherche complète (**destination + dates + voyageurs/chambres**, popover), **sidebar filtres**, **tri**, bascule **Liste/Carte réelle**, grille `PropertyCard`, pagination, drawer mobile.
- **Filtres 100 % serveur** (AccommodationController@index enrichi) : min/max prix indépendants, `min_rating`, `amenities` (whereJsonContains), `cancellation_policy` (→ cancellation_policy_hours 48/24/0), et **mapping `sort`** (recommended/price_asc/price_desc/rating). Vérifiés (tri prix, min_price).
- **Carte interactive** : `components/accommodations/ResultsMap.tsx` (Leaflet via CDN), pins rouges avec prix, GPS réels des établissements. Fond OSM par défaut, **Mapbox si jeton** renseigné.
- **Réglages API admin** : `SettingsController` + `app/dashboard/admin/settings` → section « Intégrations & API externes » (fournisseur carte, jeton Mapbox, clé Google Maps). Exposés dans `/settings/public` (clés navigateur). Round-trip vérifié.
- **Images réelles** : helper `resolveImageUrl` (localhost/storage → `/tunnel-storage`) ; sections éditoriales (destinations/sites/activités/vidéos) alimentées par les photos d'établissements (fallback Unsplash).

## ✅ LOT 1 TERMINÉ (Home + Résultats + filtres/carte/réglages + images réelles).


### Home — FAIT
Fichiers : `app/page.tsx`, `components/common/HeroSection.tsx` (hero centré + onglets type + carte recherche + popover chambres/invités), `components/common/Header.tsx` (header public : logo + langue + support + Connexion), `components/common/Footer.tsx` (fond noir, colonnes, badges app, paiements), `components/home/` (PropertyCard, DestinationCard, PropertyCarousel, sections.tsx : TrustSection, TrendingDestinations, SaveMore, TopSites, Activities, VideoShowcase, Testimonials).
Notes : contenu localisé Côte d'Ivoire (destinations, activités Abidjan) au lieu des placeholders internationaux du mockup. Images = Unsplash (placeholder) ; « maisons adorées » branché sur l'API réelle (fallback si vide). Recherche → redirige vers `/accommodations?…`.

- ✏️ `app/page.tsx` + `components/common/HeroSection.tsx` : hero au design charte (rouge/noir/blanc), accroche Dancing Script.
- ✏️ Barre de recherche (`SearchBar`/`AdvancedSearchBar`) : Destination · Dates · Voyageurs (adultes/enfants) · Chambres.
- ➕ Sections home : destinations Côte d'Ivoire, offres/promos, « pourquoi bo séjour » (double confirmation).
- ✏️ `app/accommodations/page.tsx` + `AccommodationCard` : cartes charte, **badges Promo/Vérifié** (`components/ui`), prix/nuit, note.
- ➕ Filtres (prix, note, services, type, politique d'annulation), tri, **vue carte** (Côte d'Ivoire), dispo temps réel.
- Livrable : recherche fluide, résultats au nouveau design.

## LOT 2 — Fiche établissement & sélection
**Écran** : `app/accommodations/[id]/page.tsx` (975 l. → à refondre).
- ✏️ Galerie (`MediaCarousel`), description, services/équipements, avis, localisation carte, horaires.
- ✏️ Bloc types d'hébergement (`RoomsList`) + prix + promo (économie affichée).
- ➕ Affichage clair : **politique d'annulation** (Flexible/Modérée/Stricte) + **mode de paiement** (Acompte ≥ 1 nuitée / Intégral).
- ➕ Encart réservation : récap temps réel (nuits, taxes, total, **montant à payer en ligne**, solde sur place) + message **« 1ère nuitée garantie »**.

## LOT 3 — Tunnel de réservation (cœur du brief) ⚙️
**Écrans** : `app/bookings/new` → identification → paiement.
- ➕ **Étape identification** : « Se connecter » OU **« Continuer sans compte »** (mis en avant). ⚙️ résa invité côté back.
- ➕ **Choix type voyageur** : Particulier / **Corporate** (champs entreprise : raison sociale, TVA, adresse, email facturation…). ⚙️ modèle Corporate.
- ➕ **Infos voyageur** : nom, prénoms, tél, email, **confirmation WhatsApp** (code) + données statistiques (pays/ville résidence, nationalité). ⚙️ vérif WhatsApp/SMS.
- ✏️ **Vérification finale** : récap complet + CGV (case) + mention 1ère nuitée + **bandeau sécurité** « remboursement auto 24h si refus ».
- ✏️ `app/bookings/[id]/payment` : moyens **Visa/Mastercard/Djamo/Wave/Orange/MTN/Moov** au design charte ; montant selon Acompte/Intégral. ⚙️ paiement différé Corporate (option).

## LOT 4 — Confirmation & double canal ⚙️
**Écran** : `app/bookings/success` + statut résa.
- ✏️ Page confirmation charte : code résa, récap, ajouter au calendrier.
- ⚙️ **Double confirmation E-mail + WhatsApp** (WhatsApp Business API — chantier back).
- ➕ Gestion des 2 cas : **Confirmation auto** vs **Sur demande** (statut « en attente » + remboursement auto si refus).

## LOT 5 — Compte post-réservation & profilage ⚙️
- ➕ Relances création de compte (H+2 / H+24 / H+72) — front = pages d'activation ; ⚙️ envois back.
- ➕ **Activation compte** : données préremplies (résa), l'utilisateur ne saisit que le mot de passe ; rattachement des résas.
- ➕ **Profilage progressif** (facultatif) : infos perso, préférences, motif voyage.

## LOT 6 — Espace membre voyageur (pont vers Phase 3)
- ✏️ `app/dashboard/user` + `app/bookings` : dashboard membre (réservations, favoris, avoirs, messagerie), au design charte.
- (Fidélité Bronze/Argent/Or/Platine, « Mon Voyage », découvrir la CI → Phase 3.)

---

## Chantiers backend nécessaires pour boucler la Phase 1
1. **Réservation invité** (sans compte) + rattachement au compte a posteriori.
2. **Profil Corporate** (entreprise, facturation, paiement différé).
3. **Vérification WhatsApp/SMS** du numéro voyageur.
4. **WhatsApp Business API** (double confirmation).
5. **Règle 1ère nuitée** (acompte ≥ 1 nuitée) + **remboursement auto 24h** si refus.

## Ordre recommandé
LOT 1 → LOT 2 → LOT 3 → LOT 4 → LOT 5 → LOT 6.
LOT 1 & 2 = surtout front (rapide, visible). LOT 3-5 = front + back (à cadrer avec l'API).
