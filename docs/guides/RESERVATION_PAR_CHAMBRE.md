# ✅ Système de réservation par chambre

## 🎯 Fonctionnalités ajoutées

1. **Réservations liées aux chambres** (pas seulement aux établissements)
2. **Page de détails de chambre** avec galerie complète
3. **Chambres cliquables** depuis la liste
4. **Réservation directe** depuis la page de détails

---

## 📋 Modifications apportées

### 1. Base de données - Ajouter `room_id` à la table `bookings`

**Fichier** : `backend/database/sql/add_room_id_to_bookings.sql`

```sql
ALTER TABLE `bookings`
ADD COLUMN `room_id` BIGINT UNSIGNED NULL AFTER `accommodation_id`,
ADD INDEX `bookings_room_id_index` (`room_id`),
ADD CONSTRAINT `bookings_room_id_foreign` 
  FOREIGN KEY (`room_id`) 
  REFERENCES `rooms` (`id`) 
  ON DELETE SET NULL;
```

**Important** :
- `room_id` est **nullable** pour les anciennes réservations
- `ON DELETE SET NULL` préserve la réservation même si la chambre est supprimée
- `accommodation_id` reste toujours présent pour la traçabilité

**À exécuter** :
```bash
# Via phpMyAdmin ou ligne de commande MySQL
mysql -u USERNAME -p DATABASE_NAME < add_room_id_to_bookings.sql
```

---

### 2. Backend - Routes API

**Fichier** : `backend/routes/api.php`

**Nouvelle route ajoutée** :
```php
// Route simplifiée pour accès direct aux chambres (page publique)
Route::get('/rooms/{id}', [RoomController::class, 'showPublic']);
```

**Permet** : Accès direct à `/api/rooms/27` sans connaître l'accommodation_id

---

### 3. Backend - `RoomController.php`

**Nouvelle méthode** : `showPublic()`

```php
/**
 * Afficher une chambre par son ID (route publique simplifiée)
 */
public function showPublic($id)
{
    $room = Room::with(['accommodation', 'images', 'primaryImage'])
        ->where('is_active', true) // Seulement chambres actives
        ->findOrFail($id);
    
    return response()->json($room);
}
```

**Fonctionnalités** :
- ✅ Charge la chambre avec ses images et son établissement
- ✅ Filtre les chambres actives uniquement pour le public
- ✅ Retourne 404 si la chambre n'existe pas ou est inactive

---

### 4. Frontend - Page de détails de chambre

**Fichier** : `frontend/app/rooms/[id]/page.tsx` (NOUVEAU)

**Route** : `/rooms/27`

**Fonctionnalités** :
- ✅ Galerie d'images (principale + secondaires)
- ✅ Lightbox pour voir toutes les photos
- ✅ Détails complets (capacité, surface, équipements)
- ✅ Catégorie, sous-catégorie, type de vue
- ✅ Prix par nuit
- ✅ Bouton "Réserver cette chambre"
- ✅ Lien vers l'établissement parent
- ✅ Breadcrumb de navigation

**Interface** :
```
┌────────────────────────────────────────────┐
│ ← Retour                                   │
│ Hotel Ivoire / Chambre Deluxe              │
├────────────────────────────────────────────┤
│ [Grande image]  [Img2] [Img3]             │
│                 [Img4] [Img5]             │
├────────────────────────────────────────────┤
│ Chambre Double Deluxe         75 000 FCFA │
│ 🏷️ Double • Vue mer                       │
│                               par nuit     │
│ 👥 2 pers. 🛏️ 1  🛁 1  📐 35 m²          │
│                               [Réserver]   │
│ Description...                             │
│                                            │
│ Équipements de base                        │
│ ✓ WiFi ✓ TV ✓ Climatisation              │
│                                            │
│ Équipements premium                        │
│ ⭐ Jacuzzi ⭐ Mini-bar ⭐ Balcon           │
└────────────────────────────────────────────┘
```

