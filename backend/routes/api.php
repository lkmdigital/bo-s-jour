<?php

use App\Http\Controllers\AccommodationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\RoomAvailabilityController;
use App\Http\Controllers\RoomPricePeriodController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\HostProfileController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\RevenueController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminHostController;
use App\Http\Controllers\Admin\AdminAccommodationController;
use App\Http\Controllers\Admin\AdminActivityLogController;
use App\Http\Controllers\Admin\AdminComplianceController;
use App\Http\Controllers\Admin\AdminAiController;
use App\Http\Controllers\Admin\AdminCorporateController;
use App\Http\Controllers\Admin\AdminLoyaltyController;
use App\Http\Controllers\Admin\AdminLegalDocumentController;
use App\Http\Controllers\Admin\AdminPaymentMethodController;
use App\Http\Controllers\Admin\AdminPromotionController;
use App\Http\Controllers\Admin\AdminStrategicController;
use App\Http\Controllers\Admin\AdminTourismController;
use App\Http\Controllers\Admin\AdminMarketingController;
use App\Http\Controllers\Admin\InspectionController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminBookingController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\TwoFactorController;
use App\Http\Controllers\OAuthController;
use App\Http\Controllers\ClientCreditController;
use App\Http\Controllers\CorporateController;
use App\Http\Controllers\HostStaffController;
use App\Http\Controllers\IcalSyncController;
use App\Http\Controllers\BookingWhatsappOtpController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\Host\HostReviewController;
use App\Http\Controllers\Host\HostInboxController;
use App\Http\Controllers\Host\HostCheckInController;
use App\Http\Controllers\Host\HostWithdrawalController;
use App\Http\Controllers\Host\HostClientController;
use App\Http\Controllers\Host\HostAiController;
use App\Http\Controllers\Host\HostAiContentController;
use App\Http\Controllers\Host\HostLoyaltyController;
use App\Http\Controllers\Admin\AdminWithdrawalController;
use App\Http\Controllers\BookingMessageController;
use App\Http\Controllers\UserInboxController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\LoyaltyController;
use App\Http\Controllers\TravelerAiController;
use App\Http\Controllers\MemberNotificationController;
use App\Http\Controllers\Admin\AdminReviewController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/accommodations', [AccommodationController::class, 'index']);
Route::get('/accommodations/top-cities', [AccommodationController::class, 'topCities']);
Route::get('/accommodations/suggestions', [AccommodationController::class, 'suggestions']);
Route::get('/accommodations/{id}', [AccommodationController::class, 'show'])->where('id', '[0-9]+');
Route::get('/accommodations/{id}/price-preview', [AccommodationController::class, 'pricePreview'])->where('id', '[0-9]+');
Route::get('/accommodations/{id}/similar', [AccommodationController::class, 'getSimilarByCity'])->where('id', '[0-9]+');
Route::get('/accommodations/{id}/reviews', [ReviewController::class, 'index'])->where('id', '[0-9]+');
Route::get('/reviews/booking-by-token/{token}', [ReviewController::class, 'getBookingByToken']);
Route::post('/reviews/submit-by-token', [ReviewController::class, 'submitByToken'])->middleware('throttle:5,1,review-token');
Route::get('/accommodations/{id}/promotions', [PromotionController::class, 'index'])->where('id', '[0-9]+');

// Public room routes (DOIT être avant le middleware auth:sanctum)
Route::get('/accommodations/{accommodationId}/rooms', [RoomController::class, 'indexPublic'])->where('accommodationId', '[0-9]+');
Route::get('/accommodations/{accommodationId}/rooms/{id}', [RoomController::class, 'showPublic'])->where(['accommodationId' => '[0-9]+', 'id' => '[0-9]+']);
Route::get('/rooms/{id}', [RoomController::class, 'showPublicById'])->where('id', '[0-9]+');

// Payment Methods (public - accessible sans authentification)
Route::get('/payment-methods', [PaymentMethodController::class, 'index']);

// Webhook pour les notifications de paiement (sans authentification)
Route::post('/payments/webhook', [PaymentController::class, 'webhook']);

// Paramètres publics (thème, maintenance, etc.)
Route::get('/settings/public', [SettingsController::class, 'publicSettings']);

// Documents juridiques publiés (CGV, CGU, politique de confidentialité)
Route::get('/legal/{slug}', [AdminLegalDocumentController::class, 'publicShow']);

// Booking creation (public - permet les réservations sans authentification)
Route::post('/bookings', [BookingController::class, 'store'])->middleware('throttle:10,1,booking-store'); // 10 réservations par minute

// Vérification du numéro WhatsApp pendant le tunnel de réservation (brief Étape 8)
Route::get('/booking/whatsapp-otp/status', [BookingWhatsappOtpController::class, 'status']);
Route::post('/booking/whatsapp-otp/send', [BookingWhatsappOtpController::class, 'send'])->middleware('throttle:8,1,booking-wa-otp-send');
Route::post('/booking/whatsapp-otp/verify', [BookingWhatsappOtpController::class, 'verify'])->middleware('throttle:10,1,booking-wa-otp-verify');

// Public booking routes (le contrôleur gère les permissions)
Route::get('/bookings/{id}', [BookingController::class, 'show']); // Peut être consultée sans authentification

// Payment initiation (public - permet le paiement sans authentification pour les réservations sans compte)
Route::post('/bookings/{bookingId}/payment/initiate', [PaymentController::class, 'initiate'])->middleware('throttle:15,1,payment-initiate'); // 15 tentatives par minute — un aller-retour passerelle qui échoue (timeout réseau, retour "Annulé") pousse à réessayer plusieurs fois de suite

