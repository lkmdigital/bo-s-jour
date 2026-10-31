# Intégration du système de paiement MaliaPay

> Migrée le 2026-09-01 vers la nouvelle API documentée **business.malia.ci**.
> Mise à jour le 2026-10-31 d'après la documentation MaliaPay du **2026-10-30**
> (notifications signées, statuts qui évoluent, MTN sans redirection, PeyaPay, erreurs).

## Configuration

### Variables d'environnement

```env
MALIA_PAY_API_URL=https://business.malia.ci/api
MALIA_PAY_API_KEY=             # X-API-Key — jamais commitée, jamais exposée côté client
MALIA_PAY_MERCHANT_ID=
MALIA_PAY_SANDBOX=false        # true en local/staging : passe par /api/v1/test (aucun appel opérateur réel)
MALIA_PAY_REQUIRE_SIGNATURE=false  # true : rejette aussi les notifications SANS signature (voir « Sécurité »)
MALIA_PAY_MTN_CHANNEL=MTNCI    # MTNCI (fonctionne en production) ou MTNCII (écrit ainsi dans la doc du 2026-10-30)
```

`MALIA_PAY_WEBHOOK_SECRET` n'existe plus : MaliaPay signe ses notifications avec la clé API, aucun
secret à part à configurer.

### Moyens de paiement

| Moyen | Canal | État |
|---|---|---|
| Wave CI | `WAVECI` | actif (redirection) |
| Orange CI | `OMCI` | actif (redirection) |
| Djamo | `DJAMO` | actif (redirection) |
| Visa / Mastercard | `CARD` | actif (redirection) |
| MTN Mobile Money | `MTNCI` / `MTNCII` | actif — **sans redirection** : le client valide sur son téléphone |
| PeyaPay | `PEYA_PAY` | **code prêt, non proposé** : paiement par code reçu par SMS ; s'active en créant la ligne `peya-pay` dans les moyens de paiement (il faut aussi un logo) |
| Moov CI | `MOOVCI` | **non activé** : « momentanément indisponible » selon MaliaPay (doc du 2026-10-30) |

L'API accepte `WAVECI, OMCI, MTNCII, MTNCI, MOOVCI, CARD, DJAMO, PEYA_PAY` (liste renvoyée par le bac à
sable). Table de correspondance : `PaymentController::channelFor()`.

## Flux de paiement

### 1. Initiation

`POST /api/bookings/{bookingRef}/payment/initiate` appelle `POST {API}/v1/payments` (ou `/v1/test` en
sandbox, ou `/v1/peyapay/init` pour PeyaPay) avec `X-API-Key` et `Accept: application/json` (sans lui, une
erreur de validation revient en redirection HTML). Le `transaction_id` est enregistré **dès la création**.
Montant minimum : 100 FCFA (refusé avant tout appel).

La réponse indique le parcours : `link` (redirection), `awaiting_phone_validation` (MTN) ou
`requires_otp` (PeyaPay). Les frais (`fees`) sont conservés dans `payment_data`.

### 2. Trois parcours

- **Wave, Orange, Djamo, carte** : redirection vers `link`.
- **MTN** : aucun lien, statut `pending`. L'écran affiche « Validez le paiement sur votre téléphone » et
  relit le statut toutes les 5 secondes (`GET /api/payments/{id}`). Un second clic ne renvoie pas de
  demande tant que la première est encore en cours chez MaliaPay (évite le double paiement).
- **PeyaPay** : un code est envoyé par SMS ; le client le saisit sur notre page →
  `POST /api/bookings/{ref}/payment/peyapay/verify` (8 essais/minute) → relecture du statut avant validation.

### 3. Notifications (webhook) — `POST /api/payments/webhook`