---

### 5. Frontend - Liste des chambres cliquable

**Fichier** : `frontend/components/accommodation/RoomsList.tsx` (MODIFIÉ)

**Changements** :
```tsx
// Fonction pour gérer les clics
const handleRoomClick = (room: Room) => {
  if (onSelectRoom) {
    onSelectRoom(room); // Callback custom
  } else {
    // Redirection par défaut vers page de détails
    window.location.href = `/rooms/${room.id}`;
  }
};

// Bouton modifié
<button className="btn-primary text-sm">
  Voir détails
</button>
```

**Comportement** :
- **Clic sur la carte** → Redirige vers `/rooms/{id}`
- **Clic sur "Voir détails"** → Redirige vers `/rooms/{id}`
- **Avec callback `onSelectRoom`** → Exécute le callback custom

---

### 6. Frontend - Page de nouvelle réservation

**Fichier** : `frontend/app/bookings/new/page.tsx` (NOUVEAU)

**Route** : `/bookings/new?accommodation=10&room=27`

**Query params** :
- `accommodation` : ID de l'établissement (requis)
- `room` : ID de la chambre (optionnel)

**Fonctionnalités** :
- ✅ Accepte les paramètres d'URL
- ✅ Charge l'établissement
- ✅ Charge la chambre si spécifiée
- ✅ Pré-sélectionne la chambre dans le formulaire
- ✅ Utilise le prix de la chambre si spécifiée

**Code clé** :
```tsx
const searchParams = useSearchParams();
const accommodationId = searchParams?.get('accommodation');
const roomId = searchParams?.get('room');

// ...

<EnhancedBookingForm
  accommodationId={accommodation.id}
  pricePerNight={room?.price_per_night || accommodation.price_per_night}
  preSelectedRoomId={room?.id}
/>
```

---

### 7. Frontend - Formulaire de réservation amélioré

**Fichier** : `frontend/components/booking/EnhancedBookingForm.tsx` (MODIFIÉ)

**Nouvelle prop** : `preSelectedRoomId?: number`

**Logique ajoutée** :
```tsx
useEffect(() => {
  // Pré-sélectionner la chambre si un ID est fourni
  if (preSelectedRoomId && rooms.length > 0) {
    const room = rooms.find(r => r.id === preSelectedRoomId);
    if (room) {
      handleRoomSelect(room);
    }
  }
}, [preSelectedRoomId, rooms]);
```

**Comportement** :
- ✅ Pré-sélectionne automatiquement la chambre depuis l'URL
- ✅ Calcule le prix en fonction de la chambre sélectionnée
- ✅ Envoie `room_id` dans les données de réservation

---

## 🔄 Flux utilisateur complet

### Scénario 1 : Réservation depuis la liste des chambres

```
1. Visiteur → Page hébergement (/accommodations/10)
2. Voit la section "Chambres disponibles"
3. Compare les chambres (prix, vue, taille)
4. Clique sur "Voir détails" sur une chambre
5. → Redirigé vers /rooms/27
6. Voit galerie complète + détails
7. Clique "Réserver cette chambre"
8. → Redirigé vers /bookings/new?accommodation=10&room=27
9. Formulaire pré-rempli avec la chambre
10. Finalise la réservation
```

### Scénario 2 : Réservation depuis l'établissement (ancien flux)

```
1. Visiteur → Page hébergement (/accommodations/10)
2. Clique "Réserver" (bouton principal)
3. → Redirigé vers /bookings/new?accommodation=10
4. Sélectionne une chambre depuis le formulaire
5. Finalise la réservation
```

### Scénario 3 : Accès direct à une chambre

```
1. Visiteur reçoit un lien : /rooms/27
2. Voit immédiatement les détails de la chambre
3. Peut réserver directement
4. Peut voir l'établissement parent
```

---

## 🧪 Tests à effectuer

### 1. Test base de données