// Payment processing (public - permet le traitement du paiement sans authentification)
Route::post('/payments/{paymentId}/process', [PaymentController::class, 'process'])->middleware('throttle:15,1,payment-process'); // idem : appelé en repli juste après /initiate, ne doit pas être le facteur limitant

// Payment details (public - permet de consulter un paiement sans authentification)
// Accessible sans authentification (réservations invité) avec un ID séquentiel énumérable —
// le throttle limite l'énumération en masse en attendant un identifiant non séquentiel dédié.
Route::get('/payments/{paymentId}', [PaymentController::class, 'show'])->middleware('throttle:20,1,payment-show');

// Auth routes avec rate limiting strict pour prévenir les attaques de force brute
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1,auth-register'); // 5 tentatives par minute
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1,auth-login'); // 10 tentatives par minute — reste très en dessous de ce qu'il faut pour du brute-force, mais laisse la marge d'une faute de frappe suivie d'un rechargement de page
Route::post('/auth/activate-guest', [AuthController::class, 'activateGuest'])->middleware('throttle:5,1,auth-activate-guest'); // activation compte invité
Route::get('/auth/staff-invitation', [AuthController::class, 'staffInvitationInfo'])->middleware('throttle:20,1,auth-staff-invitation'); // infos invitation collaborateur (menu Personnel)
Route::post('/auth/activate-staff', [AuthController::class, 'activateStaffInvitation'])->middleware('throttle:5,1,auth-activate-staff'); // activation collaborateur
Route::post('/auth/register-traveler', [AuthController::class, 'registerTraveler'])->middleware('throttle:10,1,auth-register-traveler'); // inscription voyageur (légère)
Route::post('/auth/register-partner-light', [AuthController::class, 'registerPartnerLight'])->middleware('throttle:10,1,auth-register-partner'); // inscription hôte (légère)
Route::get('/auth/guest-prefill', [AuthController::class, 'guestPrefill'])->middleware('throttle:20,1,auth-guest-prefill'); // préremplissage depuis compte invité existant

// Email OTP & Password Reset (public)
Route::post('/auth/send-otp', [AuthController::class, 'sendEmailOtp'])->middleware('throttle:6,1,auth-send-otp'); // laisse renvoyer le code 2-3 fois (mail en retard) sans se bloquer
Route::post('/auth/verify-otp', [AuthController::class, 'verifyEmailOtp'])->middleware('throttle:10,1,auth-verify-otp');
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1,auth-forgot-password');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

