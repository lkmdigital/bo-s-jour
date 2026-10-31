<?php

namespace App\Http\Controllers;

use App\Enums\BookingStatus;
use App\Exceptions\PaymentGatewayException;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Commission;
use App\Models\Message;
use App\Models\Setting;
use App\Services\BookingService;
use App\Services\PaymentOptionsService;
use App\Mail\BookingConfirmation;
use App\Mail\HostNewBooking;
use App\Support\Security\SensitiveUserFields;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PaymentController extends Controller
{
    public function __construct(private BookingService $bookingService) {}

    /**
     * Générer une référence de commande unique
     */
    private function generateNumCommande($length = 15)
    {
        return substr(str_shuffle(str_repeat('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', $length)), 0, $length);
    }

    /**
     * Taux de commission plateforme borné entre 8 % et 10 %
     */
    private static function getCommissionRateClamped(): float
    {
        $rate = (float) Setting::get('commission_rate', 10.00);
        return max(8.0, min(10.0, $rate));
    }

    /**
     * Initier un paiement pour une réservation
     */
    public function initiate(Request $request, $bookingId)
    {
        try {
            \Log::info('Payment initiation started', [
                'booking_id' => $bookingId,
                'user_id' => $request->user()?->id,
            ]);

            // Référence = jeton (accès public) ou id numérique (connecté uniquement).
            $booking = Booking::findByRef((string) $bookingId, $request->user(), ['accommodation', 'user']);
            if (!$booking) {
                return response()->json(['message' => 'Réservation introuvable.'], 404);
            }

            \Log::info('Booking found', [
                'booking_id' => $booking->id,
                'booking_user_id' => $booking->user_id,
                'request_user_id' => $request->user()?->id,
            ]);

            // Vérifier que l'utilisateur est le propriétaire de la réservation (si authentifié)
            $user = $request->user();
            if ($user && $booking->user_id !== $user->id) {
                \Log::warning('Payment initiation: User not authorized', [
                    'booking_user_id' => $booking->user_id,
                    'request_user_id' => $user->id,
                ]);
                return response()->json(['message' => 'Forbidden'], 403);
            }
            // Si l'utilisateur n'est pas authentifié, permettre l'accès (pour les réservations sans compte)

            // Vérifier que la réservation n'est pas déjà payée
            if ($booking->isPaid()) {
                \Log::info('Payment initiation: Booking already paid', [
                    'booking_id' => $booking->id,
                    'payment_status' => $booking->payment_status,
                ]);
                return response()->json([
                    'message' => 'Cette réservation est déjà payée',
                    'booking' => $booking
                ], 400);
            }

            // Vérifier que la réservation n'est pas annulée ou expirée
            //
            // Bug corrigé le 2026-09-16 : comparait $booking->status (casté en
            // enum BookingStatus depuis les tout premiers commits) à la
            // chaîne brute 'cancelled' via === — toujours false en PHP quel
            // que soit le statut réel (même famille de bug corrigée le
            // 2026-09-15 dans updateBookingPaymentState() : `===`/`in_array()`
            // entre un attribut casté en enum et une chaîne ne matche jamais).
            // Conséquence en production : une réservation ANNULÉE pouvait
            // encore être payée si elle n'était pas expirée.
            if ($booking->status === BookingStatus::Cancelled || $booking->isExpired()) {
                \Log::info('Payment initiation: Booking unavailable', [
                    'booking_id' => $booking->id,
                    'status' => $booking->status,
                    'is_expired' => $booking->isExpired(),
                ]);
                return response()->json([
                    'message' => 'Cette réservation n\'est plus disponible'
                ], 400);
            }

            // Retour client 2026-09-16 : parcours "confirmation hôte avant
            // paiement" — le voyageur ne peut payer qu'une fois l'hôte a
            // confirmé la disponibilité (statut passé à Pending).
            if ($booking->status === BookingStatus::AwaitingHostConfirmation) {
                return response()->json([
                    'message' => "Votre demande est en attente de confirmation par le partenaire. Vous pourrez payer une fois qu'elle sera acceptée.",
                ], 400);
            }

            $paymentMethod = $request->input('payment_method', 'wave-ci');
            $paymentType = $request->input('payment_type', 'full'); // 'full' | 'guarantee'

            $remainingBalance = $booking->remainingBalance();
            if ($remainingBalance <= 0 && $booking->payment_status !== 'guarantee_paid') {
                \Log::info('Payment initiation: No balance remaining', [
                    'booking_id' => $booking->id,
                ]);
                return response()->json([
                    'message' => 'Aucun paiement supplémentaire n\'est requis pour cette réservation',
                    'booking' => $booking
                ], 400);
            }

            // Utiliser PaymentOptionsService pour les options full/guarantee
            $paymentOptions = PaymentOptionsService::getPaymentOptions($booking);

            if ($paymentOptions['full_only']) {
                $paymentType = 'full';
            }

            $amountToPay = 0;
            $paymentPurpose = 'full';

            if ($paymentType === 'full') {
                $fullOpt = $paymentOptions['options']['full'] ?? null;
                if (!$fullOpt) {
                    return response()->json(['message' => 'Option de paiement non disponible'], 400);
                }
                $amountToPay = (float) $fullOpt['amount'];
                $paymentPurpose = 'full';
            } elseif ($paymentType === 'guarantee') {
                $guaranteeOpt = $paymentOptions['options']['guarantee'] ?? $paymentOptions['guarantee'] ?? null;
                if (!$guaranteeOpt) {
                    return response()->json([
                        'message' => 'L\'option garantie n\'est pas disponible pour cette réservation (paiement intégral obligatoire)'
                    ], 400);
                }
                $amountToPay = (float) ($guaranteeOpt['amount'] ?? $guaranteeOpt);
                $paymentPurpose = 'guarantee';
                // Point laissé ouvert par boséjour (2026-10-08) : aucun plancher n'est appliqué, le
                // voyageur paie exactement la garantie annoncée. On trace le cas pour le suivre.
                if (!PaymentOptionsService::guaranteeCoversCommission($amountToPay, (float) $booking->total_price)) {
                    \Log::warning('Garantie inférieure à la commission plateforme', [
                        'booking_id' => $booking->id,
                        'guarantee' => $amountToPay,
                        'total_price' => (float) $booking->total_price,
                    ]);
                }
            } else {
                return response()->json(['message' => 'Type de paiement invalide'], 400);
            }

            if ($amountToPay <= 0) {
                return response()->json([
                    'message' => 'Montant de paiement invalide'
                ], 400);
            }

            // MaliaPay refuse (422) tout paiement de moins de 100 FCFA : on le dit clairement avant de créer quoi que ce soit.
            if ($amountToPay < self::MIN_AMOUNT) {
                return response()->json([
                    'message' => 'Le montant à régler est inférieur au minimum accepté par la passerelle de paiement (' . self::MIN_AMOUNT . ' FCFA).'
                ], 400);
            }

            // Mettre à jour le booking avec payment_type et deposit_amount
            $booking->update([
                'payment_type' => $paymentType,
                'deposit_amount' => $amountToPay,
            ]);

            \Log::info('Creating or retrieving payment', [
                'booking_id' => $booking->id,
                'user_id' => $user ? $user->id : $booking->user_id,
                'payment_method' => $paymentMethod,
                'amount' => $amountToPay,
                'purpose' => $paymentPurpose,
            ]);

            $paymentAmount = (int) round($amountToPay);
            $userId = $user ? $user->id : $booking->user_id;

            $payment = Payment::where('booking_id', $booking->id)
                ->where('user_id', $userId)
                ->where('purpose', $paymentPurpose)
                ->where('status', 'pending')
                ->first();

            if ($payment) {
                // MTN / PeyaPay : une demande encore en cours chez MaliaPay est conservée. Sans cela, chaque
                // nouveau clic enverrait une seconde notification sur le téléphone du client (et créerait une
                // seconde transaction pour la même référence), avec un risque de double paiement.
                $keepInitiation = $this->initiationStillRunning($payment, (string) $paymentMethod, $paymentAmount);

                $payment->update([
                    'amount' => $paymentAmount,
                    'payment_method' => $paymentMethod,
                    'payment_reference' => $payment->payment_reference ?? $this->generateNumCommande(),
                    'payment_data' => $keepInitiation ? $payment->payment_data : null,
                ]);
            } else {
                $payment = Payment::create([
                    'booking_id' => $booking->id,
                    'user_id' => $userId,
                    'amount' => $paymentAmount,
                    'purpose' => $paymentPurpose,
                    'status' => 'pending',
                    'payment_method' => $paymentMethod,
                    'payment_reference' => $this->generateNumCommande(),
                ]);
            }

            \Log::info('Payment created/retrieved', [
                'payment_id' => $payment->id,
                'payment_reference' => $payment->payment_reference,
                'status' => $payment->status,
                'purpose' => $payment->purpose,
                'amount' => $payment->amount,
            ]);

            // Si le paiement existe déjà et est en attente, vérifier s'il a déjà un lien
            if ($payment->isPending() && isset($payment->payment_data['payment_link'])) {
                \Log::info('Payment already has link', [
                    'payment_id' => $payment->id,
                    'payment_link' => $payment->payment_data['payment_link'],
                    'purpose' => $payment->purpose,
                ]);
                return $this->initiatedResponse(
                    $payment,
                    (string) $payment->payment_data['payment_link'],
                    (bool) ($payment->payment_data['awaiting_phone_validation'] ?? false),
                    (bool) ($payment->payment_data['requires_otp'] ?? false),
                );
            }

            // Si le paiement a échoué, créer un nouveau paiement avec une nouvelle référence
            if ($payment->isFailed()) {
                \Log::info('Payment failed, creating new reference', [
                    'payment_id' => $payment->id,
                    'old_reference' => $payment->payment_reference,
                ]);
                $payment->update([
                    'status' => 'pending',
                    'amount' => $paymentAmount,
                    'payment_method' => $paymentMethod,
                    'payment_reference' => $this->generateNumCommande(),
                    'payment_data' => null,
                ]);
            }

            // Générer le lien de paiement via l'API malia-pay.com
            \Log::info('Creating payment link via malia-pay API', [
                'payment_id' => $payment->id,
                'payment_method' => $paymentMethod,
                'amount' => $paymentAmount,
            ]);

            try {
                $created = $this->createPaymentLink($payment, $booking, $user, $paymentMethod);

                \Log::info('Payment link created successfully', [
                    'payment_id' => $payment->id,
                    'has_link' => $created['link'] !== '',
                    'awaiting_phone_validation' => $created['push'],
                    'requires_otp' => $created['otp'],
                ]);

                // Mettre à jour le paiement avec le lien (ou, pour MTN / PeyaPay, l'attente de validation)
                $payment->update([
                    'payment_data' => array_merge([
                        'payment_link' => $created['link'],
                        'method' => $paymentMethod,
                        'created_at' => now()->toIso8601String(),
                        'awaiting_phone_validation' => $created['push'],
                        'requires_otp' => $created['otp'],
                    ], $created['data']),
                ]);

                return $this->initiatedResponse($payment, $created['link'], $created['push'], $created['otp']);
            } catch (PaymentGatewayException $e) {
                // Message déjà prévu pour le voyageur ; la cause réelle a été journalisée à la source.
                return response()->json(['error' => $e->getMessage()], $e->httpStatus());
            } catch (\Exception $e) {
                \Log::error('Error creating payment link', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);

                return response()->json([
                    'error' => 'Impossible de créer le lien de paiement. Veuillez réessayer dans quelques instants.'
                ], 500);
            }
        } catch (\Exception $e) {
            \Log::error('Payment initiation error', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Message d'erreur simple pour l'utilisateur
            $userMessage = 'Une erreur est survenue lors de l\'initialisation du paiement. Veuillez réessayer.';
            
            return response()->json([
                'error' => $userMessage
            ], 500);
        }
    }

    /** Montant minimum accepté par MaliaPay (FCFA) — en dessous, l'API répond 422. */
    private const MIN_AMOUNT = 100;

    /** Statuts MaliaPay qui ne sont ni une réussite ni un échec : on attend la suite. */
    private const INTERMEDIATE_STATUSES = ['pending', 'processing', 'pending_otp'];

    /**
     * Une demande MTN (validation sur le téléphone) ou PeyaPay (code SMS) lancée il y a moins de 8 minutes,
     * pour le même moyen et le même montant, est-elle encore en cours chez MaliaPay ? Si oui, on la
     * réutilise au lieu d'en créer une autre.
     */
    private function initiationStillRunning(Payment $payment, string $method, int $amount): bool
    {
        $data = $payment->payment_data ?? [];

        if (!($data['awaiting_phone_validation'] ?? false) && !($data['requires_otp'] ?? false)) {
            return false;
        }
        if (($data['method'] ?? null) !== $method || (int) round((float) $payment->amount) !== $amount || !$payment->transaction_id) {
            return false;
        }

        $created = isset($data['created_at']) ? \Carbon\Carbon::parse($data['created_at']) : null;
        if (!$created || $created->lt(now()->subMinutes(8))) {
            return false;
        }

        $malia = $this->checkTransactionStatus($payment->transaction_id, 5);

        return $malia !== null && in_array(strtolower((string) ($malia['status'] ?? '')), [...self::INTERMEDIATE_STATUSES, 'success'], true);
    }

    /**
     * Réponse de l'initiation du paiement. `link` : redirection (Wave, Orange, Djamo, carte) ;
     * `awaiting_phone_validation` : MTN, le client valide sur son téléphone ; `requires_otp` : PeyaPay,
     * le client saisit le code reçu par SMS.
     */
    private function initiatedResponse(Payment $payment, string $link, bool $push, bool $otp)
    {
        return response()->json([
            'payment' => $payment->load('booking'),
            'payment_url' => $link,
            'link' => $link,
            'awaiting_phone_validation' => $push,
            'requires_otp' => $otp,
        ]);
    }

    /**
     * Code du canal MaliaPay pour un moyen de paiement de la plateforme.
     *
     * ⚠️ Repli sur WAVECI pour un moyen inconnu : ne JAMAIS exposer au checkout un moyen absent
     * de cette table (ex. Moov) — le client serait routé vers Wave.
     */
    private function channelFor(string $paymentMethod): string
    {
        return [
            'wave-ci' => 'WAVECI',
            'visa-mastercard' => 'CARD',
            'orange-ci' => 'OMCI',
            'djamo' => 'DJAMO',
            // MTN : voir config services.malia_pay.mtn_channel (MTNCI en production, MTNCII dans la doc).
            'mtn-ci' => (string) config('services.malia_pay.mtn_channel', 'MTNCI'),
            // PeyaPay : paiement par code reçu par SMS (initiatePeyaPay / verifyPeyaPay). Le flux est prêt ;
            // le moyen n'est proposé au voyageur qu'une fois une ligne « peya-pay » activée dans les moyens de paiement.
            'peya-pay' => 'PEYA_PAY',
            // 'moov-ci' => 'MOOVCI', // « momentanément indisponible » (documentation MaliaPay du 2026-10-30) : ne pas activer
        ][$paymentMethod] ?? 'WAVECI';
    }

    /** MTN : aucune redirection, le client valide sur son téléphone (notification push ou USSD). */
    private function isPushChannel(string $channel): bool
    {
        return in_array($channel, ['MTNCI', 'MTNCII'], true);
    }

    /**
     * Crée la transaction chez MaliaPay (business.malia.ci).
     *
     * Trois parcours selon le canal (documentation du 2026-10-30) :
     *  - Wave, Orange, Djamo, carte : un lien `link` vers lequel rediriger le client ;
     *  - MTN : aucun lien, statut `pending`, le client valide sur son téléphone → `push` ;
     *  - PeyaPay : un code OTP est envoyé par SMS, à saisir sur notre page → `otp` (voir verifyPeyaPay).
     *
     * @return array{link:string,push:bool,otp:bool,data:array} `data` : informations à joindre à payment_data
     *                                                          (frais, identifiant PeyaPay)
     *
     * @throws PaymentGatewayException message sûr à montrer au voyageur
     */
    private function createPaymentLink($payment, $booking, $user, $paymentMethod): array
    {
        // Si l'utilisateur n'est pas fourni, utiliser l'utilisateur de la réservation
        if (!$user && $booking->user) {
            $user = $booking->user;
        }

        Log::info('createPaymentLink called', [
            'payment_id' => $payment->id,
            'booking_id' => $booking->id,
            'user_id' => $user ? $user->id : $booking->user_id,
            'payment_method' => $paymentMethod,
        ]);

        $channel = $this->channelFor((string) $paymentMethod);
        $sandbox = (bool) config('services.malia_pay.sandbox');

        // Séparer le nom complet en prénom et nom
        $fullName = trim($user ? ($user->name ?? 'Client') : 'Client');
        $nameParts = explode(' ', $fullName, 2);
        $customerName = $nameParts[0] ?? 'Client'; // Prénom
        $customerSurname = $nameParts[1] ?? $nameParts[0] ?? 'Client'; // Nom (ou prénom si un seul mot)

        if (count($nameParts) === 1) {
            $customerSurname = $customerName;
        }

        // Montant en entier (XOF, pas de décimales) — attendu par l'API MaliaPay.
        $montant = (int) round($payment->amount);

        // Formater le numéro de téléphone : "225XXXXXXXXX" (sans le +) ; MaliaPay accepte aussi 07…, +225… et 225…
        $phoneNumber = $user ? ($user->phone ?? '') : '';
        $phoneNumber = str_replace(['+', ' ', '-'], '', $phoneNumber);
        if (!empty($phoneNumber) && substr($phoneNumber, 0, 3) !== '225') {
            if (substr($phoneNumber, 0, 1) === '0') {
                $phoneNumber = '225' . substr($phoneNumber, 1);
            } else {
                $phoneNumber = '225' . $phoneNumber;
            }
        }

        // success_url/error_url = FRONT (où revient le voyageur après paiement) ;
        // notification_url = API (webhook serveur-à-serveur de MaliaPay).
        $frontend = rtrim(config('services.frontend_url', 'https://bosejour.ci'), '/');

        $data = [
            'channel' => $channel,
            'montant' => $montant,
            'reference' => $payment->payment_reference,
            'description' => "Paiement de réservation #{$booking->id} - {$booking->accommodation->name}",
            'merchant_id' => config('services.malia_pay.merchant_id'),
            'customer_name' => $customerName,
            'customer_surname' => $customerSurname,
            'customer_phone_number' => $phoneNumber ?: '22500000000', // Valeur par défaut si vide
            'notification_url' => url('/api/payments/webhook'),
            // Retour client 2026-09-02 (Partie 1.3) : le voyageur atterrissait
            // directement sur la fiche réservation générique sans confirmation
            // visuelle. /bookings/success est l'écran de confirmation dédié
            // (existait déjà côté front mais n'était jamais utilisé par ce flux).
            'success_url' => "{$frontend}/bookings/success?id={$booking->access_token}",
            'error_url' => "{$frontend}/bookings/{$booking->access_token}/payment?error=1",
        ];

        // customer_email est facultatif : une adresse absente ou invalide est omise plutôt qu'envoyée vide.
        $email = $user ? $user->email : ($booking->user ? $booking->user->email : null);
        if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $data['customer_email'] = $email;
        }

        // Ne jamais logger nom/téléphone/email du client en clair — seules les données
        // nécessaires au diagnostic (montant, référence, canal) ont une valeur ici.
        Log::info('MaliaPay: création du paiement', [
            'reference' => $data['reference'],
            'montant' => $data['montant'],
            'channel' => $data['channel'],
            'sandbox' => $sandbox,
        ]);

        // En sandbox : /v1/test simule le paiement sans jamais appeler un opérateur réel
        // (voir docs/setup/PAYMENT_INTEGRATION.md) — utilisé en local/staging uniquement.
        // PeyaPay a son propre point d'entrée en deux étapes (envoi du code OTP).
        $base = rtrim(config('services.malia_pay.api_url'), '/');
        $endpoint = $sandbox ? $base . '/v1/test' : $base . ($channel === 'PEYA_PAY' ? '/v1/peyapay/init' : '/v1/payments');

        // acceptJson : sans cet en-tête, une erreur de validation (422) est renvoyée comme une redirection HTML.
        $response = Http::withHeaders(['X-API-Key' => config('services.malia_pay.api_key')])
            ->acceptJson()
            ->timeout(15)
            ->post($endpoint, $data);

        if ($response->failed()) {
            throw $this->gatewayException($response, $data['reference']);
        }

        $body = $response->json() ?? [];
        $paymentLink = (string) ($body['link'] ?? '');
        $transactionId = $body['transaction_id'] ?? null;
        $status = strtolower((string) ($body['status'] ?? ''));

        if (in_array($status, ['failed', 'cancelled'], true)) {
            Log::warning('MaliaPay: transaction refusée dès la création', ['reference' => $data['reference'], 'status' => $status, 'reason' => $body['reason'] ?? null]);
            throw new PaymentGatewayException("Le paiement a été refusé. Veuillez réessayer ou choisir un autre moyen de paiement.", 422);
        }

        $otp = !$sandbox && $channel === 'PEYA_PAY' && (($body['requiresOtp'] ?? false) || $status === 'otp_required');
        $push = !$sandbox && $paymentLink === '' && $this->isPushChannel($channel);

        // En sandbox, l'API ne renvoie volontairement aucun lien réel (link: "", aucun appel opérateur) ;
        // MTN et PeyaPay n'en renvoient jamais (le client valide sur son téléphone / saisit un code).
        if ($paymentLink === '' && !$sandbox && !$push && !$otp) {
            Log::error('MaliaPay: pas de lien de paiement dans la réponse', [
                'reference' => $data['reference'],
                'body' => $body,
            ]);
            throw new PaymentGatewayException("Impossible d'obtenir le lien de paiement. Veuillez réessayer.", 502);
        }

        // Le transaction_id MaliaPay est indispensable pour interroger le statut plus tard
        // (filet de sécurité si le webhook n'arrive jamais — voir checkTransactionStatus()
        // et Console\Commands\FlagStuckPendingPayments), donc enregistré dès la création,
        // pas seulement à la confirmation par webhook.
        if ($transactionId) {
            $payment->update(['transaction_id' => $transactionId]);
        }

        Log::info('MaliaPay: paiement créé', [
            'reference' => $data['reference'],
            'transaction_id' => $transactionId,
            'status' => $body['status'] ?? null,
            'push' => $push,
            'otp' => $otp,
        ]);

        return [
            'link' => $paymentLink,
            'push' => $push,
            'otp' => $otp,
            'data' => array_filter([
                'fees' => $body['fees'] ?? null,
                'peyapay_transaction_id' => $body['peyapay_transaction_id'] ?? null,
            ], fn ($v) => $v !== null),
        ];
    }

    /**
     * Traduit une réponse d'erreur de MaliaPay (documentation §8) en message sûr pour le voyageur,
     * et journalise la cause réelle (`reason`) pour l'équipe.
     */
    private function gatewayException(\Illuminate\Http\Client\Response $response, string $reference): PaymentGatewayException
    {
        $status = $response->status();
        $context = [
            'reference' => $reference,
            'http_status' => $status,
            'message' => $response->json('message'),
            'reason' => $response->json('reason'),
            'errors' => $response->json('errors'),
        ];

        if ($status === 401) {
            // Clé API absente, révoquée ou marchand désactivé : plus aucun paiement ne passe.
            Log::critical('MaliaPay: clé API refusée (401) — aucun paiement ne peut être créé', $context);

            return new PaymentGatewayException('Le paiement en ligne est momentanément indisponible. Veuillez réessayer plus tard.', 503);
        }

        if ($status === 422) {
            Log::warning('MaliaPay: paiement refusé par la validation (422)', $context);
            $errors = (array) $response->json('errors');

            if (isset($errors['montant'][0])) {
                return new PaymentGatewayException((string) $errors['montant'][0], 422);
            }
            if (isset($errors['channel'])) {
                return new PaymentGatewayException("Ce moyen de paiement n'est pas disponible pour le moment. Veuillez en choisir un autre.", 422);
            }

            return new PaymentGatewayException('Les informations de paiement sont invalides. Veuillez vérifier votre numéro de téléphone puis réessayer.', 422);
        }

        if ($status === 502) {
            // L'opérateur a refusé la demande ou le canal est en maintenance (ex. Moov) : `reason` donne la cause.
            Log::warning('MaliaPay: opérateur indisponible ou demande refusée (502)', $context);

            return new PaymentGatewayException('Ce moyen de paiement est momentanément indisponible. Veuillez en choisir un autre ou réessayer dans quelques minutes.', 502);
        }

        Log::error('MaliaPay: erreur HTTP à la création du paiement', $context + ['body' => $response->body()]);

        return new PaymentGatewayException('Impossible de créer le lien de paiement. Veuillez réessayer dans quelques instants.', 500);
    }

    /**
     * Interroge MaliaPay pour connaître le statut réel d'une transaction — filet de
     * sécurité complémentaire au webhook, qui n'est envoyé qu'UNE fois, sans nouvel envoi
     * en cas d'échec (documentation MaliaPay du 2026-10-30 ; et découverte du 2026-09-01 :
     * 30 paiements sur 31 restés "pending" faute de webhook). Utilisée par
     * Console\Commands\FlagStuckPendingPayments et par la relecture « avant de valider ».
     *
     * Statuts possibles : pending, processing, pending_otp, success, failed, cancelled. Un paiement
     * non confirmé par l'opérateur au bout de 10 minutes passe en `failed`, puis repasse en `success`
     * s'il est confirmé plus tard (cas fréquent de la carte) : toujours tenir compte du DERNIER statut.
     *
     * @param int $timeout secondes ; court (6) dans le webhook, qui doit répondre en moins de 10 s
     *
     * @return array{status?: string, reference?: string, transaction_id?: string, montant?: int|string, channel?: string}|null
     *         null si l'appel échoue — à traiter comme "indisponible", jamais comme "cancelled".
     */
    public function checkTransactionStatus(string $transactionId, int $timeout = 15): ?array
    {
        $endpoint = rtrim(config('services.malia_pay.api_url'), '/') . '/v1/payments/' . urlencode($transactionId);

        try {
            $response = Http::withHeaders(['X-API-Key' => config('services.malia_pay.api_key')])
                ->acceptJson()
                ->timeout($timeout)
                ->get($endpoint);
        } catch (\Throwable $e) {
            Log::warning('MaliaPay: échec de la vérification de statut', [
                'transaction_id' => $transactionId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }

        if ($response->failed()) {
            // 404 : transaction inconnue (c'est le cas d'une transaction de test du bac à sable).
            Log::warning('MaliaPay: statut non vérifiable', [
                'transaction_id' => $transactionId,
                'http_status' => $response->status(),
            ]);
            return null;
        }

        return $response->json();
    }

    /**
     * Rediriger vers le lien de paiement externe
     */
    public function process(Request $request, $paymentId)
    {
        $payment = Payment::with('booking')->findOrFail($paymentId);
        $user = $request->user();

        // Vérifier que l'utilisateur est le propriétaire (si authentifié)
        if ($user && $payment->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        // Si l'utilisateur n'est pas authentifié, permettre l'accès (pour les réservations sans compte)

        // Vérifier que le paiement est en attente
        if (!$payment->isPending()) {
            return response()->json([
                'message' => 'Ce paiement a déjà été traité',
                'payment' => $payment
            ], 400);
        }

        // Récupérer le lien de paiement depuis payment_data
        $paymentLink = $payment->payment_data['payment_link'] ?? null;

        if (!$paymentLink) {
            // Si le lien n'existe pas, le régénérer
            try {
                $created = $this->createPaymentLink(
                    $payment,
                    $payment->booking,
                    $payment->user,
                    $payment->payment_method
                );
                $paymentLink = $created['link'];

                $payment->update([
                    'payment_data' => array_merge($payment->payment_data ?? [], [
                        'payment_link' => $paymentLink,
                        'awaiting_phone_validation' => $created['push'],
                        'requires_otp' => $created['otp'],
                    ], $created['data'])
                ]);
            } catch (PaymentGatewayException $e) {
                return response()->json(['error' => $e->getMessage()], $e->httpStatus());
            } catch (\Exception $e) {
                \Log::error('Erreur lors de la génération du lien de paiement', ['payment_id' => $payment->id, 'error' => $e->getMessage()]);

                return response()->json([
                    'error' => 'Impossible de générer le lien de paiement. Veuillez réessayer dans quelques instants.'
                ], 500);
            }
        }

        return response()->json([
            'payment' => $payment->load('booking'),
            'payment_url' => $paymentLink,
            'link' => $paymentLink,
            'redirect_url' => $paymentLink
        ]);
    }

    /**
     * Vérifie la signature d'une notification MaliaPay (documentation du 2026-10-30, §7).
     *
     * MaliaPay joint deux en-têtes : `X-MaliaPay-Timestamp` (secondes Unix) et `X-MaliaPay-Signature`
     * (« sha256= » + HMAC-SHA256 de « {timestamp}.{corps brut} » calculé avec NOTRE clé API). On calcule
     * sur le corps brut, on compare en temps constant, et on refuse un horodatage de plus de 5 minutes
     * (rejeu d'une notification interceptée).
     *
     * @return string 'valid' (signature correcte), 'invalid' (présente mais fausse, périmée ou non
     *                vérifiable) ou 'absent' (aucun des deux en-têtes)
     */
    private function webhookSignatureState(Request $request): string
    {
        $timestamp = trim((string) $request->header('X-MaliaPay-Timestamp', ''));
        $received = trim((string) $request->header('X-MaliaPay-Signature', ''));

        if ($timestamp === '' && $received === '') {
            return 'absent';
        }

        $key = (string) config('services.malia_pay.api_key');
        if ($key === '' || !ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300) {
            return 'invalid';
        }

        $expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $request->getContent(), $key);

        return hash_equals($expected, $received) ? 'valid' : 'invalid';
    }

    /**
     * Interroge le statut réel d'une transaction chez MaliaPay — jamais sur la seule foi du corps
     * d'un webhook, toujours via notre propre X-API-Key (documentation : « relisez tout de même le
     * statut avant de livrer ou de valider une commande »).
     * Préfère le transaction_id que NOUS avons enregistré à la création du paiement (voir
     * createPaymentLink()) à celui réclamé par l'appelant du webhook : un paiement créé
     * depuis la migration du 2026-09-01 a systématiquement le sien, ce qui rend le
     * transaction_id du corps du webhook sans effet — on ne retombe dessus que pour de
     * très anciens paiements sans transaction_id connu.
     */
    private function verifiedMaliaStatus(?string $ourTransactionId, ?string $claimedTransactionId, int $timeout = 15): ?array
    {
        $transactionId = $ourTransactionId ?: $claimedTransactionId;

        return $transactionId ? $this->checkTransactionStatus($transactionId, $timeout) : null;
    }

    /**
     * Confirme un paiement d'après le statut rapporté PAR MALIAPAY (jamais d'après le corps d'un
     * webhook). Ne confirme que si le statut est « success » ET que la référence rapportée est bien
     * celle de CE paiement : une notification peut arriver dans le désordre, et la documentation demande
     * de vérifier la référence. Un montant rapporté inférieur au montant attendu est journalisé ; la
     * réservation n'est alors pas marquée soldée (voir updateBookingPaymentState()).
     *
     * Point d'entrée UNIQUE pour toute confirmation issue d'une lecture du statut MaliaPay (webhook,
     * retour de page, réconciliation automatique, Ops, admin).
     *
     * @return array{already_completed: bool, payment: Payment}|null null si MaliaPay ne confirme pas ce paiement
     */
    public function confirmFromMaliaStatus(Payment $payment, ?array $malia, string $source): ?array
    {
        if (!$malia || strtolower((string) ($malia['status'] ?? '')) !== 'success') {
            return null;
        }

        $reportedReference = (string) ($malia['reference'] ?? '');
        if ($reportedReference !== '' && $reportedReference !== (string) $payment->payment_reference) {
            Log::error('MaliaPay: succès rapporté pour une AUTRE référence — paiement non confirmé', [
                'payment_id' => $payment->id,
                'our_reference' => $payment->payment_reference,
                'reported_reference' => $reportedReference,
                'transaction_id' => $malia['transaction_id'] ?? $payment->transaction_id,
                'source' => $source,
            ]);

            return null;
        }

        $montant = isset($malia['montant']) ? (int) round((float) $malia['montant']) : null;
        if ($montant !== null && $montant < (int) round((float) $payment->amount)) {
            Log::warning('MaliaPay: montant rapporté inférieur au montant attendu', [
                'payment_id' => $payment->id,
                'expected' => (int) round((float) $payment->amount),
                'reported' => $montant,
                'source' => $source,
            ]);
        }

        return $this->confirmPaymentSuccess(
            $payment->id,
            $malia['transaction_id'] ?? $payment->transaction_id,
            $montant,
            $malia,
            $source
        );
    }

    /**
     * Le webhook prétend qu'un paiement a réussi. On ne confirme JAMAIS sur la seule foi du corps de la
     * requête (n'importe qui connaissant une référence pourrait sinon se faire confirmer une réservation
     * gratuitement) : on redemande le statut réel à MaliaPay, avec le montant qu'IL rapporte, et on ne
     * confirme que s'il confirme lui-même le succès de cette référence.
     */
    private function confirmSuccessClaimedByWebhook(Payment $payment, ?string $claimedTransactionId, array $rawWebhookData)
    {
        $malia = $this->verifiedMaliaStatus($payment->transaction_id, $claimedTransactionId, 6);
        $result = $this->confirmFromMaliaStatus($payment, $malia, 'webhook_verifie');

        if ($result) {
            return response()->json([
                'message' => $result['already_completed'] ? 'Paiement déjà confirmé' : 'Paiement confirmé avec succès',
                'payment' => $result['payment'],
            ]);
        }

        Log::warning("Webhook malia-pay: succès réclamé mais NON confirmé par l'API MaliaPay — paiement non confirmé (appel forgé, référence différente ou API indisponible)", [
            'payment_id' => $payment->id,
            'reference' => $payment->payment_reference,
            'claimed_transaction_id' => $claimedTransactionId,
            'our_transaction_id' => $payment->transaction_id,
            'malia_status' => $malia['status'] ?? null,
            'webhook_body' => $rawWebhookData,
        ]);

        // Toujours HTTP 200 : MaliaPay n'envoie qu'une fois et ne réessaie pas, un refus n'apporterait rien.
        // Le paiement reste « pending » : la réconciliation automatique (payments:flag-stuck-pending, toutes
        // les 5 minutes) ou une vérification manuelle le confirmera dès que MaliaPay le confirme réellement.
        return response()->json([
            'message' => "Statut « succès » non confirmé de façon indépendante ; vérification en cours.",
        ]);
    }

    /**
     * Webhook : notification de MaliaPay (succès, échec, annulation ou traitement en cours).
     *
     * MaliaPay l'envoie UNE seule fois, attend au plus 10 secondes une réponse HTTP 200 et ne la renvoie
     * pas en cas d'échec ; elle peut arriver dans le désordre et un même paiement peut être notifié
     * plusieurs fois (d'abord « failed », puis « success » quand l'opérateur confirme plus tard). Tout
     * ce qui suit est donc idempotent et fondé sur le DERNIER statut ; les notifications manquées sont
     * rattrapées par payments:flag-stuck-pending.
     */
    public function webhook(Request $request)
    {
        // Le travail commencé doit aller à son terme même si MaliaPay raccroche après 10 secondes.
        ignore_user_abort(true);

        $signature = $this->webhookSignatureState($request);
        if ($signature === 'invalid' || ($signature === 'absent' && config('services.malia_pay.require_signature'))) {
            Log::warning('Webhook malia-pay: signature invalide, périmée ou absente', [
                'ip' => $request->ip(),
                'signature' => $signature,
            ]);
            return response()->json(['error' => 'Signature invalide'], 401);
        }
        if ($signature === 'absent') {
            Log::info('Webhook malia-pay non signé (en-têtes X-MaliaPay-* absents) : le statut sera relu auprès de MaliaPay.');
        }

        $data = $request->all();

        $reference = $data['reference'] ?? null;
        $status = strtolower((string) ($data['status'] ?? ''));
        $transactionId = $data['transactionID'] ?? $data['transaction_id'] ?? null;

        if (!$reference || $status === '') {
            Log::warning('Webhook malia-pay: Référence ou statut manquant', $data);
            return response()->json(['error' => 'Référence ou statut manquant'], 400);
        }

        $payment = Payment::where('payment_reference', $reference)->first();

        if (!$payment) {
            Log::warning('Webhook malia-pay: Paiement non trouvé', ['reference' => $reference]);
            return response()->json(['error' => 'Paiement non trouvé'], 404);
        }

        if (in_array($status, ['success', 'successful', 'completed', 'paid'], true)) {
            return $this->confirmSuccessClaimedByWebhook($payment, $transactionId, $data);
        }

        // États intermédiaires MaliaPay (le client n'a pas fini chez l'opérateur, ou la transaction est
        // en cours de traitement, ou le code OTP PeyaPay est attendu) — ce n'est PAS un échec : ne rien
        // changer et attendre le prochain statut.
        if (in_array($status, self::INTERMEDIATE_STATUSES, true)) {
            Log::info('Webhook malia-pay: statut intermédiaire reçu, aucune action', [
                'payment_id' => $payment->id,
                'reference' => $payment->payment_reference,
                'status' => $status,
            ]);
            return response()->json([
                'message' => 'Statut intermédiaire pris en compte, en attente de confirmation',
                'payment' => $payment->load('booking'),
            ]);
        }

        // « failed », « cancelled » (ou statut inattendu) : avant de marquer un paiement échoué, on relit
        // le statut réel. Un échec suivi d'une réussite, une notification périmée ou forgée ne doivent
        // jamais laisser un paiement encaissé comme « échoué ».
        $malia = $this->verifiedMaliaStatus($payment->transaction_id, $transactionId, 6);
        $maliaStatus = strtolower((string) ($malia['status'] ?? ''));

        if ($result = $this->confirmFromMaliaStatus($payment, $malia, 'webhook_verifie')) {
            return response()->json([
                'message' => 'Paiement confirmé après vérification',
                'payment' => $result['payment'],
            ]);
        }

        if (in_array($maliaStatus, self::INTERMEDIATE_STATUSES, true)) {
            Log::info("Webhook malia-pay: échec annoncé mais MaliaPay indique que le paiement est encore en cours, ignoré", [
                'payment_id' => $payment->id,
                'announced' => $status,
                'malia_status' => $maliaStatus,
            ]);
            return response()->json(['message' => 'Paiement encore en cours chez MaliaPay, aucune action']);
        }

        if ($malia === null && $signature !== 'valid') {
            // Ni vérifiable auprès de MaliaPay, ni signée : on ne marque pas « échoué » sur parole.
            Log::warning('Webhook malia-pay: échec non signé et non vérifiable, ignoré (la réconciliation tranchera)', [
                'payment_id' => $payment->id,
                'reference' => $payment->payment_reference,
            ]);
            return response()->json(['message' => 'Notification enregistrée, vérification en cours']);
        }

        return DB::transaction(function () use ($payment, $status, $data) {
            // Reverrouille dans la transaction : empêche un traitement concurrent si MaliaPay
            // envoie deux notifications en parallèle avant que la première n'ait fini.
            $payment = Payment::where('id', $payment->id)->lockForUpdate()->first();

            // Idempotence : un paiement déjà confirmé ne repasse jamais en échec, et un webhook rejoué
            // ne redéclenche ni commission ni e-mails.
            if ($payment->status === 'completed') {
                Log::info('Webhook malia-pay: paiement déjà confirmé, notification d\'échec ignorée', [
                    'payment_id' => $payment->id,
                    'reference' => $payment->payment_reference,
                ]);
                return response()->json([
                    'message' => 'Paiement déjà confirmé',
                    'payment' => $payment->load('booking'),
                ]);
            }

            // Paiement échoué (peut encore devenir « success » plus tard : voir la réconciliation, qui
            // revérifie les échecs des 3 derniers jours).
            $payment->update([
                'status' => 'failed',
                'payment_data' => array_merge($payment->payment_data ?? [], [
                    'webhook_data' => $data,
                    'failed_at' => now()->toIso8601String(),
                ]),
            ]);

            // Un échec sur un paiement ne doit pas défaire une réservation déjà soldée ou garantie par un autre.
            if (!in_array($payment->booking->payment_status, ['paid', 'guarantee_paid'], true)) {
                $payment->booking->update(['payment_status' => 'failed']);
            }

            Log::warning('Webhook malia-pay: Paiement échoué', [
                'payment_id' => $payment->id,
                'reference' => $payment->payment_reference,
                'status' => $status,
            ]);

            // HTTP 200 : un statut « failed » n'est pas une erreur de notre côté, c'est une information
            // normale qu'on vient d'enregistrer.
            return response()->json([
                'message' => 'Paiement échoué',
                'payment' => $payment->load('booking')
            ]);
        });
    }

    /**
     * Marque un paiement « échoué » parce que MaliaPay le dit (échec ou annulation, relus auprès de lui).
     * Le paiement peut encore repasser « completed » si l'opérateur confirme plus tard. Une réservation
     * déjà soldée ou garantie par un autre paiement n'est pas touchée.
     */
    public function markFailedFromMaliaStatus(Payment $payment, array $malia): void
    {
        $payment->update([
            'status' => 'failed',
            'payment_data' => array_merge($payment->payment_data ?? [], [
                'reconciliation_data' => $malia,
                'failed_at' => now()->toIso8601String(),
            ]),
        ]);

        if ($payment->booking && !in_array($payment->booking->payment_status, ['paid', 'guarantee_paid'], true)) {
            $payment->booking->update(['payment_status' => 'failed']);
        }
    }

    /**
     * PeyaPay, étape 2 : le client saisit sur notre page le code reçu par SMS (documentation §5).
     * L'étape 1 (envoi du code) est faite par initiate(), qui mémorise `peyapay_transaction_id`.
     */
    public function verifyPeyaPay(Request $request, $bookingId)
    {
        $data = $request->validate(['otp_code' => ['required', 'string', 'regex:/^\d{4,8}$/']]);

        $booking = Booking::findByRef((string) $bookingId, $request->user());
        if (!$booking) {
            return response()->json(['message' => 'Réservation introuvable.'], 404);
        }
        if ($request->user() && $booking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $payment = Payment::where('booking_id', $booking->id)
            ->where('status', 'pending')
            ->orderByDesc('id')
            ->get()
            ->first(fn (Payment $p) => !empty(($p->payment_data ?? [])['peyapay_transaction_id']));

        if (!$payment) {
            return response()->json(['error' => 'Aucun paiement PeyaPay en attente de code pour cette réservation.'], 404);
        }

        try {
            $response = Http::withHeaders(['X-API-Key' => config('services.malia_pay.api_key')])
                ->acceptJson()
                ->timeout(20)
                ->post(rtrim(config('services.malia_pay.api_url'), '/') . '/v1/peyapay/verify', [
                    'peyapay_transaction_id' => $payment->payment_data['peyapay_transaction_id'],
                    'otp_code' => $data['otp_code'],
                ]);
        } catch (\Throwable $e) {
            Log::warning('PeyaPay: vérification du code impossible', ['payment_id' => $payment->id, 'error' => $e->getMessage()]);

            return response()->json(['error' => 'Impossible de joindre la passerelle de paiement. Veuillez réessayer dans un instant.'], 502);
        }

        if ($response->failed()) {
            Log::warning('PeyaPay: code refusé', [
                'payment_id' => $payment->id,
                'http_status' => $response->status(),
                'reason' => $response->json('reason') ?? $response->json('message'),
            ]);

            return response()->json(['error' => 'Code incorrect ou expiré. Veuillez vérifier le code reçu par SMS puis réessayer.'], 422);
        }

        // La vérification est synchrone ; on relit tout de même le statut chez MaliaPay avant de valider.
        $malia = $payment->transaction_id ? $this->checkTransactionStatus($payment->transaction_id) : null;
        $result = $this->confirmFromMaliaStatus($payment, $malia, 'peyapay_verify');

        if (!$result && in_array(strtolower((string) ($malia['status'] ?? '')), ['failed', 'cancelled'], true)) {
            $this->markFailedFromMaliaStatus($payment, $malia);

            return response()->json(['error' => "Le paiement a été refusé. Veuillez réessayer ou choisir un autre moyen de paiement."], 422);
        }

        return response()->json([
            'status' => $result ? 'completed' : 'pending',
            'payment' => ($result['payment'] ?? $payment)->load('booking'),
        ]);
    }

    /**
     * Confirme un paiement comme réussi — logique partagée entre le webhook automatique
     * de Malia Pay et la confirmation manuelle admin (filet de sécurité si le webhook
     * n'arrive jamais, voir Admin\AdminPaymentController::confirmManually()).
     *
     * Idempotent : un paiement déjà "completed" ne redéclenche jamais une seconde fois
     * la commission ni les notifications/e-mails de confirmation, quelle que soit la
     * source de l'appel.
     *
     * Public (et non une route) pour être appelable depuis Admin\AdminPaymentController —
     * jamais exposée directement, toujours derrière un contrôleur qui applique ses propres
     * garde-fous (signature webhook, ou rôle admin + validation).
     *
     * @return array{already_completed: bool, payment: Payment}
     */
    public function confirmPaymentSuccess(int $paymentId, ?string $transactionId, ?int $montant, array $rawData, string $source): array
    {
        return DB::transaction(function () use ($paymentId, $transactionId, $montant, $rawData, $source) {
            // Verrouille dans la transaction : empêche un traitement concurrent si Malia Pay
            // rejoue le webhook en parallèle, ou si un admin confirme manuellement au même
            // moment qu'un webhook tardif arrive.
            $payment = Payment::where('id', $paymentId)->lockForUpdate()->first();

            if (!$payment) {
                throw new \RuntimeException("Paiement #{$paymentId} introuvable.");
            }

            if ($payment->status === 'completed') {
                \Log::info("Paiement déjà confirmé, confirmation ignorée (source: {$source})", [
                    'payment_id' => $payment->id,
                    'reference' => $payment->payment_reference,
                ]);
                return ['already_completed' => true, 'payment' => $payment->load('booking')];
            }

            $payment->update([
                'status' => 'completed',
                'transaction_id' => $transactionId,
                'amount' => $montant ?? $payment->amount,
                'paid_at' => now(),
                'payment_data' => array_merge($payment->payment_data ?? [], [
                    'webhook_data' => $rawData,
                    'confirmation_source' => $source,
                    'processed_at' => now()->toIso8601String(),
                ]),
            ]);

            $booking = $this->updateBookingPaymentState($payment);

            if ($booking->payment_status === 'paid') {
                // Calculer et enregistrer la commission (released_at = null jusqu'au check-in)
                $this->createCommission($payment);
                $this->sendBookingCodeNotification($booking);
                // Envoyer les emails de confirmation hôte + client (avec le bon confirmation_code)
                $this->sendBookingEmails($booking);
            }

            \Log::info("Paiement confirmé (source: {$source})", [
                'payment_id' => $payment->id,
                'reference' => $payment->payment_reference,
                'transaction_id' => $transactionId,
            ]);

            return ['already_completed' => false, 'payment' => $payment->load('booking')];
        });
    }

    /**
     * Obtenir les détails d'un paiement
     */
    public function show(Request $request, $paymentId)
    {
        $payment = Payment::with(['booking.accommodation', 'user'])->findOrFail($paymentId);

        // Retour de la page de paiement (et attente de validation MTN / PeyaPay, qui interroge cette route) :
        // si le webhook n'est pas (encore) arrivé — il n'est envoyé qu'une fois —, on interroge MaliaPay
        // directement plutôt que d'afficher un paiement « en attente » alors qu'il est réussi. Les paiements
        // « échoués » sont relus aussi : MaliaPay marque « failed » au bout de 10 minutes sans confirmation de
        // l'opérateur, puis « success » si celui-ci confirme plus tard (cas fréquent de la carte bancaire).
        // Route publique : une relecture par paiement et par intervalle de 3 secondes au plus.
        if (in_array($payment->status, ['pending', 'failed'], true) && $payment->transaction_id
            && Cache::add('payment-recheck:' . $payment->id, 1, 3)) {
            $malia = $this->checkTransactionStatus($payment->transaction_id);

            if ($this->confirmFromMaliaStatus($payment, $malia, 'reconciliation_retour')) {
                $payment = Payment::with(['booking.accommodation', 'user'])->findOrFail($paymentId);
            } elseif ($payment->status === 'pending' && in_array(strtolower((string) ($malia['status'] ?? '')), ['failed', 'cancelled'], true)) {
                $this->markFailedFromMaliaStatus($payment, $malia);
                $payment = Payment::with(['booking.accommodation', 'user'])->findOrFail($paymentId);
            }
        }

        // Accessible sans authentification (réservations invité) — jamais de documents/
        // coordonnées bancaires dans payment.user quel que soit l'appelant.
        $payment->user?->makeHidden(SensitiveUserFields::DOCUMENTS_AND_FINANCIAL);

        $user = $request->user();

        // Si l'utilisateur est authentifié, vérifier les permissions
        if ($user) {
            if ($payment->user_id !== $user->id &&
                $payment->booking->accommodation->host_id !== $user->hostScopeId() &&
                !$user->isAdmin()) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }
        // Si l'utilisateur n'est pas authentifié, permettre l'accès (pour les réservations sans compte)
        // La sécurité est assurée par le fait que seul quelqu'un avec l'ID du paiement peut y accéder

        return response()->json($payment);
    }

    /**
     * Historique des paiements du voyageur connecté (+ total réglé).
     */
    public function myPayments(Request $request)
    {
        $payments = Payment::where('user_id', $request->user()->id)
            ->with(['booking.accommodation:id,name,city'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($p) {
                return [
                    'id'             => $p->id,
                    'amount'         => (float) $p->amount,
                    'status'         => $p->status,
                    'purpose'        => $p->purpose,
                    'payment_method' => $p->payment_method,
                    'reference'      => $p->payment_reference,
                    'transaction_id' => $p->transaction_id,
                    'paid_at'        => $p->paid_at,
                    'created_at'     => $p->created_at,
                    'booking_id'     => $p->booking_id,
                    'accommodation'  => $p->booking && $p->booking->accommodation
                        ? ['name' => $p->booking->accommodation->name, 'city' => $p->booking->accommodation->city]
                        : null,
                ];
            });

        return response()->json([
            'data'       => $payments->values(),
            'total_paid' => (float) $payments->where('status', 'completed')->sum('amount'),
        ]);
    }

    private function updateBookingPaymentState(Payment $payment): Booking
    {
        $booking = $payment->booking()->lockForUpdate()->first();

        if (!$booking) {
            throw new \RuntimeException('Réservation introuvable pour ce paiement.');
        }

        $booking->amount_paid = min(
            (float) $booking->total_price,
            (float) $booking->amount_paid + (float) $payment->amount
        );

        if (in_array($payment->purpose, ['deposit', 'guarantee']) && !$booking->deposit_paid_at) {
            $booking->deposit_paid_at = now();
            $this->markConfirmedIfPending($booking);
        }

        // Un paiement "full" ne marque la réservation payée que si le montant réellement
        // encaissé (voir confirmSuccessClaimedByWebhook — toujours celui rapporté par Malia
        // Pay, jamais celui réclamé par l'appelant) couvre effectivement le prix total.
        // Avant ce correctif, purpose === 'full' suffisait à lui seul, quel que soit le
        // montant réellement crédité — un paiement partiel (ou une transaction Malia Pay
        // réelle mais pour un montant sans rapport) aurait pu confirmer une réservation
        // sans qu'elle ait été intégralement réglée.
        if ($payment->purpose === 'full' && $booking->amount_paid >= $booking->total_price) {
            $booking->payment_status = 'paid';
            $booking->expires_at = null;
            $this->markConfirmedIfPending($booking);
        } elseif ($payment->purpose === 'guarantee') {
            $booking->payment_status = 'guarantee_paid';
            $booking->expires_at = null;
        } elseif ($booking->amount_paid >= $booking->total_price) {
            $booking->payment_status = 'paid';
            $booking->expires_at = null;
            $this->markConfirmedIfPending($booking);
        } else {
            $booking->payment_status = 'pending';
        }

        $booking->save();

        return $booking;
    }

    /**
     * Fait passer la réservation en "confirmed" si elle est encore "pending" —
     * génère le code de confirmation/numéro de réservation et bloque les dates
     * dans room_availabilities (sinon la chambre reste vendable en double après
     * un paiement réussi, jusqu'à une éventuelle confirmation manuelle admin).
     *
     * Bug corrigé le 2026-09-15 : comparait `$booking->status === 'pending'`
     * (chaîne) à un attribut casté en enum BookingStatus — toujours false en
     * PHP (=== compare aussi le type), donc ce bloc ne s'exécutait jamais
     * depuis l'introduction de l'enum. Conséquence en production : aucune
     * réservation payée normalement (webhook ou confirmation manuelle admin)
     * ne passait "confirmed", ni ses dates bloquées, sans intervention admin
     * manuelle via /dashboard/admin/reservations.
     */
    private function markConfirmedIfPending(Booking $booking): void
    {
        if ($booking->status !== BookingStatus::Pending) {
            return;
        }

        $booking->status = BookingStatus::Confirmed;
        if (empty($booking->confirmation_code)) {
            $booking->confirmation_code = Booking::generateConfirmationCode();
        }
        if (empty($booking->booking_number)) {
            $booking->booking_number = Booking::generateBookingNumber();
        }

        if ($booking->room_id) {
            $this->bookingService->blockDates(
                $booking->room_id,
                \Carbon\Carbon::parse($booking->check_in),
                \Carbon\Carbon::parse($booking->check_out)
            );
        }
    }

    /**
     * Créer une commission pour un paiement
     * IMPORTANT: Une seule commission par réservation pour éviter les surpaiements
     */
    private function createCommission(Payment $payment)
    {
        $booking = $payment->booking;
        $accommodation = $booking->accommodation;

        // Vérifier qu'une commission n'existe pas déjà pour cette réservation
        // C'est la clé pour éviter les surpaiements : une seule commission par réservation
        $existingCommission = Commission::where('booking_id', $booking->id)->first();

        if ($existingCommission) {
            // Une commission existe déjà pour cette réservation
            // Mettre à jour avec le dernier paiement et recalculer si nécessaire
            \Log::info('Commission déjà existante pour cette réservation', [
                'booking_id' => $booking->id,
                'existing_commission_id' => $existingCommission->id,
                'payment_id' => $payment->id,
            ]);

            // Taux de commission plateforme (borné 8–10 %)
            $commissionRate = self::getCommissionRateClamped();

            // Recalculer la commission basée sur le montant total de la réservation
            // Base du calcul : le tarif plein de l'hôte (base_price), jamais réduit par
        // une promo/bon de fidélité voyageur — boséjour finance cette différence
        // (retour client 2026-09-02, Partie 2 ; confirmé avec l'utilisateur).
        // Repli sur total_price pour les réservations créées avant ce champ, afin
        // de ne pas recalculer rétroactivement des commissions déjà en attente.
        $bookingAmount = $booking->base_price ?? $booking->total_price;
            $commissionAmount = ($bookingAmount * $commissionRate) / 100;
            $hostAmount = $bookingAmount - $commissionAmount;

            // Mettre à jour la commission existante avec les nouvelles valeurs
            // et associer le dernier paiement qui a complété la réservation
            $existingCommission->update([
                'payment_id' => $payment->id, // Associer le dernier paiement
                'booking_amount' => $bookingAmount,
                'commission_rate' => $commissionRate,
                'commission_amount' => $commissionAmount,
                'host_amount' => $hostAmount,
                // Ne pas changer le statut si déjà payé
            ]);

            \Log::info('Commission mise à jour pour éviter le doublon', [
                'commission_id' => $existingCommission->id,
                'booking_id' => $booking->id,
                'host_amount' => $hostAmount,
            ]);

            return $existingCommission;
        }

        // Aucune commission n'existe pour cette réservation, créer une nouvelle
        $commissionRate = self::getCommissionRateClamped();

        // Base du calcul : le tarif plein de l'hôte (base_price), jamais réduit par
        // une promo/bon de fidélité voyageur — boséjour finance cette différence
        // (retour client 2026-09-02, Partie 2 ; confirmé avec l'utilisateur).
        // Repli sur total_price pour les réservations créées avant ce champ, afin
        // de ne pas recalculer rétroactivement des commissions déjà en attente.
        $bookingAmount = $booking->base_price ?? $booking->total_price;
        $commissionAmount = ($bookingAmount * $commissionRate) / 100;
        $hostAmount = $bookingAmount - $commissionAmount;

        // Vérifier que le montant total des commissions pour cette réservation ne dépasse pas le montant de la réservation
        $totalCommissionsForBooking = Commission::where('booking_id', $booking->id)->sum('commission_amount');
        if ($totalCommissionsForBooking + $commissionAmount > $bookingAmount) {
            \Log::warning('Tentative de créer une commission qui dépasserait le montant de la réservation', [
                'booking_id' => $booking->id,
                'booking_amount' => $bookingAmount,
                'existing_commissions' => $totalCommissionsForBooking,
                'new_commission' => $commissionAmount,
                'total_would_be' => $totalCommissionsForBooking + $commissionAmount,
            ]);
            throw new \RuntimeException('Impossible de créer une commission : le montant total dépasserait le montant de la réservation.');
        }

        $commission = Commission::create([
            'booking_id' => $booking->id,
            'payment_id' => $payment->id,
            'host_id' => $accommodation->host_id,
            'booking_amount' => $bookingAmount,
            'commission_rate' => $commissionRate,
            'commission_amount' => $commissionAmount,
            'host_amount' => $hostAmount,
            'status' => 'pending',
        ]);

        \Log::info('Nouvelle commission créée', [
            'commission_id' => $commission->id,
            'booking_id' => $booking->id,
            'payment_id' => $payment->id,
            'host_amount' => $hostAmount,
        ]);

        return $commission;
    }

    /**
     * Envoyer les emails de confirmation au client et à l'hôte après paiement validé.
     * Le confirmation_code doit déjà être généré à ce stade.
     */
    private function sendBookingEmails(Booking $booking): void
    {
        $booking->load(['user', 'accommodation.host', 'room']);

        if ($booking->user?->email) {
            try {
                Mail::to($booking->user->email)->send(new BookingConfirmation($booking));
                \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'email', 'traveler', $booking->user->email, true);
            } catch (\Throwable $e) {
                Log::error('Booking confirmation email (client) failed after payment', [
                    'booking_id' => $booking->id,
                    'error'      => $e->getMessage(),
                ]);
                \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'email', 'traveler', $booking->user->email, false, $e->getMessage());
            }
        }

        $hostEmail = $booking->accommodation?->host?->email;
        if ($hostEmail) {
            try {
                Mail::to($hostEmail)->send(new HostNewBooking($booking));
                \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'email', 'host', $hostEmail, true);
            } catch (\Throwable $e) {
                Log::error('Booking confirmation email (host) failed after payment', [
                    'booking_id' => $booking->id,
                    'error'      => $e->getMessage(),
                ]);
                \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'email', 'host', $hostEmail, false, $e->getMessage());
            }
        }

        // Notification in-app Extranet hôte — ce chemin (webhook Malia Pay réel via
        // confirmPaymentSuccess()) est distinct de BookingService::confirm() (confirmation
        // manuelle admin) : les deux doivent notifier l'hôte dans l'Extranet (retour
        // client 2026-09-02, Partie 4.3). Best-effort, ne bloque jamais le paiement.
        try {
            Message::notifyHostNewBooking($booking);
            \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'in_app', 'host', null, true);
        } catch (\Throwable $e) {
            Log::error('Booking confirmation in-app notification (host) failed after payment', [
                'booking_id' => $booking->id,
                'error'      => $e->getMessage(),
            ]);
            \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'in_app', 'host', null, false, $e->getMessage());
        }

        // Confirmation par SMS (best-effort, en plus des emails)
        try {
            $sms = app(\App\Services\SmsService::class);
            $sms->sendBookingConfirmationToClient($booking);
            $sms->sendBookingNotificationToHost($booking);
            \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'sms', 'traveler', $booking->user?->phone, true);
        } catch (\Throwable $e) {
            Log::error('Booking confirmation SMS failed after payment', [
                'booking_id' => $booking->id,
                'error'      => $e->getMessage(),
            ]);
            \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'sms', 'traveler', $booking->user?->phone, false, $e->getMessage());
        }
    }

    /**
     * Envoyer au client une notification avec le code de réservation (à présenter au gérant à l'arrivée).
     */
    private function sendBookingCodeNotification(Booking $booking): void
    {
        if (!$booking->confirmation_code || !$booking->user_id) {
            return;
        }
        $accommodationName = $booking->accommodation?->name ?? 'l\'établissement';
        Message::create([
            'recipient_id' => $booking->user_id,
            'sender_id' => null,
            'is_from_platform' => true,
            'subject' => 'Votre code de réservation',
            'body' => "Votre réservation a été confirmée.\n\n"
                . "Code à présenter au gérant à votre arrivée : **" . $booking->confirmation_code . "**\n\n"
                . "Remettez ce code au responsable de " . $accommodationName . " pour marquer le début de votre séjour.\n\n"
                . "Réservation #" . $booking->id . " – " . $accommodationName,
            'booking_id' => $booking->id,
        ]);
    }
}