```sql
-- Vérifier que room_id a été ajouté
DESCRIBE bookings;

-- Résultat attendu :
-- room_id | bigint unsigned | YES | MUL | NULL |
```

### 2. Test API - Route publique

```bash
# Sans authentification
curl https://apimonbeaupays.loyerpay.ci/api/rooms/27

# Résultat attendu :
{
  "id": 27,
  "name": "Chambre Deluxe",
  "accommodation_id": 10,
  "price_per_night": 75000,
  "is_active": true,
  "images": [...],
  "accommodation": {
    "id": 10,
    "name": "Hotel Ivoire",
    "city": "Abidjan"
  }
}
```

### 3. Test Frontend - Page de détails

```
1. Ouvrir : http://localhost:3000/rooms/27
2. Résultat attendu :
   ✅ Galerie d'images s'affiche
   ✅ Détails de la chambre visibles
   ✅ Bouton "Réserver cette chambre" présent
   ✅ Lien vers établissement fonctionne
```

### 4. Test réservation complète

```
1. Page hébergement → Cliquer sur une chambre
2. Page détails chambre → Cliquer "Réserver"
3. Page réservation → Vérifier que la chambre est pré-sélectionnée
4. Remplir le formulaire → Soumettre
5. Vérifier en BDD :
   SELECT id, accommodation_id, room_id FROM bookings ORDER BY id DESC LIMIT 1;
   → room_id doit être rempli
```

### 5. Test images cliquables

```
1. Page détails chambre (/rooms/27)
2. Cliquer sur une image
3. Résultat : ✅ Lightbox s'ouvre avec toutes les photos
4. Naviguer avec flèches ← →
5. Fermer avec X ou ESC
```

---

## 📊 Structure des données

### Table `bookings`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | bigint | ID unique |
| `user_id` | bigint | Utilisateur qui réserve |
| `accommodation_id` | bigint | Établissement (toujours présent) |
| `room_id` | bigint | **Chambre spécifique (nouveau)** |
| `check_in` | date | Date d'arrivée |
| `check_out` | date | Date de départ |
| `total_price` | decimal | Prix total |
| `status` | enum | pending/confirmed/cancelled |