// OAuth routes
Route::get('/auth/{provider}/redirect', [OAuthController::class, 'redirect'])->where('provider', 'google|microsoft');
Route::get('/auth/{provider}/callback', [OAuthController::class, 'callback'])->where('provider', 'google|microsoft');

    // Route pour finaliser la connexion après 2FA (accessible avec token temporaire)
    // Throttle serré : sans lui, un code TOTP à 6 chiffres pourrait être attaqué par force brute
    // (voir audit sécurité 2026-08 — la cible était en plus mal vérifiée, corrigé séparément).
    Route::post('/login/complete-2fa', [AuthController::class, 'complete2FALogin'])->middleware(['auth:sanctum', 'throttle:10,1,auth-complete-2fa']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        // Profil voyageur (mise à jour + mot de passe + pièces d'identité)
        Route::put('/me/profile', [UserProfileController::class, 'update']);
        Route::post('/me/avatar', [UserProfileController::class, 'uploadAvatar'])->middleware('throttle:10,1,me-avatar');
        Route::delete('/me/avatar', [UserProfileController::class, 'deleteAvatar']);
        Route::post('/me/password', [UserProfileController::class, 'changePassword'])->middleware('throttle:10,1,me-password');
        Route::get('/me/identity', [UserProfileController::class, 'identity']);
        Route::post('/me/identity', [UserProfileController::class, 'uploadIdentity'])->middleware('throttle:10,1,me-identity');
        Route::get('/me/payments', [PaymentController::class, 'myPayments']);
        Route::get('/me/notifications', [MemberNotificationController::class, 'index']);
        Route::post('/me/notifications/{id}/read', [MemberNotificationController::class, 'markAsRead']);
        Route::post('/me/notifications/read-all', [MemberNotificationController::class, 'markAllAsRead']);

        // Module IA — Assistant conversationnel voyageur (doc "MODULE IA BOSÉJOUR" §3)
        // Désactivé le 2026-08-27 en attendant un échange avec le client sur la confidentialité
        // documentaire (Vague 7 du plan Module IA) — à réactiver après validation.
        // Route::post('/me/ai/ask', [TravelerAiController::class, 'ask'])->middleware('throttle:15,1,traveler-ai-ask');

        // Programme de fidélité (voyageur)
        Route::get('/me/loyalty', [LoyaltyController::class, 'show']);
        Route::get('/me/loyalty/history', [LoyaltyController::class, 'history']);
        Route::post('/me/loyalty/claim-voucher', [LoyaltyController::class, 'claimVoucher']);

        // Notifications push (OneSignal)
        Route::post('/notifications/trigger', [NotificationController::class, 'trigger']);

        // Routes 2FA
        Route::prefix('two-factor')->group(function () {
            Route::get('/status', [TwoFactorController::class, 'status']);
            Route::post('/setup', [TwoFactorController::class, 'setup']);
            Route::post('/enable', [TwoFactorController::class, 'enable']);
            Route::post('/disable', [TwoFactorController::class, 'disable']);
            Route::post('/regenerate-recovery-codes', [TwoFactorController::class, 'regenerateRecoveryCodes']);
        });

        // OAuth link (lier un compte OAuth à un compte existant)
        Route::post('/auth/{provider}/link', [OAuthController::class, 'link'])->where('provider', 'google|microsoft');

        // Endpoints pour vérification RBAC (utilisés par NestJS)
        Route::get('/users/{id}/check-role/{role}', [AuthController::class, 'checkRole'])->where('id', '[0-9]+');
        Route::get('/users/{id}/check-permission/{permission}', [AuthController::class, 'checkPermission'])->where('id', '[0-9]+');
        Route::get('/users/{id}/roles', [AuthController::class, 'getUserRoles'])->where('id', '[0-9]+');
        Route::get('/users/{id}/permissions', [AuthController::class, 'getUserPermissions'])->where('id', '[0-9]+');

        // Accommodations (Host) - Must be before routes with {id} parameter
        //
        // Middleware hoststaff:<permission> (2026-08-31) : jusqu'ici, seules les cases à
        // cocher HostStaff::PERMISSIONS filtraient l'affichage du menu côté frontend
        // (HostSidebar.tsx) — un collaborateur invité pour un seul poste pouvait appeler
        // n'importe quel endpoint host directement via l'API. Chaque groupe ci-dessous est
        // maintenant gardé par la permission correspondant EXACTEMENT au mapping déjà utilisé
        // par HostSidebar.tsx (NAV_ITEM_PERMISSION) — le propriétaire (non-staff) passe
        // toujours, quelle que soit la permission demandée (voir EnsureHostStaffPermission).
        Route::middleware('role:host')->group(function () {
            // Host Profile — réservé au propriétaire (coordonnées bancaires + documents de
            // conformité), aucune permission staff ne couvre ce module (voir HostProfileController).
            Route::get('/host/profile', [HostProfileController::class, 'show']);
            Route::post('/host/profile', [HostProfileController::class, 'update']); // POST pour FormData
            Route::post('/host/profile/email/request-change', [HostProfileController::class, 'requestEmailChange']);
            Route::post('/host/profile/email/confirm-change', [HostProfileController::class, 'confirmEmailChange']);

            // Établissements — permission 'property'
            Route::middleware('hoststaff:property')->group(function () {
                Route::get('/accommodations/my', [AccommodationController::class, 'myAccommodations'])->name('accommodations.my');
                Route::post('/accommodations', [AccommodationController::class, 'store']);
                Route::post('/accommodations/{id}/media', [AccommodationController::class, 'uploadMedia'])->where('id', '[0-9]+');
                Route::delete('/accommodations/{accommodationId}/media/{imageId}', [AccommodationController::class, 'deleteMedia'])
                    ->where(['accommodationId' => '[0-9]+', 'imageId' => '[0-9]+']);
                Route::post('/accommodations/{accommodationId}/media/{imageId}/primary', [AccommodationController::class, 'setPrimaryMedia'])
                    ->where(['accommodationId' => '[0-9]+', 'imageId' => '[0-9]+']);
                Route::post('/accommodations/{id}/appointments', [AppointmentController::class, 'store'])->where('id', '[0-9]+');
                Route::put('/accommodations/{id}', [AccommodationController::class, 'update'])->where('id', '[0-9]+');
                Route::delete('/accommodations/{id}', [AccommodationController::class, 'destroy'])->where('id', '[0-9]+');
                Route::get('/accommodations/{id}/readiness', [AccommodationController::class, 'readiness'])->where('id', '[0-9]+');
                Route::post('/accommodations/{id}/submit-for-review', [AccommodationController::class, 'submitForReview'])->where('id', '[0-9]+');

                // Synchronisation externe (iCal) — brief Extranet Partenaire, Étape 18
                Route::get('/accommodations/{id}/ical', [IcalSyncController::class, 'show'])->where('id', '[0-9]+');
                Route::post('/accommodations/{id}/ical/sync', [IcalSyncController::class, 'sync'])->where('id', '[0-9]+')->middleware('throttle:10,1,ical-sync');
                Route::post('/accommodations/{id}/ical/resync', [IcalSyncController::class, 'resync'])->where('id', '[0-9]+')->middleware('throttle:10,1,ical-resync');
                Route::delete('/accommodations/{id}/ical', [IcalSyncController::class, 'disconnect'])->where('id', '[0-9]+');
                Route::post('/accommodations/{id}/channel-manager/interest', [IcalSyncController::class, 'requestChannelManagerAccess'])->where('id', '[0-9]+')->middleware('throttle:5,1,channel-manager-interest');
            });

            // Chambres et tarifs — permission 'rooms'
            Route::middleware('hoststaff:rooms')->group(function () {
                // Chemin distinct de /accommodations/{id}/rooms (public, cf. ligne ~53) pour éviter
                // que Laravel n'écrase la route publique — deux Route::get() sur la même URI+méthode
                // se remplacent silencieusement, seule la dernière déclarée reste joignable.
                Route::get('/accommodations/{accommodationId}/rooms/manage', [RoomController::class, 'index']);
                Route::get('/accommodations/{accommodationId}/rooms/manage/{id}', [RoomController::class, 'show']);
                Route::post('/accommodations/{accommodationId}/rooms', [RoomController::class, 'store']);
                Route::put('/accommodations/{accommodationId}/rooms/{id}', [RoomController::class, 'update']);
                Route::delete('/accommodations/{accommodationId}/rooms/{id}', [RoomController::class, 'destroy']);

                // Room Images
                Route::post('/accommodations/{accommodationId}/rooms/{roomId}/images', [RoomController::class, 'uploadImage']);
                Route::delete('/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}', [RoomController::class, 'deleteImage']);
                Route::post('/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}/primary', [RoomController::class, 'setPrimaryImage']);
                Route::post('/accommodations/{accommodationId}/rooms/{roomId}/images/reorder', [RoomController::class, 'reorderImages']);

                // Room Price Periods (tarification par période / saisonnière)
                Route::get('/accommodations/{accommodationId}/rooms/{roomId}/price-periods', [RoomPricePeriodController::class, 'index']);
                Route::post('/accommodations/{accommodationId}/rooms/{roomId}/price-periods', [RoomPricePeriodController::class, 'store']);
                Route::put('/accommodations/{accommodationId}/rooms/{roomId}/price-periods/{id}', [RoomPricePeriodController::class, 'update']);
                Route::delete('/accommodations/{accommodationId}/rooms/{roomId}/price-periods/{id}', [RoomPricePeriodController::class, 'destroy']);
            });

            // Calendrier — permission 'calendar'
            Route::middleware('hoststaff:calendar')->group(function () {
                Route::get('/accommodations/{accommodationId}/rooms/{roomId}/availability', [RoomAvailabilityController::class, 'index']);
                Route::get('/accommodations/{accommodationId}/rooms/{roomId}/calendar', [RoomAvailabilityController::class, 'getCalendar']);
                Route::post('/accommodations/{accommodationId}/rooms/{roomId}/availability', [RoomAvailabilityController::class, 'store']);
                Route::post('/accommodations/{accommodationId}/rooms/{roomId}/availability/bulk', [RoomAvailabilityController::class, 'bulkUpdate']);
                Route::put('/accommodations/{accommodationId}/rooms/{roomId}/availability/{id}', [RoomAvailabilityController::class, 'update']);
                Route::delete('/accommodations/{accommodationId}/rooms/{roomId}/availability/{id}', [RoomAvailabilityController::class, 'destroy']);
            });

            // Promotions — permission 'promotions'
            Route::middleware('hoststaff:promotions')->group(function () {
                Route::get('/accommodations/{accommodationId}/promotions', [PromotionController::class, 'index']);
                Route::post('/accommodations/{accommodationId}/promotions', [PromotionController::class, 'store']);
                Route::put('/accommodations/{accommodationId}/promotions/{promotionId}', [PromotionController::class, 'update']);
                Route::delete('/accommodations/{accommodationId}/promotions/{promotionId}', [PromotionController::class, 'destroy']);
                Route::post('/accommodations/{accommodationId}/promotions/{promotionId}/toggle', [PromotionController::class, 'toggle']);
                Route::get('/accommodations/{accommodationId}/promotions/{promotionId}/stats', [PromotionController::class, 'stats']);
            });

            // Avis reçus — permission 'reviews'
            Route::middleware('hoststaff:reviews')->group(function () {
                Route::get('/host/reviews', [HostReviewController::class, 'index']);
                Route::patch('/host/reviews/{id}/reply', [HostReviewController::class, 'reply'])->where('id', '[0-9]+');
            });

            // Clients (voyageurs ayant réservé chez l'hôte) — permission 'clients'
            Route::middleware('hoststaff:clients')->group(function () {
                Route::get('/host/clients', [HostClientController::class, 'index']);
            });

            // Suivi du Programme de fidélité (établissement participant) — permission 'stats'
            // (même mapping que /dashboard/host/programme côté frontend, voir HostSidebar.tsx)
            Route::middleware('hoststaff:stats')->group(function () {
                Route::get('/host/loyalty/stats', [HostLoyaltyController::class, 'stats']);
            });

            // Module IA — Assistant conversationnel partenaire (doc "MODULE IA BOSÉJOUR" §2.1)
            // Module IA — Génération de contenu partenaire (doc "MODULE IA BOSÉJOUR" §2.2-2.4, §2.10 partiel)
            // Désactivés le 2026-08-27 en attendant un échange avec le client sur la confidentialité
            // documentaire (Vague 7 du plan Module IA) — à réactiver après validation.
            // Route::post('/host/ai/ask', [HostAiController::class, 'ask'])->middleware('throttle:15,1,host-ai-ask');
            // Route::prefix('host/ai/content')->middleware('throttle:15,1,host-ai-content')->group(function () {
            //     Route::post('/accommodation-description', [HostAiContentController::class, 'accommodationDescription']);
            //     Route::post('/room-description', [HostAiContentController::class, 'roomDescription']);
            //     Route::post('/translate', [HostAiContentController::class, 'translate']);
            //     Route::post('/seo-suggestions', [HostAiContentController::class, 'seoSuggestions']);
            //     Route::post('/review-reply', [HostAiContentController::class, 'reviewReply']);
            // });

            // Boîte de réception (messages plateforme et voyageurs) — aucune permission dédiée
            // dans HostStaff::PERMISSIONS ni dans HostSidebar.tsx : accessible à tout collaborateur,
            // par conception (communication avec les voyageurs, pas un module sensible).
            Route::get('/host/inbox', [HostInboxController::class, 'index']);
            Route::post('/host/inbox', [HostInboxController::class, 'reply']);
            Route::patch('/host/inbox/{id}/read', [HostInboxController::class, 'markRead'])->where('id', '[0-9]+');

            // Check-in client (code réservation → début du séjour, commission released) — permission 'reservations'
            Route::middleware('hoststaff:reservations')->group(function () {
                Route::post('/host/check-in', [HostCheckInController::class, 'store']);
            });

            // Demandes de retrait — réservé au propriétaire, voir HostWithdrawalController::assertOwnerOnly()
            Route::get('/host/withdrawal-requests/balance', [HostWithdrawalController::class, 'availableBalance']);
            Route::get('/host/withdrawal-requests', [HostWithdrawalController::class, 'index']);
            Route::post('/host/withdrawal-requests', [HostWithdrawalController::class, 'store']);

            // Personnel (collaborateurs : réceptionniste, comptabilité, commercial, housekeeping, maintenance)
            // — déjà sécurisé indépendamment dans HostStaffController::assertCanManageStaff()
            // (réservé au propriétaire ou à un collaborateur staff_role==='administrateur',
            // une règle plus stricte que la simple case à cocher 'staff').
            Route::get('/host/staff', [HostStaffController::class, 'index']);
            Route::post('/host/staff', [HostStaffController::class, 'store'])->middleware('throttle:20,1,host-staff-invite');
            Route::put('/host/staff/{staffMember}', [HostStaffController::class, 'update']);
            Route::delete('/host/staff/{staffMember}', [HostStaffController::class, 'destroy']);
        });

    // Bookings protégées (nécessitent authentification)
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/host/overview', [BookingController::class, 'hostReservations'])->middleware(['role:host', 'hoststaff:reservations']);
    Route::put('/bookings/{id}', [BookingController::class, 'update']);
    Route::post('/bookings/{booking}/cancel', [BookingController::class, 'cancel'])->middleware('throttle:5,1,booking-cancel');
    Route::post('/bookings/{booking}/refuse', [BookingController::class, 'refuse'])->middleware(['role:host,admin', 'throttle:10,1,booking-refuse']);
    Route::post('/bookings/{booking}/complete', [BookingController::class, 'complete'])->middleware('role:host,admin');
    Route::get('/bookings/{booking}/history', [BookingController::class, 'history']);
    Route::get('/bookings/{id}/messages', [BookingMessageController::class, 'index'])->where('id', '[0-9]+');
    Route::post('/bookings/{id}/messages', [BookingMessageController::class, 'store'])->where('id', '[0-9]+');

    // Boîte de réception voyageur
    Route::get('/user/inbox', [UserInboxController::class, 'index']);
    Route::get('/user/inbox/unread-count', [UserInboxController::class, 'unreadCount']);

    // Avoirs client (espace client)
    Route::get('/credits', [ClientCreditController::class, 'index']);
    Route::get('/credits/balance', [ClientCreditController::class, 'balance']);

    // Espace "Mon entreprise" du voyageur Corporate (brief Étapes 21-22)
    Route::prefix('me/corporate')->group(function () {
        Route::get('/overview', [CorporateController::class, 'overview']);
        Route::get('/loyalty', [CorporateController::class, 'loyalty']);
        Route::get('/expenses', [CorporateController::class, 'expenses']);
        Route::get('/expenses/export', [CorporateController::class, 'exportExpensesCsv']);
        Route::post('/collaborators', [CorporateController::class, 'inviteCollaborator'])->middleware('throttle:20,1,corporate-collaborator-invite');
        Route::put('/collaborators/{collaborator}', [CorporateController::class, 'updateCollaborator']);
        Route::delete('/collaborators/{collaborator}', [CorporateController::class, 'removeCollaborator']);
    });

    // Favoris (espace client)
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::get('/favorites/ids', [FavoriteController::class, 'ids']);
    Route::post('/favorites', [FavoriteController::class, 'store'])->middleware('throttle:60,1,favorites-store');
    Route::delete('/favorites/{accommodationId}', [FavoriteController::class, 'destroy'])->where('accommodationId', '[0-9]+');

    // Payment Methods (détails nécessitent authentification)
    Route::get('/payment-methods/{id}', [PaymentMethodController::class, 'show']);

    // Réservations (vue globale admin, tous établissements confondus)
    Route::get('/admin/bookings', [AdminBookingController::class, 'index'])->middleware('role:admin');
    Route::get('/admin/bookings/cities', [AdminBookingController::class, 'cities'])->middleware('role:admin');
    Route::get('/admin/bookings/{id}', [AdminBookingController::class, 'show'])->middleware('role:admin')->where('id', '[0-9]+');

    // Revenue
    Route::get('/revenue/admin', [RevenueController::class, 'adminRevenue'])->middleware('role:admin');
    Route::get('/revenue/admin/export', [RevenueController::class, 'exportCommissionsCsv'])->middleware('role:admin');
    Route::get('/revenue/host', [RevenueController::class, 'hostRevenue'])->middleware(['role:host', 'hoststaff:finances']);
    Route::get('/revenue/commission-rate', [RevenueController::class, 'getCommissionRate']);
    Route::put('/revenue/commission-rate', [RevenueController::class, 'updateCommissionRate'])->middleware('role:admin');
    Route::post('/revenue/commissions/mark-paid', [RevenueController::class, 'markCommissionsPaid'])->middleware('role:admin');

    // Reviews
    Route::get('/me/reviews', [ReviewController::class, 'myReviews']);
    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::post('/reviews/{id}/report', [ReviewController::class, 'report'])->where('id', '[0-9]+');

    // Subscriptions
    Route::get('/subscriptions', [SubscriptionController::class, 'index']);
    Route::get('/subscriptions/my', [SubscriptionController::class, 'mySubscriptions']);
    Route::post('/subscriptions', [SubscriptionController::class, 'store']);
    Route::get('/subscriptions/{id}', [SubscriptionController::class, 'show']);
    Route::put('/subscriptions/{id}', [SubscriptionController::class, 'update']);
    Route::post('/subscriptions/{id}/cancel', [SubscriptionController::class, 'cancel']);

    // Paramètres globaux (admin)
    Route::get('/settings/admin', [SettingsController::class, 'getAdminSettings'])->middleware('role:admin');
    Route::put('/settings/admin', [SettingsController::class, 'updateAdminSettings'])->middleware('role:admin');

    // Analytics
    Route::prefix('analytics')->group(function () {
        // More specific routes first
        Route::get('/host/accommodation/{id}', [AnalyticsController::class, 'accommodationStats'])->middleware(['role:host', 'hoststaff:stats'])->where('id', '[0-9]+');
        Route::get('/host', [AnalyticsController::class, 'hostDashboard'])->middleware(['role:host', 'hoststaff:stats']);
        Route::get('/admin', [AnalyticsController::class, 'adminDashboard'])->middleware('role:admin');
        Route::get('/traveler', [AnalyticsController::class, 'travelerDashboard'])->middleware('role:user');
    });

    // Admin routes - Nouveau système RBAC
    Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
        // Paramètres > Conditions générales de vente / Juridique
        Route::get('/legal-documents', [AdminLegalDocumentController::class, 'index'])->middleware('role:admin');
        Route::put('/legal-documents/{slug}', [AdminLegalDocumentController::class, 'update'])->middleware('role:admin');

        // Paramètres > Facturation (moyens de paiement)
        Route::get('/payment-methods', [AdminPaymentMethodController::class, 'index'])->middleware('role:admin');
        Route::put('/payment-methods/{id}', [AdminPaymentMethodController::class, 'update'])->middleware('role:admin')->where('id', '[0-9]+');

        // Promotions (supervision admin des offres créées par les établissements)
        Route::get('/promotions', [AdminPromotionController::class, 'index'])->middleware('role:admin');
        Route::post('/promotions/{id}/toggle', [AdminPromotionController::class, 'toggle'])->middleware('role:admin')->where('id', '[0-9]+');

        // Tableau stratégique (vue exécutive)
        Route::prefix('strategic')->middleware('role:admin')->group(function () {
            Route::get('/rankings', [AdminStrategicController::class, 'rankings']);
            Route::get('/forecast', [AdminStrategicController::class, 'forecast']);
            Route::get('/alerts', [AdminStrategicController::class, 'alerts']);
            Route::get('/geography', [AdminStrategicController::class, 'geography']);
        });

        // Base touristique (cartographie + statistiques plateforme)
        Route::prefix('tourism')->middleware('role:admin')->group(function () {
            Route::get('/map', [AdminTourismController::class, 'map']);
            Route::get('/stats', [AdminTourismController::class, 'stats']);
        });

        // Commercialisation (campagnes marketing segmentées)
        Route::prefix('marketing')->middleware('role:admin')->group(function () {
            Route::get('/campaigns', [AdminMarketingController::class, 'index']);
            Route::post('/campaigns', [AdminMarketingController::class, 'store']);
            Route::get('/segment-preview', [AdminMarketingController::class, 'previewSegment']);
            Route::get('/cities', [AdminMarketingController::class, 'cities']);
        });

        // Journal d'activité (fusion UserActivityLog + AccommodationAuditLog)
        Route::get('/activity-log', [AdminActivityLogController::class, 'index'])->middleware('role:admin');
        Route::get('/activity-log/actions', [AdminActivityLogController::class, 'actions'])->middleware('role:admin');

        // Conformité documentaire des hôtes
        Route::get('/compliance', [AdminComplianceController::class, 'index'])->middleware('role:admin');

        // Programme de fidélité (admin)
        Route::prefix('loyalty')->middleware('role:admin')->group(function () {
            Route::get('/stats', [AdminLoyaltyController::class, 'stats']);
            Route::get('/tiers', [AdminLoyaltyController::class, 'tiers']);
            Route::post('/tiers', [AdminLoyaltyController::class, 'storeTier']);
            Route::put('/tiers/{id}', [AdminLoyaltyController::class, 'updateTier'])->where('id', '[0-9]+');
            Route::get('/reward-tiers', [AdminLoyaltyController::class, 'rewardTiers']);
            Route::post('/reward-tiers', [AdminLoyaltyController::class, 'storeRewardTier']);
            Route::put('/reward-tiers/{id}', [AdminLoyaltyController::class, 'updateRewardTier'])->where('id', '[0-9]+');
            Route::get('/campaigns', [AdminLoyaltyController::class, 'campaigns']);
            Route::post('/campaigns', [AdminLoyaltyController::class, 'storeCampaign']);
            Route::put('/campaigns/{id}', [AdminLoyaltyController::class, 'updateCampaign'])->where('id', '[0-9]+');
            Route::get('/vouchers', [AdminLoyaltyController::class, 'vouchers']);
            Route::get('/establishments', [AdminLoyaltyController::class, 'establishments']);
        });

        // Programme Corporate (admin) — paliers de CA annuel et récompenses figées
        Route::prefix('corporate')->middleware('role:admin')->group(function () {
            Route::get('/reward-tiers', [AdminCorporateController::class, 'rewardTiers']);
            Route::post('/reward-tiers', [AdminCorporateController::class, 'storeRewardTier']);
            Route::put('/reward-tiers/{id}', [AdminCorporateController::class, 'updateRewardTier'])->where('id', '[0-9]+');
            Route::get('/annual-rewards', [AdminCorporateController::class, 'annualRewards']);
        });

        // Module IA — Assistant conversationnel admin (doc "MODULE IA BOSÉJOUR" §1.1)
        // Désactivé le 2026-08-27 en attendant un échange avec le client sur la confidentialité
        // documentaire (Vague 7 du plan Module IA) — à réactiver après validation.
        // Route::post('/ai/ask', [AdminAiController::class, 'ask'])
        //     ->middleware(['role:admin', 'throttle:15,1,admin-ai-ask']);

        // Dashboard & Analytics
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/daily-activity', [AdminDashboardController::class, 'dailyActivity'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/host-performance', [AdminDashboardController::class, 'hostPerformance'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/accommodation-status', [AdminDashboardController::class, 'accommodationStatusDistribution'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/bookings-by-region', [AdminDashboardController::class, 'bookingsByRegion'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/top-accommodations', [AdminDashboardController::class, 'topAccommodations'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/monthly-revenue-trend', [AdminDashboardController::class, 'monthlyRevenueTrend'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/occupancy-trend', [AdminDashboardController::class, 'occupancyTrend'])
            ->middleware('permission:admin.dashboard.read');

        // Gestion des utilisateurs
        Route::prefix('users')->group(function () {
            Route::get('/', [AdminUserController::class, 'index'])->middleware('permission:users.read');
            Route::get('/roles', [AdminUserController::class, 'roles'])->middleware('permission:users.read');
            Route::get('/hosts', [AdminUserController::class, 'hosts'])->middleware('permission:users.read');
            Route::post('/', [AdminUserController::class, 'store'])->middleware('permission:users.create');
            Route::get('/{id}', [AdminUserController::class, 'show'])->middleware('permission:users.read');
            Route::put('/{id}', [AdminUserController::class, 'update'])->middleware('permission:users.update');
            Route::post('/{id}/block', [AdminUserController::class, 'block'])->middleware('permission:users.block');
            Route::post('/{id}/unblock', [AdminUserController::class, 'unblock'])->middleware('permission:users.unblock');
            Route::post('/{id}/roles', [AdminUserController::class, 'assignRoles'])->middleware('permission:users.manage_roles');
            Route::get('/{id}/activity-logs', [AdminUserController::class, 'activityLogs'])->middleware('permission:users.read');
            Route::post('/{id}/reset-password', [AdminUserController::class, 'resetPassword'])->middleware('permission:users.update');
            Route::delete('/{id}', [AdminUserController::class, 'destroy'])->middleware('permission:users.delete');
        });

        // Gestion des hôtes
        Route::prefix('hosts')->group(function () {
            Route::get('/', [AdminHostController::class, 'index'])->middleware('permission:hosts.read');
            Route::get('/{id}', [AdminHostController::class, 'show'])->middleware('permission:hosts.read');
            Route::post('/{id}/validate', [AdminHostController::class, 'validate'])->middleware('permission:hosts.validate');
            Route::post('/{id}/reject', [AdminHostController::class, 'reject'])->middleware('permission:hosts.reject');
            Route::post('/{id}/suspend', [AdminHostController::class, 'suspend'])->middleware('permission:hosts.suspend');
            Route::post('/{id}/remove-status', [AdminHostController::class, 'removeHostStatus'])->middleware('permission:hosts.remove_status');
            Route::post('/{id}/notes', [AdminHostController::class, 'addNote'])->middleware('permission:hosts.read');
            Route::get('/{id}/accommodations', [AdminHostController::class, 'accommodations'])->middleware('permission:hosts.read');
        });

        // Gestion des établissements
        Route::prefix('accommodations')->group(function () {
            Route::get('/', [AdminAccommodationController::class, 'index'])->middleware('permission:accommodations.read');
            Route::post('/', [AdminAccommodationController::class, 'store'])->middleware('permission:accommodations.create');
            Route::get('/cities', [AdminAccommodationController::class, 'cities'])->middleware('permission:accommodations.read');
            Route::get('/{id}', [AdminAccommodationController::class, 'show'])->middleware('permission:accommodations.read')->where('id', '[0-9]+');
            Route::post('/{id}/approve', [AdminAccommodationController::class, 'approve'])->middleware('permission:accommodations.approve');
            Route::post('/{id}/reject', [AdminAccommodationController::class, 'reject'])->middleware('permission:accommodations.reject');
            Route::post('/{id}/remove', [AdminAccommodationController::class, 'remove'])->middleware('permission:accommodations.remove');
            Route::post('/{id}/disable', [AdminAccommodationController::class, 'disable'])->middleware('permission:accommodations.disable');
            Route::post('/{id}/enable', [AdminAccommodationController::class, 'enable'])->middleware('permission:accommodations.update');
            Route::post('/{id}/toggle-featured', [AdminAccommodationController::class, 'toggleFeatured'])->middleware('permission:accommodations.update');
            Route::post('/{id}/media', [AccommodationController::class, 'uploadMedia'])->middleware('permission:accommodations.update');
            Route::delete('/{id}/media/{imageId}', [AccommodationController::class, 'deleteMedia'])
                ->middleware('permission:accommodations.update')
                ->where(['id' => '[0-9]+', 'imageId' => '[0-9]+']);
            Route::post('/{id}/media/{imageId}/primary', [AccommodationController::class, 'setPrimaryMedia'])
                ->middleware('permission:accommodations.update')
                ->where(['id' => '[0-9]+', 'imageId' => '[0-9]+']);
            Route::post('/{id}/notes', [AdminAccommodationController::class, 'addNote'])->middleware('permission:accommodations.read');
            Route::get('/{id}/audit-logs', [AdminAccommodationController::class, 'auditLogs'])->middleware('permission:accommodations.read');
            
            // Gestion des chambres par l'admin
            Route::prefix('{accommodationId}/rooms')->group(function () {
                Route::get('/', [RoomController::class, 'index'])->middleware('permission:accommodations.read');
                Route::get('/{id}', [RoomController::class, 'show'])->middleware('permission:accommodations.read');
                Route::post('/', [RoomController::class, 'store'])->middleware('permission:accommodations.update');
                Route::put('/{id}', [RoomController::class, 'update'])->middleware('permission:accommodations.update');
                Route::delete('/{id}', [RoomController::class, 'destroy'])->middleware('permission:accommodations.update');
                Route::post('/{roomId}/images', [RoomController::class, 'uploadImage'])->middleware('permission:accommodations.update');
                Route::delete('/{roomId}/images/{imageId}', [RoomController::class, 'deleteImage'])->middleware('permission:accommodations.update');
                Route::post('/{roomId}/images/{imageId}/primary', [RoomController::class, 'setPrimaryImage'])->middleware('permission:accommodations.update');
                Route::post('/{roomId}/toggle-status', [RoomController::class, 'toggleStatus'])->middleware('permission:accommodations.update');
            })->where(['accommodationId' => '[0-9]+', 'id' => '[0-9]+', 'roomId' => '[0-9]+', 'imageId' => '[0-9]+']);
        });

        // Inspections (Contrôleurs)
        Route::prefix('inspections')->group(function () {
            Route::get('/', [InspectionController::class, 'index'])->middleware('permission:inspections.read');
            Route::post('/', [InspectionController::class, 'store'])->middleware('permission:inspections.create');
            Route::get('/accommodations', [InspectionController::class, 'accommodations'])->middleware('auth:sanctum');
            Route::get('/{id}', [InspectionController::class, 'show'])->middleware('permission:inspections.read');
            Route::get('/{id}/checklist', [InspectionController::class, 'generateChecklist'])->middleware('permission:inspections.read');
            Route::post('/{id}/start', [InspectionController::class, 'start'])->middleware('permission:inspections.update');
            Route::post('/{id}/pause', [InspectionController::class, 'pause'])->middleware('permission:inspections.update');
            Route::post('/{id}/responses', [InspectionController::class, 'addResponse'])->middleware('permission:inspections.update');
            Route::post('/{id}/complete', [InspectionController::class, 'complete'])->middleware('permission:inspections.complete');
            Route::post('/{id}/approve', [InspectionController::class, 'approve'])->middleware('permission:inspections.approve');
            Route::post('/{id}/reject', [InspectionController::class, 'reject'])->middleware('permission:inspections.reject');
            Route::get('/checklists/list', [InspectionController::class, 'checklists'])->middleware('permission:inspections.read');
        });

        // Demandes de retrait (admin)
        Route::prefix('withdrawal-requests')->middleware('role:admin')->group(function () {
            Route::get('/', [AdminWithdrawalController::class, 'index']);
            Route::get('/export', [AdminWithdrawalController::class, 'exportCsv']);
            Route::post('/', [AdminWithdrawalController::class, 'store']);
            Route::post('/{id}/approve', [AdminWithdrawalController::class, 'approve'])->where('id', '[0-9]+');
            Route::post('/{id}/reject', [AdminWithdrawalController::class, 'reject'])->where('id', '[0-9]+');
        });

        // Transactions / paiements voyageurs (admin)
        Route::prefix('payments')->middleware('role:admin')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\AdminPaymentController::class, 'index']);
            Route::get('/export', [\App\Http\Controllers\Admin\AdminPaymentController::class, 'exportCsv']);
            Route::get('/credits', [\App\Http\Controllers\Admin\AdminPaymentController::class, 'credits']);
            Route::get('/credits/export', [\App\Http\Controllers\Admin\AdminPaymentController::class, 'exportCreditsCsv']);
            // Filet de sécurité webhook Malia Pay : liste des paiements "pending" restés
            // bloqués trop longtemps (probable webhook jamais reçu), et confirmation
            // manuelle après vérification par l'admin dans le dashboard marchand Malia Pay.
            Route::get('/stuck', [\App\Http\Controllers\Admin\AdminPaymentController::class, 'stuckPending']);
            Route::post('/{paymentId}/confirm-manually', [\App\Http\Controllers\Admin\AdminPaymentController::class, 'confirmManually'])->where('paymentId', '[0-9]+');
        });

        // Modération des avis (admin)
        Route::prefix('reviews')->middleware('role:admin')->group(function () {
            Route::get('/', [AdminReviewController::class, 'index']);
            Route::post('/{id}/moderate', [AdminReviewController::class, 'moderate'])->where('id', '[0-9]+');
        });

        // Routes legacy (rétrocompatibilité) - Désactivées car remplacées par les nouvelles routes RBAC
        // Route::middleware('role:admin')->group(function () {
        //     Route::get('/dashboard', [AdminController::class, 'dashboard']);
        //     Route::get('/accommodations', [AdminController::class, 'accommodations']);
        //     Route::put('/accommodations/{id}/approve', [AdminController::class, 'approveAccommodation'])->where('id', '[0-9]+');
        //     Route::put('/accommodations/{id}/reject', [AdminController::class, 'rejectAccommodation'])->where('id', '[0-9]+');
        //     Route::get('/users', [AdminController::class, 'users']);
        //     Route::get('/appointments', [\App\Http\Controllers\AppointmentController::class, 'index']);
        // });
    });
});

