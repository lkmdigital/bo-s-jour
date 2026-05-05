# Correction des erreurs d'authentification pour le paiement

## Problème identifié

Les utilisateurs non authentifiés ne pouvaient pas initier ou traiter un paiement après avoir créé une réservation, même si la création de réservation était autorisée sans authentification.

### Erreurs rencontrées :
- `401 Unauthorized` sur `/api/bookings/{id}/payment/initiate`
- `401 Unauthorized` sur `/api/payments/{id}/process`
- `401 Unauthorized` sur `/api/payments/{id}` (consultation des détails)
- `401 Unauthorized` sur `/api/accommodations/{id}/rooms` (possible problème de cache)

## Solution appliquée

### 1. Routes de paiement rendues publiques

Les routes suivantes ont été déplacées **en dehors** du groupe `auth:sanctum` dans `routes/api.php` :

- `/api/bookings/{bookingId}/payment/initiate` - Initiation du paiement
- `/api/payments/{paymentId}/process` - Traitement du paiement
- `/api/payments/{paymentId}` - Consultation des détails du paiement

**Avant :**
```php
Route::middleware('auth:sanctum')->group(function () {
    // ...
    Route::post('/bookings/{bookingId}/payment/initiate', [PaymentController::class, 'initiate']);
    Route::post('/payments/{paymentId}/process', [PaymentController::class, 'process']);
    Route::get('/payments/{paymentId}', [PaymentController::class, 'show']);
    // ...
});
```

**Après :**
```php
// Public booking routes (le contrôleur gère les permissions)
Route::get('/bookings/{id}', [BookingController::class, 'show']);

// Payment initiation (public - permet le paiement sans authentification pour les réservations sans compte)
Route::post('/bookings/{bookingId}/payment/initiate', [PaymentController::class, 'initiate'])->middleware('throttle:5,1');

// Payment processing (public - permet le traitement du paiement sans authentification)
Route::post('/payments/{paymentId}/process', [PaymentController::class, 'process'])->middleware('throttle:5,1');

// Payment details (public - permet de consulter un paiement sans authentification)
Route::get('/payments/{paymentId}', [PaymentController::class, 'show']);
```

### 2. Sécurité maintenue dans les contrôleurs

Les contrôleurs vérifient déjà la sécurité :

**`PaymentController::initiate()`** :
- Si l'utilisateur est authentifié, il doit être le propriétaire de la réservation
- Si l'utilisateur n'est pas authentifié, l'accès est autorisé (pour les réservations sans compte)
- La réservation ne doit pas être déjà payée
- La réservation ne doit pas être annulée ou expirée

**`PaymentController::process()`** :
- Si l'utilisateur est authentifié, il doit être le propriétaire du paiement
- Si l'utilisateur n'est pas authentifié, l'accès est autorisé
- Le paiement doit être en attente

**`PaymentController::show()`** :
- Si l'utilisateur est authentifié, il doit être le propriétaire du paiement, l'hôte de l'hébergement ou un admin
- Si l'utilisateur n'est pas authentifié, l'accès est autorisé (sécurité par obscurité : seul quelqu'un avec l'ID du paiement peut y accéder)

## Déploiement

### Étapes à suivre :

1. **Uploader les fichiers modifiés :**
   - `routes/api.php`
   - `app/Http/Controllers/PaymentController.php` (méthode `show` modifiée)

2. **Vider le cache des routes sur le serveur :**
   ```bash
   cd /path/to/backend
   php artisan route:clear
   php artisan config:clear
   php artisan cache:clear
   ```

   Ou utiliser le script fourni :
   ```bash
   ./clear-route-cache.sh
   ```

3. **Vérifier que les routes sont correctement chargées :**
   ```bash
   php artisan route:list | grep payment
   ```

   Vous devriez voir la route `POST /api/bookings/{bookingId}/payment/initiate` **sans** le middleware `auth:sanctum`.

## Vérification

### Test des routes de paiement :

1. **Créer une réservation sans être authentifié :**
   ```bash
   curl -X POST https://apimonbeaupays.loyerpay.ci/api/bookings \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```

2. **Initier le paiement :**
   ```bash
   curl -X POST https://apimonbeaupays.loyerpay.ci/api/bookings/{bookingId}/payment/initiate \
     -H "Content-Type: application/json" \
     -d '{"payment_method": "wave-ci"}'
   ```
   La réponse devrait être `200 OK` avec les détails du paiement, pas `401 Unauthorized`.

3. **Traiter le paiement :**
   ```bash
   curl -X POST https://apimonbeaupays.loyerpay.ci/api/payments/{paymentId}/process \
     -H "Content-Type: application/json"
   ```
   La réponse devrait être `200 OK` avec le lien de paiement, pas `401 Unauthorized`.

4. **Consulter les détails du paiement :**
   ```bash
   curl -X GET https://apimonbeaupays.loyerpay.ci/api/payments/{paymentId}
   ```
   La réponse devrait être `200 OK` avec les détails du paiement, pas `401 Unauthorized`.

## Notes importantes

- Les routes de paiement restent protégées par le rate limiting (`throttle:5,1`)
- Les contrôleurs vérifient toujours que l'utilisateur authentifié est le propriétaire de la réservation/paiement
- Les réservations sans compte peuvent maintenant être payées sans authentification
- Si un utilisateur authentifié initie ou traite un paiement, il doit être le propriétaire de la réservation/paiement
- La sécurité est assurée par :
  - Rate limiting pour prévenir les abus
  - Vérification de propriété si l'utilisateur est authentifié
  - Sécurité par obscurité pour les utilisateurs non authentifiés (seul quelqu'un avec l'ID du paiement peut y accéder)

## Problème potentiel : Route des chambres

Si la route `/api/accommodations/{id}/rooms` retourne toujours `401`, cela peut être dû à :
1. Un cache de routes non vidé
2. Un middleware global qui bloque les requêtes
3. Une configuration serveur (nginx/apache) qui bloque les requêtes non authentifiées

**Solution :** Vider le cache des routes comme indiqué ci-dessus.