**Logique** :
- **`accommodation_id`** : Toujours présent (traçabilité)
- **`room_id`** : Optionnel (NULL si réservation à l'ancienne)
- **Migration graduelle** : Les anciennes réservations restent valides

---

## 🎨 Exemples de code

### Backend - Créer une réservation avec chambre

```php
// BookingController.php - store()
$booking = Booking::create([
    'user_id' => $user->id,
    'accommodation_id' => $request->accommodation_id, // Toujours présent
    'room_id' => $request->room_id, // Nouveau ! (peut être NULL)
    'check_in' => $request->check_in,
    'check_out' => $request->check_out,
    'total_price' => $totalPrice,
    // ...
]);
```

### Frontend - Lien vers réservation depuis chambre

```tsx
<Link
  href={`/bookings/new?accommodation=${room.accommodation_id}&room=${room.id}`}
  className="btn-primary"
>
  Réserver cette chambre
</Link>
```

### Frontend - Redirection après clic sur chambre

```tsx
const handleRoomClick = (room: Room) => {
  // Méthode 1 : Navigation Next.js
  router.push(`/rooms/${room.id}`);
  
  // Méthode 2 : Lien direct
  window.location.href = `/rooms/${room.id}`;
};
```

---

## 📤 Fichiers à déployer

### Backend

```
✅ routes/api.php                                  (route /rooms/{id})
✅ app/Http/Controllers/RoomController.php         (méthode showPublic)
✅ database/sql/add_room_id_to_bookings.sql        (migration SQL)
```

### Frontend

```
✅ app/rooms/[id]/page.tsx                         (NOUVEAU)
✅ app/bookings/new/page.tsx                       (NOUVEAU)
✅ components/accommodation/RoomsList.tsx          (MODIFIÉ)
✅ components/booking/EnhancedBookingForm.tsx      (MODIFIÉ)
```

---

## 🚀 Déploiement

### 1. Base de données

```bash
# Via phpMyAdmin
1. Ouvrir phpMyAdmin
2. Sélectionner la base de données
3. Onglet SQL
4. Coller le contenu de add_room_id_to_bookings.sql
5. Exécuter

# Ou via ligne de commande
mysql -u u698699576_paysusr -p u698699576_paysbase < add_room_id_to_bookings.sql
```

### 2. Backend

```bash
# Via FTP
1. Upload RoomController.php → /app/Http/Controllers/
2. Upload api.php → /routes/
3. Vider le cache : accéder à clear-cache.php
```

### 3. Frontend

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend

# Build
npm run build

# Déployer
./update-frontend.sh
```

---

## ✅ Avantages du système

### Pour les visiteurs
- ✅ **Choix précis** : Sélectionner la chambre exacte souhaitée
- ✅ **Comparaison facile** : Voir toutes les chambres d'un coup d'œil
- ✅ **Photos complètes** : Galerie dédiée pour chaque chambre
- ✅ **Transparence** : Prix et caractéristiques clairs
- ✅ **Réservation directe** : Depuis la page de détails

### Pour les propriétaires
- ✅ **Valorisation** : Chaque chambre mise en avant individuellement
- ✅ **Tarification différenciée** : Prix selon la qualité de la chambre
- ✅ **Statistiques précises** : Savoir quelles chambres sont populaires
- ✅ **Gestion optimisée** : Identifier les chambres à améliorer

### Pour la plateforme
- ✅ **Compétitivité** : Au niveau des grandes plateformes (Booking, Airbnb)
- ✅ **Conversion** : Meilleure expérience = plus de réservations
- ✅ **Traçabilité** : Savoir quelle chambre a été réservée
- ✅ **Évolutivité** : Base pour fonctionnalités avancées (promotions, disponibilités)

---

## 🎯 Fonctionnalités futures (optionnel)

### 1. Calendrier de disponibilité par chambre
```tsx
<RoomCalendar roomId={27} />
```

### 2. Promotions spécifiques aux chambres
```tsx
<RoomPromotion discount={15} validUntil="2026-02-28" />
```

### 3. Avis par chambre (pas seulement établissement)
```tsx
<RoomReviews roomId={27} />
```

### 4. Galerie 360° / Visite virtuelle
```tsx
<Room360View imageUrl="/360/room27.jpg" />
```

### 5. Comparateur de chambres
```tsx
<RoomComparator rooms={[room1, room2, room3]} />
```

---

## 📝 Checklist finale

### Base de données
- [ ] Colonne `room_id` ajoutée à `bookings`
- [ ] Index créé sur `room_id`
- [ ] Contrainte foreign key ajoutée
- [ ] Test réservation avec `room_id`

### Backend
- [ ] Route `/api/rooms/{id}` accessible
- [ ] Méthode `showPublic()` retourne les données
- [ ] Images chargées correctement
- [ ] Relation avec `accommodation` fonctionne

### Frontend
- [ ] Page `/rooms/{id}` s'affiche
- [ ] Galerie d'images fonctionne
- [ ] Lightbox opérationnel
- [ ] Bouton réservation redirige correctement
- [ ] Liste des chambres cliquable
- [ ] Formulaire pré-sélectionne la chambre

### Intégration
- [ ] Flux complet testé end-to-end
- [ ] Réservation créée avec `room_id`
- [ ] Anciennes réservations toujours valides
- [ ] Responsive sur mobile/tablet/desktop

---

**Date** : 2026-01-21  
**Fonctionnalité** : ✅ Système de réservation par chambre  
**Impact** : 🎯 Améliore considérablement l'UX et la conversion  
**Statut** : 🚀 Prêt pour déploiement
