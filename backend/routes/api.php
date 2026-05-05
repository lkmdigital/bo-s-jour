<?php

use App\Http\Controllers\AccommodationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\RoomAvailabilityController;
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
use App\Http\Controllers\Admin\InspectionController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\TwoFactorController;
use App\Http\Controllers\OAuthController;
use App\Http\Controllers\ClientCreditController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\Host\HostReviewController;
use App\Http\Controllers\Host\HostInboxController;
use App\Http\Controllers\Host\HostCheckInController;
use App\Http\Controllers\Host\HostWithdrawalController;
use App\Http\Controllers\Admin\AdminWithdrawalController;
use App\Http\Controllers\BookingMessageController;
use App\Http\Controllers\UserInboxController;
use App\Http\Controllers\Admin\AdminReviewController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/accommodations', [AccommodationController::class, 'index']);
Route::get('/accommodations/suggestions', [AccommodationController::class, 'suggestions']);
Route::get('/accommodations/{id}', [AccommodationController::class, 'show'])->where('id', '[0-9]+');
Route::get('/accommodations/{id}/price-preview', [AccommodationController::class, 'pricePreview'])->where('id', '[0-9]+');
Route::get('/accommodations/{id}/similar', [AccommodationController::class, 'getSimilarByCity'])->where('id', '[0-9]+');
Route::get('/accommodations/{id}/reviews', [ReviewController::class, 'index'])->where('id', '[0-9]+');
Route::get('/reviews/booking-by-token/{token}', [ReviewController::class, 'getBookingByToken']);
Route::post('/reviews/submit-by-token', [ReviewController::class, 'submitByToken'])->middleware('throttle:5,1');
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

// Booking creation (public - permet les réservations sans authentification)
Route::post('/bookings', [BookingController::class, 'store'])->middleware('throttle:10,1'); // 10 réservations par minute

// Public booking routes (le contrôleur gère les permissions)
Route::get('/bookings/{id}', [BookingController::class, 'show']); // Peut être consultée sans authentification

// Payment initiation (public - permet le paiement sans authentification pour les réservations sans compte)
Route::post('/bookings/{bookingId}/payment/initiate', [PaymentController::class, 'initiate'])->middleware('throttle:5,1'); // 5 tentatives par minute

// Payment processing (public - permet le traitement du paiement sans authentification)
Route::post('/payments/{paymentId}/process', [PaymentController::class, 'process'])->middleware('throttle:5,1'); // 5 tentatives par minute

// Payment details (public - permet de consulter un paiement sans authentification)
Route::get('/payments/{paymentId}', [PaymentController::class, 'show']);

// Auth routes avec rate limiting strict pour prévenir les attaques de force brute
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1'); // 5 tentatives par minute
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1'); // 5 tentatives par minute

