# Intégration du système de paiement MaliaPay

> Migrée le 2026-09-01 vers la nouvelle API documentée **business.malia.ci**
> (remplace l'ancienne intégration malia-pay.com, non documentée officiellement).

## Configuration

### Variables d'environnement

```env
MALIA_PAY_API_URL=https://business.malia.ci/api
MALIA_PAY_API_KEY=            # X-API-Key — jamais commitée, jamais exposée côté client
MALIA_PAY_MERCHANT_ID=
MALIA_PAY_SANDBOX=false        # true en local/staging : passe par /api/v1/test (aucun appel opérateur réel)
MALIA_PAY_WEBHOOK_SECRET=      # à renseigner en prod, sinon le webhook accepte tout appel (rétrocompat)
```

### Méthodes de paiement actives

- **Wave CI** → `WAVECI`
- **Visa/Mastercard** → `CARD`
- **Orange CI** → `OMCI`
- **Djamo** → `DJAMO`

`MTNCI` et `MOOVCI` sont confirmés par la doc officielle MaliaPay mais **volontairement
non activés** au checkout (décision du 2026-09-01) — voir le commentaire dans
`PaymentController::createPaymentLink()`. `PEYA_PAY` (paiement par code OTP SMS, flux
en 2 appels `/peyapay/init` + `/peyapay/verify`) n'est pas non plus intégré — nécessite
un écran de saisie de code dédié côté front, reporté à une session ultérieure.

## Flux de paiement

### 1. Initiation

**Endpoint** : `POST /api/bookings/{bookingId}/payment/initiate`

Appelle en interne `POST {MALIA_PAY_API_URL}/v1/payments` (ou `/v1/test` en sandbox)
avec le header `X-API-Key`. Réponse MaliaPay : `{status, transaction_id, link, montant,
channel, reference}`. Le `transaction_id` est enregistré sur le `Payment` **dès la
création** (pas seulement à la confirmation), pour permettre une vérification de statut
même si le webhook n'arrive jamais (voir §4).

### 2. Redirection

L'utilisateur est redirigé vers `link` (page de paiement de l'opérateur, hébergée par
MaliaPay). En sandbox, `link` est vide (aucun appel opérateur simulé) — normal, pas une
erreur.

### 3. Webhook de confirmation

**Endpoint** : `POST /api/payments/webhook` (sans authentification, secret partagé optionnel)

**Payload reçu** :
```json
{
  "transaction_id": "MYLB8V4HHFXDAODU4IGH1NYBY",
  "status": "success",
  "reference": "CMD-2026-001",
  "montant": 5000,
  "channel": "WAVECI"
}
```

**Statuts possibles** : `pending`, `processing` (ignorés, en attente de la suite),
`success` (confirme le paiement), `failed`/`cancelled` (marque le paiement échoué).

### 4. Filet de sécurité — le webhook n'a AUCUNE garantie de livraison

**Découverte du 2026-09-01** : avec l'ancienne intégration, le webhook a cessé de se
déclencher après le 22 mai 2026 sans que rien ne le signale — 30 paiements réels sur 31
sont restés "pending" pendant plus de 3 mois. Le webhook seul n'est jamais suffisant.

Trois mécanismes complémentaires, tous dans `App\Console\Commands\FlagStuckPendingPayments`
(planifiée quotidiennement à 8h — voir `routes/console.php` — **nécessite que le cron du
serveur exécute `php artisan schedule:run` chaque minute**, à vérifier sur le VPS) :

1. **Réconciliation automatique** : pour tout paiement "pending" resté bloqué au-delà du
   seuil (`--hours`, 6h par défaut) ET disposant d'un `transaction_id` (paiements créés
   depuis la migration du 2026-09-01), interroge `GET /v1/payments/{transaction_id}`
   (`PaymentController::checkTransactionStatus()`) et confirme/échoue automatiquement
   selon le vrai statut MaliaPay.
2. **Digest e-mail admin** : pour les paiements non vérifiables automatiquement (ancienne
   intégration sans `transaction_id`, ou API MaliaPay indisponible), envoie un e-mail
   quotidien récapitulatif aux admins (`App\Mail\StuckPaymentsDigest`) — à croiser
   manuellement avec le dashboard marchand MaliaPay.
3. **Confirmation manuelle** : `POST /api/admin/payments/{paymentId}/confirm-manually`
   (admin uniquement, `transaction_id` requis) — réutilise exactement la même logique de
   confirmation que le webhook (`PaymentController::confirmPaymentSuccess()`, idempotent,
   mêmes effets de bord : commission, e-mails, code de réservation).

### 5. Redirection après paiement

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
  "payment_reference": "ABC123XYZ456",   // notre référence interne
  "transaction_id": "MYLB8V4HHFXDAODU4IGH1NYBY", // ID MaliaPay, connu dès la création
  "payment_data": {
    "payment_link": "https://business.malia.ci/checkout/...",
    "method": "wave-ci",
    "confirmation_source": "webhook|admin_manual|reconciliation_auto",
    "webhook_data": {...}
  },
  "paid_at": "2026-09-01T15:30:00Z"
}
```

## Sécurité

- Webhook accessible sans authentification par nature (appel serveur-à-serveur MaliaPay)
  — sécurisé par `MALIA_PAY_WEBHOOK_SECRET` (secret partagé en header/query/body, ou
  signature HMAC-SHA256) si configuré ; sinon accepté avec un avertissement journalisé
  (`PaymentController::verifyWebhookSignature()`).
- `MALIA_PAY_API_KEY` : jamais côté client, uniquement dans `.env` (gitignored).
- Toutes les confirmations (webhook, manuelle, réconciliation auto) passent par la même
  transaction DB verrouillée (`lockForUpdate`), garantissant l'idempotence — un paiement
  déjà "completed" ne redéclenche jamais une seconde fois commission/e-mails.

## Test

En local, avec `MALIA_PAY_SANDBOX=true` : le flux complet (initiation → réponse
`status: success` immédiate, `link` vide) fonctionne sans jamais appeler un opérateur
réel — voir `/api/v1/test` dans la doc MaliaPay. Voir `tests/Feature/MaliaPayIntegrationTest.php`
pour les tests automatisés (Http::fake, aucun appel réseau réel).
