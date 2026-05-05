# API Documentation - MonBeauPays.com

Base URL: `http://localhost:8000/api`

## Authentification

L'API utilise Laravel Sanctum pour l'authentification. Les tokens sont envoyés dans le header `Authorization: Bearer {token}`.

---

## Endpoints publics

### Liste des hébergements

**GET** `/accommodations`

**Query Parameters:**
- `search` (string, optional) - Recherche par nom, description ou ville
- `city` (string, optional) - Filtrer par ville
- `type` (string, optional) - Filtrer par type (hotel, lodge, guesthouse, apartment)
- `min_price` (number, optional) - Prix minimum
- `max_price` (number, optional) - Prix maximum
- `featured` (boolean, optional) - Hébergements mis en avant
- `sort_by` (string, optional) - Trier par (created_at, price_per_night, rating)
- `sort_order` (string, optional) - Ordre (asc, desc)
- `per_page` (number, optional) - Nombre d'éléments par page (défaut: 12)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Hôtel Ivoire Premium",
      "slug": "hotel-ivoire-premium",
      "type": "hotel",
      "description": "...",
      "city": "Abidjan",
      "price_per_night": 45000,
      "rating": 4.5,
      "total_reviews": 10,
      "images": [...],
      "host": {...}
    }
  ],
  "current_page": 1,
  "total": 50
}
```

### Détails d'un hébergement

**GET** `/accommodations/{id}`

**Response:**
```json
{
  "id": 1,
  "name": "Hôtel Ivoire Premium",
  "type": "hotel",
  "description": "...",
  "description_en": "...",
  "address": "...",
  "city": "Abidjan",
  "latitude": 5.316667,
  "longitude": -4.033333,
  "price_per_night": 45000,
  "max_guests": 4,
  "bedrooms": 2,
  "bathrooms": 2,
  "amenities": ["wifi", "pool", "gym"],
  "rating": 4.5,
  "total_reviews": 10,
  "images": [...],
  "reviews": [...],
  "host": {...}
}
```

### Avis d'un hébergement

**GET** `/accommodations/{id}/reviews`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "rating": 5,
      "comment": "...",
      "user": {
        "name": "Pierre Yapi"
      },
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

---

## Authentification

### Inscription

**POST** `/register`

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "phone": "+225 07 12 34 56 78",
  "role": "user"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "1|..."
}
```

### Connexion

**POST** `/login`

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "1|..."
}
```

### Déconnexion

**POST** `/logout`

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Utilisateur actuel

**GET** `/me`

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "phone": "+225 07 12 34 56 78"
}
```

---

## Réservations

### Liste des réservations

**GET** `/bookings`

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `status` (string, optional) - Filtrer par statut (pending, confirmed, cancelled)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "check_in": "2024-12-01",
      "check_out": "2024-12-03",
      "guests": 2,
      "total_price": 90000,
      "status": "confirmed",
      "accommodation": {...},
      "user": {...}
    }
  ]
}
```

### Créer une réservation

**POST** `/bookings`

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "accommodation_id": 1,
  "check_in": "2024-12-01",
  "check_out": "2024-12-03",
  "guests": 2,
  "special_requests": "Demande de chambre avec vue"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "accommodation_id": 1,
  "check_in": "2024-12-01",
  "check_out": "2024-12-03",
  "guests": 2,
  "total_price": 90000,
  "status": "pending",
  "special_requests": "..."
}
```

### Détails d'une réservation

**GET** `/bookings/{id}`

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": 1,
  "check_in": "2024-12-01",
  "check_out": "2024-12-03",
  "guests": 2,
  "total_price": 90000,
  "status": "confirmed",
  "accommodation": {...},
  "user": {...}
}
```

### Mettre à jour le statut d'une réservation

**PUT** `/bookings/{id}`

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "status": "confirmed"
}
```

---

## Hébergements (Hôte)

### Créer un hébergement

**POST** `/accommodations`

**Headers:** `Authorization: Bearer {token}` (rôle: host)

**Body:**
```json
{
  "name": "Mon Hôtel",
  "type": "hotel",
  "description": "Description en français",
  "description_en": "English description",
  "address": "123 Rue Example",
  "city": "Abidjan",
  "latitude": 5.316667,
  "longitude": -4.033333,
  "price_per_night": 30000,
  "max_guests": 4,
  "bedrooms": 2,
  "bathrooms": 1,
  "amenities": ["wifi", "parking"]
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Mon Hôtel",
  "slug": "mon-hotel",
  "status": "pending",
  ...
}
```

### Mettre à jour un hébergement

**PUT** `/accommodations/{id}`

**Headers:** `Authorization: Bearer {token}` (propriétaire ou admin)

**Body:** (champs optionnels)
```json
{
  "name": "Nouveau nom",
  "price_per_night": 35000,
  "status": "published"
}
```

### Supprimer un hébergement

**DELETE** `/accommodations/{id}`

**Headers:** `Authorization: Bearer {token}` (propriétaire ou admin)

**Response:**
```json
{
  "message": "Accommodation deleted successfully"
}
```

---

## Avis

### Créer un avis

**POST** `/reviews`

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "accommodation_id": 1,
  "rating": 5,
  "comment": "Excellent séjour !",
  "comment_en": "Excellent stay!"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "accommodation_id": 1,
  "rating": 5,
  "comment": "...",
  "created_at": "2024-01-01T00:00:00.000000Z"
}
```

---

## Administration

### Dashboard admin

**GET** `/admin/dashboard`

**Headers:** `Authorization: Bearer {token}` (rôle: admin)

**Response:**
```json
{
  "total_accommodations": 50,
  "published_accommodations": 45,
  "pending_accommodations": 5,
  "total_bookings": 200,
  "confirmed_bookings": 180,
  "total_users": 150,
  "total_hosts": 30,
  "total_revenue": 5000000,
  "cities": [
    {"city": "Abidjan", "count": 25},
    {"city": "Yamoussoukro", "count": 10}
  ]
}
```

### Liste des hébergements (admin)

**GET** `/admin/accommodations`

**Headers:** `Authorization: Bearer {token}` (rôle: admin)

**Query Parameters:**
- `status` (string, optional) - Filtrer par statut

### Approuver un hébergement

**PUT** `/admin/accommodations/{id}/approve`

**Headers:** `Authorization: Bearer {token}` (rôle: admin)

### Rejeter un hébergement

**PUT** `/admin/accommodations/{id}/reject`

**Headers:** `Authorization: Bearer {token}` (rôle: admin)

### Liste des utilisateurs

**GET** `/admin/users`

**Headers:** `Authorization: Bearer {token}` (rôle: admin)

---

## Codes de statut HTTP

- `200` - Succès
- `201` - Créé avec succès
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Interdit (permissions insuffisantes)
- `404` - Non trouvé
- `422` - Erreur de validation
- `500` - Erreur serveur

---

## Gestion des erreurs

Les erreurs sont retournées au format suivant :

```json
{
  "message": "Error message",
  "errors": {
    "field": ["Error message for field"]
  }
}
```

---

## Notes

- Toutes les dates sont au format ISO 8601 (YYYY-MM-DD)
- Les prix sont en FCFA (Franc CFA)
- Les coordonnées GPS utilisent le format décimal (latitude, longitude)
- Les images peuvent être des URLs Cloudinary ou locales