// Email OTP & Password Reset (public)
Route::post('/auth/send-otp', [AuthController::class, 'sendEmailOtp'])->middleware('throttle:3,1');
Route::post('/auth/verify-otp', [AuthController::class, 'verifyEmailOtp']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

// OAuth routes
Route::get('/auth/{provider}/redirect', [OAuthController::class, 'redirect'])->where('provider', 'google|microsoft');
Route::get('/auth/{provider}/callback', [OAuthController::class, 'callback'])->where('provider', 'google|microsoft');

    // Route pour finaliser la connexion après 2FA (accessible avec token temporaire)
    Route::post('/login/complete-2fa', [AuthController::class, 'complete2FALogin'])->middleware('auth:sanctum');

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

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
        Route::middleware('role:host')->group(function () {
            // Host Profile
            Route::get('/host/profile', [HostProfileController::class, 'show']);
        Route::post('/host/profile', [HostProfileController::class, 'update']); // POST pour FormData
        
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

        // Rooms
        Route::get('/accommodations/{accommodationId}/rooms', [RoomController::class, 'index']);
        Route::get('/accommodations/{accommodationId}/rooms/{id}', [RoomController::class, 'show']);
        Route::post('/accommodations/{accommodationId}/rooms', [RoomController::class, 'store']);
        Route::put('/accommodations/{accommodationId}/rooms/{id}', [RoomController::class, 'update']);
        Route::delete('/accommodations/{accommodationId}/rooms/{id}', [RoomController::class, 'destroy']);

        // Room Images
        Route::post('/accommodations/{accommodationId}/rooms/{roomId}/images', [RoomController::class, 'uploadImage']);
        Route::delete('/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}', [RoomController::class, 'deleteImage']);
        Route::post('/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}/primary', [RoomController::class, 'setPrimaryImage']);
        Route::post('/accommodations/{accommodationId}/rooms/{roomId}/images/reorder', [RoomController::class, 'reorderImages']);

        // Room Availability
        Route::get('/accommodations/{accommodationId}/rooms/{roomId}/availability', [RoomAvailabilityController::class, 'index']);
        Route::get('/accommodations/{accommodationId}/rooms/{roomId}/calendar', [RoomAvailabilityController::class, 'getCalendar']);
        Route::post('/accommodations/{accommodationId}/rooms/{roomId}/availability', [RoomAvailabilityController::class, 'store']);
        Route::post('/accommodations/{accommodationId}/rooms/{roomId}/availability/bulk', [RoomAvailabilityController::class, 'bulkUpdate']);
        Route::put('/accommodations/{accommodationId}/rooms/{roomId}/availability/{id}', [RoomAvailabilityController::class, 'update']);
        Route::delete('/accommodations/{accommodationId}/rooms/{roomId}/availability/{id}', [RoomAvailabilityController::class, 'destroy']);

        // Promotions
        Route::get('/accommodations/{accommodationId}/promotions', [PromotionController::class, 'index']);
        Route::post('/accommodations/{accommodationId}/promotions', [PromotionController::class, 'store']);
        Route::put('/accommodations/{accommodationId}/promotions/{promotionId}', [PromotionController::class, 'update']);
        Route::delete('/accommodations/{accommodationId}/promotions/{promotionId}', [PromotionController::class, 'destroy']);
        Route::post('/accommodations/{accommodationId}/promotions/{promotionId}/toggle', [PromotionController::class, 'toggle']);

        // Commentaires clients (avis reçus + réponse)
        Route::get('/host/reviews', [HostReviewController::class, 'index']);
        Route::patch('/host/reviews/{id}/reply', [HostReviewController::class, 'reply'])->where('id', '[0-9]+');

        // Boîte de réception (messages plateforme et voyageurs)
        Route::get('/host/inbox', [HostInboxController::class, 'index']);
        Route::post('/host/inbox', [HostInboxController::class, 'reply']);
        Route::patch('/host/inbox/{id}/read', [HostInboxController::class, 'markRead'])->where('id', '[0-9]+');

        // Check-in client (code réservation → début du séjour, commission released)
        Route::post('/host/check-in', [HostCheckInController::class, 'store']);

        // Demandes de retrait
        Route::get('/host/withdrawal-requests/balance', [HostWithdrawalController::class, 'availableBalance']);
        Route::get('/host/withdrawal-requests', [HostWithdrawalController::class, 'index']);
        Route::post('/host/withdrawal-requests', [HostWithdrawalController::class, 'store']);
    });

    // Bookings protégées (nécessitent authentification)
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/host/overview', [BookingController::class, 'hostReservations'])->middleware('role:host');
    Route::put('/bookings/{id}', [BookingController::class, 'update']);
    Route::post('/bookings/{booking}/cancel', [BookingController::class, 'cancel'])->middleware('throttle:5,1');
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

    // Payment Methods (détails nécessitent authentification)
    Route::get('/payment-methods/{id}', [PaymentMethodController::class, 'show']);

    // Payment callback (webhook, pas de rate limit - déjà publique, voir plus haut)
    Route::post('/payments/{paymentId}/callback', [PaymentController::class, 'callback']); // Webhook, pas de rate limit

    // Revenue
    Route::get('/revenue/admin', [RevenueController::class, 'adminRevenue'])->middleware('role:admin');
    Route::get('/revenue/host', [RevenueController::class, 'hostRevenue'])->middleware('role:host');
    Route::get('/revenue/commission-rate', [RevenueController::class, 'getCommissionRate']);
    Route::put('/revenue/commission-rate', [RevenueController::class, 'updateCommissionRate'])->middleware('role:admin');
    Route::post('/revenue/commissions/mark-paid', [RevenueController::class, 'markCommissionsPaid'])->middleware('role:admin');

    // Reviews
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
        Route::get('/host/accommodation/{id}', [AnalyticsController::class, 'accommodationStats'])->middleware('role:host')->where('id', '[0-9]+');
        Route::get('/host', [AnalyticsController::class, 'hostDashboard'])->middleware('role:host');
        Route::get('/admin', [AnalyticsController::class, 'adminDashboard'])->middleware('role:admin');
        Route::get('/traveler', [AnalyticsController::class, 'travelerDashboard'])->middleware('role:user');
    });

    // Admin routes - Nouveau système RBAC
    Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
        // Dashboard & Analytics
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/daily-activity', [AdminDashboardController::class, 'dailyActivity'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/host-performance', [AdminDashboardController::class, 'hostPerformance'])
            ->middleware('permission:admin.dashboard.read');
        Route::get('/dashboard/accommodation-status', [AdminDashboardController::class, 'accommodationStatusDistribution'])
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
            Route::get('/{id}', [AdminAccommodationController::class, 'show'])->middleware('permission:accommodations.read');
            Route::post('/{id}/approve', [AdminAccommodationController::class, 'approve'])->middleware('permission:accommodations.approve');
            Route::post('/{id}/reject', [AdminAccommodationController::class, 'reject'])->middleware('permission:accommodations.reject');
            Route::post('/{id}/remove', [AdminAccommodationController::class, 'remove'])->middleware('permission:accommodations.remove');
            Route::post('/{id}/disable', [AdminAccommodationController::class, 'disable'])->middleware('permission:accommodations.disable');
            Route::post('/{id}/enable', [AdminAccommodationController::class, 'enable'])->middleware('permission:accommodations.update');
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
            Route::post('/{id}/approve', [AdminWithdrawalController::class, 'approve'])->where('id', '[0-9]+');
            Route::post('/{id}/reject', [AdminWithdrawalController::class, 'reject'])->where('id', '[0-9]+');
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

