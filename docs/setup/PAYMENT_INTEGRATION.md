# Intégration du système de paiement Malia-Pay

## Configuration

### Variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Configuration Malia-Pay
MALIA_PAY_API_URL=https://malia-pay.com/api/v1/OnlinePaymentService/add_payer
MALIA_PAY_MERCHANT_ID=MI_AOXBNNUD2J
MALIA_PAY_AGGREGATED_MERCHANT_ID=am-1j54gkvb820we
```

### Méthodes de paiement supportées

Le système supporte les méthodes suivantes, mappées vers les channels Malia-Pay :

- **Wave CI** → `WAVECI`
- **Visa/Mastercard** → `CARD`
- **Orange CI** → `OMCI`
- **Djamo** → `DJAMO`

**Note** : Les valeurs de channel doivent être exactement : `OMCI`, `WAVECI`, `CARD`, `DJAMO` (en majuscules, sans tirets ni espaces).

## Flux de paiement

### 1. Initiation du paiement

L'utilisateur clique sur "Payer maintenant" depuis :
- La page de détails de réservation
- La liste des réservations
- Le dashboard utilisateur

**Endpoint** : `POST /api/bookings/{bookingId}/payment/initiate`

**Réponse** : Retourne un objet `payment` et un `link` (URL de paiement externe)

### 2. Redirection vers le paiement

L'utilisateur est redirigé vers la plateforme Malia-Pay pour effectuer le paiement.

**Endpoint** : `POST /api/payments/{paymentId}/process`

**Réponse** : Retourne le `link` de paiement à utiliser pour rediriger l'utilisateur

### 3. Webhook de confirmation

Malia-Pay envoie une notification au webhook après le paiement.

**Endpoint** : `POST /api/payments/webhook` (sans authentification)

**Données reçues** :
```json
{
  "reference": "REF123456",
  "status": "Success",
  "transactionID": "TXN789",
  "montant": 50000
}
```

**Actions effectuées** :
- Mise à jour du statut du paiement
- Mise à jour du statut de paiement de la réservation
- Calcul et enregistrement de la commission
- Logs pour le suivi

### 4. Redirection après paiement

Après le paiement, l'utilisateur est redirigé vers :
- **Succès** : `/bookings/{bookingId}?payment=success`
- **Erreur** : `/bookings/{bookingId}/payment?error=1`

## Structure des données

### Payment

```php
{
  "id": 1,
  "booking_id": 1,
  "user_id": 1,
  "amount": 50000,
  "status": "pending|completed|failed",
  "payment_method": "wave-ci|visa-mastercard|orange-ci|djamo",
  "payment_reference": "ABC123XYZ456",
  "transaction_id": "TXN789",
  "payment_data": {
    "payment_link": "https://malia-pay.com/pay/...",
    "method": "wave-ci",
    "webhook_data": {...}
  },
  "paid_at": "2025-11-11T15:30:00Z"
}
```

## Gestion des erreurs

### Erreurs possibles

1. **Erreur lors de la création du lien** : L'API Malia-Pay peut retourner une erreur
2. **Webhook invalide** : Référence manquante ou paiement non trouvé
3. **Paiement déjà traité** : Tentative de traiter un paiement déjà complété

### Logs

Tous les événements sont loggés dans `storage/logs/laravel.log` :
- Création de lien de paiement
- Réception de webhook
- Confirmation de paiement
- Échecs de paiement

## Sécurité

### Webhook

Le webhook est accessible sans authentification. Pour sécuriser :

1. Vérifier l'IP source (si possible)
2. Ajouter une signature de vérification (si supporté par Malia-Pay)
3. Valider la référence avant de traiter

### Transactions

Toutes les opérations de mise à jour sont effectuées dans des transactions DB pour garantir la cohérence.

## Test

Pour tester le système :

1. Créer une réservation
2. Cliquer sur "Payer maintenant"
3. Sélectionner une méthode de paiement
4. Cliquer sur "Payer maintenant" → Redirection vers Malia-Pay
5. Effectuer le paiement (ou simuler)
6. Vérifier le webhook reçu
7. Vérifier la mise à jour du statut

## Notes importantes

- Les liens de paiement sont stockés dans `payment_data['payment_link']`
- Si un paiement échoue, une nouvelle référence est générée
- Les commissions sont calculées automatiquement après confirmation du paiement
- Le statut de la réservation passe à `paid` après confirmation

