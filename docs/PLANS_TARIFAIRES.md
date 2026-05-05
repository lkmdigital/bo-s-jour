# Plans tarifaires – Définition et affichage

## Comment l’hôte définit la tarification

L’hôte configure la tarification **par établissement**, depuis le tableau de bord :

1. **Accès** : **Dashboard hôte** → **Mes hébergements** → clic sur un établissement → **Modifier** (ou lien « Modifier l’hébergement » sur la fiche).
2. Sur la page d’édition, deux blocs concernent les tarifs :

### Bloc « Tarifs et capacité »

- **Prix par nuit (FCFA)** : tarif de base utilisé pour toutes les variantes (et pour les chambres si pas de prix par chambre).
- Capacité max, chambres, salles de bain (pour la fiche établissement).

### Bloc « Tarification automatique »

- **Case à cocher** : **« Activer la tarification automatique »**.  
  Si elle est décochée : un seul tarif (celui saisi ci‑dessus) pour toutes les réservations.
- **Quand la case est cochée**, quatre champs apparaissent (en %) :

| Champ | Rôle | Exemple |
|--------|------|--------|
| **Non remboursable (réduction %)** | Réduction appliquée quand la réservation est non remboursable (annulation 0 h). | 10 → tarif = base − 10 % |
| **Modifiable (surcoût %)** | Surcoût appliqué quand la réservation est modifiable (annulation possible). | 10 → tarif = base + 10 % |
| **Long séjour (réduction %)** | Réduction pour les séjours longs. | 15 → tarif = base − 15 % |
| **Seuil long séjour (nuits)** | À partir de combien de nuits le tarif « long séjour » s’applique. | 7 → à partir de 7 nuits |

L’hôte enregistre la fiche (bouton **Enregistrer**). Les valeurs sont envoyées au backend (`pricing_auto_enabled`, `pricing_non_refundable_discount`, etc.) et servent au calcul des plans affichés sur la fiche établissement et dans le formulaire de réservation.

**Résumé** : le tarif de base est défini dans « Tarifs et capacité » ; les variantes (non remboursable, modifiable, long séjour) sont optionnelles et réglées dans « Tarification automatique ».

---

## Où c’est défini (backend)

### 1. Niveau établissement (accommodation)

- **`room_type_pricing`** (JSON) : tableau optionnel `[{ type, price_per_night, rooms_available }]`. Utilisé pour un résumé par type de chambre (création / édition).
- **Tarification automatique** (champs en base) :
  - `pricing_auto_enabled` (bool) : active ou non les variantes à partir du tarif de base.
  - `pricing_non_refundable_discount` (%) : réduction pour tarif non remboursable (ex. -10 %).
  - `pricing_modifiable_surcharge` (%) : surcoût pour tarif modifiable (ex. +10 %).
  - `pricing_long_stay_discount` (%) : réduction long séjour (ex. -15 %).
  - `pricing_long_stay_nights` (entier) : seuil en nuits pour appliquer le long séjour (ex. 7).

Valeurs par défaut si non renseignées : `config/room-pricing.php` et variables d’environnement (`PRICING_*`).

### 2. Niveau chambre (room)

Chaque chambre a un **tarif de base** : `price_per_night`.  
Le **prix effectif** dépend des dates, de la politique d’annulation et de la config tarifaire de l’établissement.

### 3. Calcul des variantes (service)

**`App\Services\RoomPricingService`** :

- **`getEffectivePricePerNight($basePrice, $cancellationPolicyHours, $nights, $accommodation)`**  
  Retourne le prix par nuit appliqué selon :
  1. Long séjour (≥ N nuits) → base − X %  
  2. Non remboursable (annulation 0 h) → base − Y %  
  3. Modifiable (annulation > 0 h) → base + Z %

- **`getPriceVariants($basePrice, $accommodation)`**  
  Retourne toutes les déclinaisons pour l’affichage :
  - `base` : tarif de base  
  - `non_refundable` : label, prix/nuit, `adjustment_label` (ex. "-10 %")  
  - `modifiable` : idem (ex. "+10 %")  
  - `long_stay` : idem + `min_nights` (ex. "à partir de 7 nuits")

Si `pricing_auto_enabled` est faux, une seule variante "Tarif de base" est retournée.

### 4. API utilisées par le front

- **`GET /accommodations/{id}`**  
  Retourne l’établissement avec notamment :  
  `room_type_pricing`, `pricing_auto_enabled`, `pricing_*`, et les chambres avec `price_per_night`.

- **`GET /accommodations/{id}/price-preview?check_in=...&check_out=...&room_id=...`**  
  Retourne pour les dates (et optionnellement la chambre) :
  - `base_price_per_night`, `effective_price_per_night`, `nights`, `total`
  - `rate_type` : `base` | `non_refundable` | `modifiable` | `long_stay`
  - **`variants`** : objet avec `enabled` et les 4 variantes (base, non_refundable, modifiable, long_stay) avec `label`, `price_per_night`, `adjustment_label`, et pour long_stay `min_nights`.

## Affichage dans les détails de l’établissement

Sur la page **détail d’un établissement** (`/accommodations/[id]`) :

- Un appel à **price-preview** (par ex. 1 nuit, sans `room_id`) est fait au chargement.
- La section **« Plans tarifaires »** affiche :
  - Si **variants.enabled === true** : les 4 plans (base, non remboursable, modifiable, long séjour) avec libellé et prix par nuit.
  - Sinon : un seul tarif (tarif de base).

Les mêmes variantes sont utilisées dans le formulaire de réservation (prix selon dates et politique d’annulation).
