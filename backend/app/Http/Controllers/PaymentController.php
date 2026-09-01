<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Commission;
use App\Models\Message;
use App\Models\Setting;
use App\Services\PaymentOptionsService;
use App\Mail\BookingConfirmation;
use App\Mail\HostNewBooking;
use App\Support\Security\SensitiveUserFields;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PaymentController extends Controller
{
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

            $booking = Booking::with(['accommodation', 'user'])->findOrFail($bookingId);

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
            if ($booking->status === 'cancelled' || $booking->isExpired()) {
                \Log::info('Payment initiation: Booking unavailable', [
                    'booking_id' => $booking->id,
                    'status' => $booking->status,
                    'is_expired' => $booking->isExpired(),
                ]);
                return response()->json([
                    'message' => 'Cette réservation n\'est plus disponible'
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
            } else {
                return response()->json(['message' => 'Type de paiement invalide'], 400);
            }

            if ($amountToPay <= 0) {
                return response()->json([
                    'message' => 'Montant de paiement invalide'
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
                $payment->update([
                    'amount' => $paymentAmount,
                    'payment_method' => $paymentMethod,
                    'payment_reference' => $payment->payment_reference ?? $this->generateNumCommande(),
                    'payment_data' => null,
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
                return response()->json([
                    'payment' => $payment->load('booking'),
                    'payment_url' => $payment->payment_data['payment_link'],
                    'link' => $payment->payment_data['payment_link']
                ]);
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
                $paymentLink = $this->createPaymentLink($payment, $booking, $user, $paymentMethod);
                
                \Log::info('Payment link created successfully', [
                    'payment_id' => $payment->id,
                    'payment_link' => $paymentLink,
                ]);
                
                // Mettre à jour le paiement avec le lien
                $payment->update([
                    'payment_data' => [
                        'payment_link' => $paymentLink,
                        'method' => $paymentMethod,
                        'created_at' => now()->toIso8601String(),
                    ]
                ]);

                return response()->json([
                    'payment' => $payment->load('booking'),
                    'payment_url' => $paymentLink,
                    'link' => $paymentLink
                ]);
            } catch (\Exception $e) {
                \Log::error('Error creating payment link', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                
                // Message d'erreur simple pour l'utilisateur
                $userMessage = 'Impossible de créer le lien de paiement. Veuillez réessayer dans quelques instants.';
                
                // Si c'est une erreur spécifique de l'API, utiliser le message de l'API
                if (strpos($e->getMessage(), 'Veuillez') !== false || 
                    strpos($e->getMessage(), 'transaction') !== false ||
                    strpos($e->getMessage(), 'lien') !== false) {
                    $userMessage = $e->getMessage();
                }
                
                return response()->json([
                    'error' => $userMessage
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

    /**
     * Créer un lien de paiement via l'API MaliaPay (business.malia.ci).
     *
     * Migrée le 2026-09-01 depuis l'ancienne API malia-pay.com (non documentée,
     * devinée par tâtonnement — d'où l'ancienne logique de repli sur plusieurs noms
     * de champs/URLs possibles, plus nécessaire ici car le contrat est maintenant
     * documenté : voir docs/setup/PAYMENT_INTEGRATION.md).
     */
    private function createPaymentLink($payment, $booking, $user, $paymentMethod)
    {
        // Si l'utilisateur n'est pas fourni, utiliser l'utilisateur de la réservation
        if (!$user && $booking->user) {
            $user = $booking->user;
        }
        
        \Log::info('createPaymentLink called', [
            'payment_id' => $payment->id,
            'booking_id' => $booking->id,
            'user_id' => $user ? $user->id : $booking->user_id,
            'payment_method' => $paymentMethod,
        ]);

        // Mapper les méthodes de paiement vers les channels MaliaPay. Codes confirmés par
        // la doc officielle du 2026-09-01 : WAVECI, OMCI, MTNCI, MOOVCI, CARD, DJAMO, PEYA_PAY.
        // MTN/Moov et PeyaPay restent volontairement HORS checkout pour l'instant (décision
        // du 2026-09-01, à reprendre dans une session dédiée — PeyaPay a un flux OTP à part).
        $channelMap = [
            'wave-ci' => 'WAVECI',
            'visa-mastercard' => 'CARD',
            'orange-ci' => 'OMCI',
            'djamo' => 'DJAMO',
            // 'mtn-ci' => 'MTNCI',   // canal confirmé par la doc MaliaPay, pas encore activé
            // 'moov-ci' => 'MOOVCI', // canal confirmé par la doc MaliaPay, pas encore activé
        ];

        // ⚠️ Repli sur WAVECI pour un moyen inconnu : ne JAMAIS exposer au checkout un
        // moyen absent de $channelMap (ex. MTN/Moov) — le client serait routé vers Wave.
        $channel = $channelMap[$paymentMethod] ?? 'WAVECI';

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

        // Formater le numéro de téléphone selon la documentation : "225XXXXXXXXX" (sans le +)
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
            'customer_email' => $user ? $user->email : ($booking->user ? $booking->user->email : ''),
            'notification_url' => url('/api/payments/webhook'),
            'success_url' => "{$frontend}/bookings/{$booking->id}?payment=success",
            'error_url' => "{$frontend}/bookings/{$booking->id}/payment?error=1",
        ];

        // Ne jamais logger nom/téléphone/email du client en clair — seules les données
        // nécessaires au diagnostic (montant, référence, canal) ont une valeur ici.
        $sandbox = (bool) config('services.malia_pay.sandbox');
        \Log::info('MaliaPay: création du paiement', [
            'reference' => $data['reference'],
            'montant' => $data['montant'],
            'channel' => $data['channel'],
            'sandbox' => $sandbox,
        ]);

        // En sandbox : /v1/test simule le paiement sans jamais appeler un opérateur réel
        // (voir docs/setup/PAYMENT_INTEGRATION.md) — utilisé en local/staging uniquement.
        $endpoint = rtrim(config('services.malia_pay.api_url'), '/') . ($sandbox ? '/v1/test' : '/v1/payments');

        $response = Http::withHeaders(['X-API-Key' => config('services.malia_pay.api_key')])
            ->timeout(15)
            ->post($endpoint, $data);

        if ($response->failed()) {
            \Log::error('MaliaPay: erreur HTTP à la création du paiement', [
                'reference' => $data['reference'],
                'http_status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \Exception($response->json('message') ?? 'Impossible de créer le lien de paiement. Veuillez réessayer dans quelques instants.');
        }

        $body = $response->json() ?? [];
        $paymentLink = $body['link'] ?? null;
        $transactionId = $body['transaction_id'] ?? null;

        // En sandbox, l'API ne renvoie volontairement aucun lien réel (link: "", aucun
        // appel opérateur) — ce n'est pas une erreur, contrairement à un vrai paiement.
        if (!$paymentLink && !$sandbox) {
            \Log::error('MaliaPay: pas de lien de paiement dans la réponse', [
                'reference' => $data['reference'],
                'body' => $body,
            ]);
            throw new \Exception('Impossible d\'obtenir le lien de paiement. Veuillez réessayer.');
        }

        // Le transaction_id MaliaPay est indispensable pour interroger le statut plus tard
        // (filet de sécurité si le webhook n'arrive jamais — voir checkTransactionStatus()
        // et Console\Commands\FlagStuckPendingPayments), donc enregistré dès la création,
        // pas seulement à la confirmation par webhook.
        if ($transactionId) {
            $payment->update(['transaction_id' => $transactionId]);
        }

        \Log::info('MaliaPay: paiement créé', [
            'reference' => $data['reference'],
            'transaction_id' => $transactionId,
            'status' => $body['status'] ?? null,
        ]);

        return $paymentLink ?? '';
    }

    /**
     * Interroge MaliaPay pour connaître le statut réel d'une transaction — filet de
     * sécurité complémentaire au webhook (qui n'a aucune garantie de livraison, voir
     * découverte du 2026-09-01 : 30 paiements sur 31 restés "pending" faute de webhook).
     * Utilisée par Console\Commands\FlagStuckPendingPayments.
     *
     * @return array{status?: string, transaction_id?: string, montant?: int, channel?: string}|null
     *         null si l'appel échoue — à traiter comme "indisponible", jamais comme "cancelled".
     */
    public function checkTransactionStatus(string $transactionId): ?array
    {
        $endpoint = rtrim(config('services.malia_pay.api_url'), '/') . '/v1/payments/' . urlencode($transactionId);

        try {
            $response = Http::withHeaders(['X-API-Key' => config('services.malia_pay.api_key')])
                ->timeout(15)
                ->get($endpoint);
        } catch (\Throwable $e) {
            \Log::warning('MaliaPay: échec de la vérification de statut', [
                'transaction_id' => $transactionId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }

        if ($response->failed()) {
            \Log::warning('MaliaPay: statut non vérifiable', [
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
                $paymentLink = $this->createPaymentLink(
                    $payment, 
                    $payment->booking, 
                    $payment->user, 
                    $payment->payment_method
                );
                
                $payment->update([
                    'payment_data' => array_merge($payment->payment_data ?? [], [
                        'payment_link' => $paymentLink,
                    ])
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'error' => 'Erreur lors de la génération du lien de paiement: ' . $e->getMessage()
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
     * Authentifie un webhook entrant de Malia Pay via un secret partagé.
     * Accepte : un header/query/body contenant le secret, OU une signature HMAC-SHA256
     * du corps brut. Comparaisons à temps constant (hash_equals).
     * Si aucun secret n'est configuré, on accepte (rétrocompat) mais on journalise un avertissement.
     */
    private function verifyWebhookSignature(Request $request): bool
    {
        $secret = (string) config('services.malia_pay.webhook_secret', '');

        if ($secret === '') {
            \Log::warning('Webhook malia-pay non sécurisé : MALIA_PAY_WEBHOOK_SECRET non configuré.');
            return true; // rétrocompat tant que le client n'a pas fourni le secret
        }

        // 1) Secret partagé passé en clair (header, query ou body)
        $provided = $request->header('X-Webhook-Secret')
            ?? $request->header('X-Webhook-Token')
            ?? $request->header('X-Api-Key')
            ?? $request->input('secret')
            ?? $request->input('webhook_secret')
            ?? $request->query('token');

        if (is_string($provided) && hash_equals($secret, $provided)) {
            return true;
        }

        // 2) Signature HMAC-SHA256 du corps brut
        $signature = $request->header('X-Signature')
            ?? $request->header('X-Malia-Signature')
            ?? $request->header('Signature');

        if (is_string($signature) && $signature !== '') {
            $expected = hash_hmac('sha256', $request->getContent(), $secret);
            if (hash_equals($expected, $signature)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Webhook pour recevoir les notifications de paiement de malia-pay.com
     */
    public function webhook(Request $request)
    {
        // Authentification du webhook : rejette les appels forgés (paiement « réussi » falsifié).
        if (!$this->verifyWebhookSignature($request)) {
            \Log::warning('Webhook malia-pay: signature/secret invalide', [
                'ip' => $request->ip(),
            ]);
            return response()->json(['error' => 'Signature invalide'], 401);
        }

        $data = $request->all();

        $reference = $data['reference'] ?? null;
        $status = $data['status'] ?? null;
        $transactionId = $data['transactionID'] ?? $data['transaction_id'] ?? null;
        $montant = $data['montant'] ?? $data['amount'] ?? null;
        
        // S'assurer que le montant est un entier
        if ($montant !== null) {
            $montant = (int) round($montant);
        }

        if (!$reference || !$status) {
            \Log::warning('Webhook malia-pay: Référence ou statut manquant', $data);
            return response()->json(['error' => 'Référence ou statut manquant'], 400);
        }

        $payment = Payment::where('payment_reference', $reference)->first();

        if (!$payment) {
            \Log::warning('Webhook malia-pay: Paiement non trouvé', ['reference' => $reference]);
            return response()->json(['error' => 'Paiement non trouvé'], 404);
        }

        if ($status === 'Success' || $status === 'success' || $status === 'completed') {
            $result = $this->confirmPaymentSuccess($payment->id, $transactionId, $montant, $data, 'webhook');

            return response()->json([
                'message' => $result['already_completed'] ? 'Paiement déjà confirmé' : 'Paiement confirmé avec succès',
                'payment' => $result['payment'],
            ]);
        }

        // États intermédiaires MaliaPay (le client n'a pas fini l'opérateur, ou la
        // transaction est encore en cours de traitement) — ce n'est PAS un échec, ne
        // rien changer et attendre le prochain webhook (success/failed/cancelled).
        if ($status === 'pending' || $status === 'processing') {
            \Log::info('Webhook malia-pay: statut intermédiaire reçu, aucune action', [
                'payment_id' => $payment->id,
                'reference' => $payment->payment_reference,
                'status' => $status,
            ]);
            return response()->json([
                'message' => 'Statut intermédiaire pris en compte, en attente de confirmation',
                'payment' => $payment->load('booking'),
            ]);
        }

        return DB::transaction(function () use ($payment, $status, $data) {
            // Reverrouille dans la transaction : empêche un traitement concurrent si Malia Pay
            // rejoue le webhook en parallèle (retry réseau) avant que le premier appel n'ait fini.
            $payment = Payment::where('id', $payment->id)->lockForUpdate()->first();

            // Idempotence : un webhook déjà traité (rejeu) ne doit jamais redéclencher la
            // commission ni renvoyer une deuxième fois les notifications/e-mails de
            // confirmation — avant ce correctif, chaque rejeu créait un nouveau Message et
            // relançait les envois, sans aucune garde.
            if ($payment->status === 'completed') {
                \Log::info('Webhook malia-pay: paiement déjà confirmé, rejeu ignoré', [
                    'payment_id' => $payment->id,
                    'reference' => $payment->payment_reference,
                ]);
                return response()->json([
                    'message' => 'Paiement déjà confirmé',
                    'payment' => $payment->load('booking'),
                ]);
            }

            // Paiement échoué
            $payment->update([
                'status' => 'failed',
                'payment_data' => array_merge($payment->payment_data ?? [], [
                    'webhook_data' => $data,
                    'failed_at' => now()->toIso8601String(),
                ]),
            ]);

            $payment->booking->update([
                'payment_status' => 'failed'
            ]);

            \Log::warning('Webhook malia-pay: Paiement échoué', [
                'payment_id' => $payment->id,
                'reference' => $payment->payment_reference,
                'status' => $status
            ]);

            return response()->json([
                'message' => 'Paiement échoué',
                'payment' => $payment->load('booking')
            ], 400);
        });
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
            if ($booking->status === 'pending') {
                $booking->status = 'confirmed';
                if (empty($booking->confirmation_code)) {
                    $booking->confirmation_code = Booking::generateConfirmationCode();
                }
                if (empty($booking->booking_number)) {
                    $booking->booking_number = Booking::generateBookingNumber();
                }
            }
        }

        if ($payment->purpose === 'full') {
            $booking->payment_status = 'paid';
            $booking->expires_at = null;
            if ($booking->status === 'pending') {
                $booking->status = 'confirmed';
                if (empty($booking->confirmation_code)) {
                    $booking->confirmation_code = Booking::generateConfirmationCode();
                }
                if (empty($booking->booking_number)) {
                    $booking->booking_number = Booking::generateBookingNumber();
                }
            }
        } elseif ($payment->purpose === 'guarantee') {
            $booking->payment_status = 'guarantee_paid';
            $booking->expires_at = null;
        } elseif ($booking->amount_paid >= $booking->total_price) {
            $booking->payment_status = 'paid';
            $booking->expires_at = null;
            if ($booking->status === 'pending') {
                $booking->status = 'confirmed';
                if (empty($booking->confirmation_code)) {
                    $booking->confirmation_code = Booking::generateConfirmationCode();
                }
                if (empty($booking->booking_number)) {
                    $booking->booking_number = Booking::generateBookingNumber();
                }
            }
        } else {
            $booking->payment_status = 'pending';
        }

        $booking->save();

        return $booking;
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
            $bookingAmount = $booking->total_price;
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

        $bookingAmount = $booking->total_price;
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
            } catch (\Throwable $e) {
                Log::error('Booking confirmation email (client) failed after payment', [
                    'booking_id' => $booking->id,
                    'error'      => $e->getMessage(),
                ]);
            }
        }

        $hostEmail = $booking->accommodation?->host?->email;
        if ($hostEmail) {
            try {
                Mail::to($hostEmail)->send(new HostNewBooking($booking));
            } catch (\Throwable $e) {
                Log::error('Booking confirmation email (host) failed after payment', [
                    'booking_id' => $booking->id,
                    'error'      => $e->getMessage(),
                ]);
            }
        }

        // Confirmation par SMS (best-effort, en plus des emails)
        try {
            $sms = app(\App\Services\SmsService::class);
            $sms->sendBookingConfirmationToClient($booking);
            $sms->sendBookingNotificationToHost($booking);
        } catch (\Throwable $e) {
            Log::error('Booking confirmation SMS failed after payment', [
                'booking_id' => $booking->id,
                'error'      => $e->getMessage(),
            ]);
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

