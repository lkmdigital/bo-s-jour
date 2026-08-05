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

## LOT 3 — Tunnel de réservation (cœur du brief) ⚙️ ✅ FAIT
**Écrans** : `app/bookings/new` (wizard 5 étapes) → `app/bookings/[id]/payment`.
- [x] Identification « Continuer sans compte » / Se connecter.
- [x] Type voyageur Particulier / Corporate (paiement différé sur facture).
- [x] Infos voyageur + résidence/nationalité (stats). WhatsApp = vérif reportée (dépend API).
- [x] Vérification finale : CGV + bandeau sécurité « remboursement 24h ».
- [x] **Paiement refondu charte (2026-08-05)** : `app/bookings/[id]/payment` — passerelle **Malia Pay** (existante) ; moyens réels **Wave / Visa-Mastercard / Orange Money / Djamo** (logos) ; modes **Intégral / 1ère nuitée garantie** ; **paiement en 1 clic** (initiate → redirection) ; encart « Réservation protégée ». Vérifié live (#13).
  - ⚠️ MTN/Moov **non proposés** : non supportés par la passerelle Malia Pay (channels OMCI/WAVECI/CARD/DJAMO). À rajouter si le prestataire les ouvre.

## LOT 4 — Confirmation & double canal ⚙️ 🟢 FAIT (front)
**Écran** : `app/bookings/success`.
- [x] **Page confirmation charte (2026-08-05)** : code résa, réassurance **e-mail de confirmation**, **« Ajouter à mon calendrier »** (Google Agenda, dates réelles), CTA reçu / réservations / accueil, activation invité.
- [~] **WhatsApp** : service prêt, **en veille** tant que le client ne fournit pas WhatsApp Business + templates.
- [x] Cas Confirmation auto vs Sur demande + remboursement auto si refus (back, Lot 3.5).

## LOT 5 — Compte post-réservation & profilage ⚙️ 🟢 Partiel
- [x] **Activation compte** : page `/auth/activate` (données préremplies) + CTA « Créer mon espace » sur la page succès. Rattachement des résas par e-mail.
- [ ] Relances création de compte (H+2 / H+24 / H+72) — envois back à planifier.
- [ ] Profilage progressif (facultatif).

## LOT 6 — Espace membre voyageur (pont vers Phase 3) 🟢 FAIT (charte)
- [x] **`app/dashboard/user` refondu charte (2026-08-05)** : titre « Mon espace », **nav membre** (Mes réservations / Messages / Explorer), cartes stats (réservations, **avoirs**, à venir, passées, total dépensé), liste réservations + paiement/reçu, pagination.
- [~] **Favoris** : pas de page dédiée (le cœur est un état local non persisté, pas de back) → non ajouté (pas de lien mort). À créer avec persistance back en Phase 3.
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