MaliaPay l'envoie **une seule fois**, attend **10 secondes** au plus une réponse HTTP 200 et **ne
réessaie pas**. Elle peut arriver dans le désordre, et un même paiement peut être notifié plusieurs fois
(d'abord `failed`, puis `success`). Notre traitement :

- **Signature** : `X-MaliaPay-Timestamp` + `X-MaliaPay-Signature` (`sha256=` + HMAC-SHA256 de
  `{timestamp}.{corps brut}` avec la clé API), horodatage de moins de 5 minutes. Signature fausse ou périmée
  → 401. Absente → acceptée (sauf `MALIA_PAY_REQUIRE_SIGNATURE=true`), mais le statut est toujours relu.
- **`success`** : jamais cru sur parole. Le statut est relu chez MaliaPay et la **référence** doit être la
  nôtre (`PaymentController::confirmFromMaliaStatus()`, point d'entrée unique).
- **`pending`, `processing`, `pending_otp`** : ignorés (ce n'est pas un échec).
- **`failed`, `cancelled`** : le statut est relu. Si MaliaPay dit « succès » → confirmé ; « en cours » →
  ignoré ; injoignable → enregistré seulement si la notification est signée (sinon la réconciliation tranche).
  Un échec ne défait jamais une réservation déjà soldée ou garantie par un autre paiement.
- Le traitement continue même si MaliaPay raccroche (`ignore_user_abort`), la relecture du statut est
  limitée à 6 secondes.

### 4. Filet de sécurité — les notifications peuvent manquer

Avec un envoi unique et sans nouvel essai, **la réconciliation est le seul rattrapage**. Découverte du
2026-09-01 : 30 paiements réels sur 31 étaient restés « pending » faute de webhook.

`payments:flag-stuck-pending` (toutes les 5 minutes avec `--minutes=3 --no-digest`, et chaque jour à 8 h
avec le digest e-mail aux admins — **nécessite le cron `schedule:run` sur le serveur**) :

1. relit le statut des paiements « pending » bloqués **et des paiements « échoués » des 3 derniers jours**
   (MaliaPay marque « failed » au bout de 10 minutes sans confirmation de l'opérateur, puis « success » si
   celui-ci confirme plus tard — cas fréquent de la carte) ;
2. liste pour suivi humain ceux qu'il ne peut pas vérifier (sans `transaction_id`, API indisponible) ;
3. la page de retour (`GET /api/payments/{id}`) relit aussi le statut (une fois par 3 secondes au plus).

Confirmation manuelle : `POST /api/admin/payments/{id}/confirm-manually` (admin) et la réconciliation Ops.
Toutes passent par `confirmPaymentSuccess()` : idempotent (`lockForUpdate`), mêmes effets de bord
(commission, e-mails, code de réservation).

### 5. Statuts MaliaPay

`pending` (initié) · `processing` (chez l'opérateur) · `pending_otp` (PeyaPay, code attendu) · `success` ·
`failed` · `cancelled`. Toujours tenir compte du **dernier** statut reçu.

### 6. Erreurs de la passerelle

| HTTP | Sens | Message au voyageur | Journal |
|---|---|---|---|
| 401 | clé API invalide / marchand inactif | « paiement momentanément indisponible » (503) | **critical** : plus aucun paiement ne passe |
| 422 | champ invalide (montant < 100, canal inconnu…) | message adapté | warning |
| 502 | opérateur refuse ou canal en maintenance (`reason`) | « moyen de paiement momentanément indisponible, choisissez-en un autre » | warning + `reason` |
| 500 / autre | erreur serveur | « impossible de créer le lien, réessayez » | error |

## Sécurité

- Webhook sans authentification par nature (appel serveur-à-serveur) : protégé par la signature
  ci-dessus **et** par la relecture du statut avant toute validation.
- `MALIA_PAY_API_KEY` : jamais côté client, uniquement dans `.env` (gitignored).
- Passer `MALIA_PAY_REQUIRE_SIGNATURE=true` une fois constaté (journal « Webhook malia-pay non signé »
  absent) que MaliaPay signe bien tous ses envois.

## Test

- **Sandbox** (`MALIA_PAY_SANDBOX=true`) : `/v1/test` simule un succès immédiat (`link` vide), n'envoie
  **aucune notification**, et la transaction de test n'est pas relisible (`GET` → 404). Seul le succès est
  simulable : les échecs, annulations et confirmations tardives ne le sont pas.
- **Tests automatisés** : `tests/Feature/MaliaPayIntegrationTest.php` et
  `tests/Feature/MaliaPayDocumentation20261030Test.php` (`Http::fake`, aucun appel réseau réel).
