<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\CorporateCollaborator;
use App\Models\HostStaff;
use App\Services\TwoFactorService;
use App\Services\OneSignalService;
use App\Services\SmsService;
use App\Services\LoyaltyService;
use App\Mail\OtpMail;
use App\Mail\PasswordResetMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\NotificationController;

class AuthController extends Controller
{
    /**
     * Activation d'un compte "invité" (auto-créé lors d'une réservation).
     * Le voyageur définit son mot de passe ; ses réservations sont déjà rattachées.
     */
    public function activateGuest(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|min:8|confirmed',
            'name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !$user->is_guest) {
            return response()->json([
                'message' => "Aucun compte à activer pour cet e-mail. Connectez-vous ou créez un compte.",
            ], 422);
        }

        $user->password = Hash::make($request->password);
        $user->is_guest = false;
        if ($request->filled('name')) {
            $user->name = strip_tags($request->name);
        }
        if ($request->filled('phone')) {
            $user->phone = $request->phone;
        }
        $user->save();
        CorporateCollaborator::linkPendingInvitations($user);
        $this->notifyLoyaltyWelcome($user);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Compte activé avec succès.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * "Rejoint le programme" (brief Programme de Fidélité, notification #1) —
     * le voyageur est automatiquement membre Bronze dès qu'il a un compte actif
     * (colonnes loyalty_* déjà à leurs valeurs par défaut depuis la création).
     */
    private function notifyLoyaltyWelcome(User $user): void
    {
        if ($user->role !== 'user') {
            return;
        }

        app(LoyaltyService::class)->notify(
            $user,
            'loyalty_welcome',
            'Bienvenue dans le Programme Membre bo séjour ! Vous démarrez au niveau Bronze.',
            ['tier' => $user->loyalty_tier]
        );
    }

    /**
     * Activation d'une invitation collaborateur (menu Personnel de l'extranet partenaire —
     * brief Extranet Partenaire, Phase 13). Le lien contient un jeton à usage unique posé
     * lors de l'invitation (HostStaffController::store). Crée un compte "host" distinct
     * rattaché au propriétaire via staff_owner_id (voir User::hostScopeId()).
     */
    public function staffInvitationInfo(Request $request)
    {
        $request->validate(['token' => 'required|string']);

        $staff = HostStaff::where('invite_token', $request->token)
            ->where('status', HostStaff::STATUS_INVITED)
            ->with('owner:id,name,company_name')
            ->first();

        if (!$staff) {
            return response()->json(['message' => "Ce lien d'invitation est invalide ou a déjà été utilisé."], 404);
        }

        return response()->json([
            'name' => $staff->name,
            'email' => $staff->email,
            'role' => $staff->role,
            'role_label' => HostStaff::ROLE_LABELS[$staff->role] ?? $staff->role,
            'owner_name' => $staff->owner?->company_name ?: $staff->owner?->name,
        ]);
    }

    public function activateStaffInvitation(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $staff = HostStaff::where('invite_token', $data['token'])
            ->where('status', HostStaff::STATUS_INVITED)
            ->first();

        if (!$staff) {
            return response()->json([
                'message' => "Ce lien d'invitation est invalide ou a déjà été utilisé.",
            ], 422);
        }

        $user = User::where('email', $staff->email)->first();

        if (!$user) {
            $user = User::create([
                'name' => $staff->name,
                'email' => $staff->email,
                'phone' => $staff->phone,
                'password' => Hash::make($data['password']),
                'role' => 'host',
                'staff_owner_id' => $staff->owner_id,
                'staff_role' => $staff->role,
                'staff_permissions' => $staff->permissions,
                'email_verified_at' => now(),
                'profile_completed' => true,
                'profile_verified' => true,
            ]);
        } else {
            // Compte voyageur existant : on pose le mot de passe collaborateur (peut différer
            // de celui du compte voyageur si un mot de passe existait déjà) et on le promeut.
            $user->password = Hash::make($data['password']);
            $user->role = 'host';
            $user->staff_owner_id = $staff->owner_id;
            $user->staff_role = $staff->role;
            $user->staff_permissions = $staff->permissions;
            $user->is_guest = false;
            if (!$user->email_verified_at) {
                $user->email_verified_at = now();
            }
            $user->save();
        }

        $staff->update([
            'collaborator_user_id' => $user->id,
            'status' => HostStaff::STATUS_ACTIVE,
            'accepted_at' => now(),
            'invite_token' => null,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Accès collaborateur activé avec succès.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Inscription voyageur (légère, sans pièces d'identité — brief Parcours Voyageur).
     * Si un compte invité (is_guest) existe déjà pour cet e-mail, on le CONVERTIT
     * (les réservations passées restent rattachées).
     */
    public function registerTraveler(Request $request)
    {
        $data = $request->validate([
            'first_name'            => 'required|string|max:255',
            'last_name'             => 'required|string|max:255',
            'email'                 => 'required|string|email|max:255',
            'password'              => 'required|string|min:8|confirmed',
            'phone'                 => 'required|string|max:20',
            'whatsapp'              => 'nullable|string|max:20',
            'residence_country'     => 'nullable|string|max:255',
            'residence_city'        => 'nullable|string|max:255',
            'nationality'           => 'nullable|string|max:255',
            'traveler_type'         => 'nullable|in:individual,corporate',
            'company_name'          => 'required_if:traveler_type,corporate|nullable|string|max:255',
            'company_vat'           => 'nullable|string|max:255',
            'company_address'       => 'nullable|string|max:255',
            'company_city'          => 'nullable|string|max:255',
            'company_country'       => 'nullable|string|max:255',
            'company_service'       => 'nullable|string|max:255',
            'company_project'       => 'nullable|string|max:255',
            'company_billing_email' => 'nullable|string|email|max:255',
            'accept_terms'          => 'accepted',
            'referral_code'         => 'nullable|string|max:20',
        ]);

        $existing = User::where('email', $data['email'])->first();
        if ($existing && !$existing->is_guest) {
            return response()->json([
                'message' => 'Un compte existe déjà avec cet e-mail. Veuillez vous connecter.',
                'errors'  => ['email' => ['Un compte existe déjà avec cet e-mail.']],
            ], 422);
        }

        $travelerType = $data['traveler_type'] ?? 'individual';
        $isCorporate  = $travelerType === 'corporate';
        $clean = fn ($v) => $v !== null ? strip_tags($v) : null;

        $user = $existing ?: new User(['email' => $data['email'], 'role' => 'user']);

        // Parrainage : résolu une seule fois, jamais écrasé si le compte (invité
        // finalisant son inscription) en a déjà un — et un compte ne peut pas se
        // parrainer lui-même.
        if (!$user->referred_by_user_id && !empty($data['referral_code'])) {
            $referrer = User::where('referral_code', $data['referral_code'])->first();
            if ($referrer && $referrer->id !== $user->id) {
                $user->referred_by_user_id = $referrer->id;
            }
        }

        $user->fill([
            'name'                  => trim($clean($data['first_name']) . ' ' . $clean($data['last_name'])),
            'first_name'            => $clean($data['first_name']),
            'last_name'             => $clean($data['last_name']),
            'phone'                 => $data['phone'],
            'whatsapp'              => $data['whatsapp'] ?? $data['phone'],
            'residence_country'     => $clean($data['residence_country'] ?? null),
            'residence_city'        => $clean($data['residence_city'] ?? null),
            'nationality'           => $clean($data['nationality'] ?? null),
            'traveler_type'         => $travelerType,
            'company_name'          => $isCorporate ? $clean($data['company_name'] ?? null) : null,
            'company_vat'           => $isCorporate ? $clean($data['company_vat'] ?? null) : null,
            'company_address'       => $isCorporate ? $clean($data['company_address'] ?? null) : null,
            'company_city'          => $isCorporate ? $clean($data['company_city'] ?? null) : null,
            'company_country'       => $isCorporate ? $clean($data['company_country'] ?? null) : null,
            'company_service'       => $isCorporate ? $clean($data['company_service'] ?? null) : null,
            'company_project'       => $isCorporate ? $clean($data['company_project'] ?? null) : null,
            'company_billing_email' => $isCorporate ? ($data['company_billing_email'] ?? null) : null,
        ]);
        $user->role     = 'user';
        $user->password = Hash::make($data['password']);
        $user->is_guest = false;
        $isNewAccount = !$existing;
        $user->save();
        CorporateCollaborator::linkPendingInvitations($user);
        if ($isNewAccount) {
            $this->notifyLoyaltyWelcome($user);
        }

        // Vérification e-mail obligatoire : on envoie un code OTP et on NE connecte PAS
        // tant que l'e-mail n'est pas vérifié (aucun token renvoyé ici).
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->update([
            'email_otp_code'       => $otp,
            'email_otp_expires_at' => now()->addMinutes(10),
        ]);

        $emailSent = true;
        try {
            Mail::to($user->email)->send(new OtpMail($user->name, $otp));
        } catch (\Throwable $e) {
            $emailSent = false;
            Log::error('Register OTP email failed: ' . $e->getMessage(), ['user_id' => $user->id]);
        }

        $smsSent = false;
        if (!empty($user->phone)) {
            $smsSent = app(SmsService::class)->sendOtp($user->phone, $otp);
        }

        if (!$emailSent && !$smsSent) {
            $user->update(['email_otp_code' => null, 'email_otp_expires_at' => null]);
            return response()->json([
                'message' => "Impossible d'envoyer le code de vérification. Veuillez réessayer dans quelques instants.",
            ], 503);
        }

        return response()->json([
            'requires_email_otp' => true,
            'user_id'            => $user->id,
            'email'              => $user->email,
            'message'            => 'Un code de vérification a été envoyé par email' . ($smsSent ? ' et par SMS' : '') . '.',
        ], 201);
    }

    /**
     * Inscription hôte allégée (brief Extranet Partenaire, Étape 4) : seuls nom,
     * téléphone, e-mail et mot de passe sont demandés. Établissement, type,
     * adresse etc. sont saisis plus tard dans la configuration de l'hébergement
     * (AccommodationController::store() bloque déjà tant que profile_completed
     * est faux). Vérification par OTP e-mail uniquement (décision produit
     * 2026-08-13 : pas de SMS, pour limiter les frictions à l'inscription).
     */
    public function registerPartnerLight(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|string|email|max:255|unique:users',
            'password'   => 'required|string|min:8|confirmed',
            'phone'      => 'required|string|max:20',
            'accept_terms' => 'accepted',
        ]);

        $clean = fn ($v) => $v !== null ? strip_tags($v) : null;

        $user = User::create([
            'name'       => trim($clean($data['first_name']) . ' ' . $clean($data['last_name'])),
            'first_name' => $clean($data['first_name']),
            'last_name'  => $clean($data['last_name']),
            'email'      => $data['email'],
            'phone'      => $data['phone'],
            'password'   => Hash::make($data['password']),
            'role'       => 'host',
        ]);

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->update([
            'email_otp_code'       => $otp,
            'email_otp_expires_at' => now()->addMinutes(10),
        ]);

        try {
            Mail::to($user->email)->send(new OtpMail($user->name, $otp));
        } catch (\Throwable $e) {
            Log::error('Register partner OTP email failed: ' . $e->getMessage(), ['user_id' => $user->id]);
            $user->update(['email_otp_code' => null, 'email_otp_expires_at' => null]);
            return response()->json([
                'message' => "Impossible d'envoyer le code de vérification. Veuillez réessayer dans quelques instants.",
            ], 503);
        }

        return response()->json([
            'requires_email_otp' => true,
            'user_id'            => $user->id,
            'email'              => $user->email,
            'message'            => 'Un code de vérification a été envoyé par email.',
        ], 201);
    }

    /**
     * Préremplissage du formulaire d'inscription à partir d'un compte INVITÉ existant
     * (réservations passées). Restreint aux comptes is_guest (sans mot de passe) pour
     * limiter l'exposition de données ; enrichi par la dernière réservation.
     */
    public function guestPrefill(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->where('is_guest', true)->first();
        if (!$user) {
            return response()->json(['found' => false]);
        }

        $booking = \App\Models\Booking::where('user_id', $user->id)->latest('id')->first();
        $parts = preg_split('/\s+/', trim($user->name ?? ''), 2);

        return response()->json([
            'found'   => true,
            'prefill' => [
                'first_name'            => $user->first_name ?: ($parts[0] ?? ''),
                'last_name'             => $user->last_name ?: ($parts[1] ?? ''),
                'phone'                 => $user->phone,
                'whatsapp'              => $user->whatsapp,
                'residence_country'     => $user->residence_country ?: ($booking->residence_country ?? null),
                'residence_city'        => $user->residence_city ?: ($booking->residence_city ?? null),
                'nationality'           => $user->nationality,
                'traveler_type'         => $booking->traveler_type ?? $user->traveler_type ?? 'individual',
                'company_name'          => $booking->company_name ?? $user->company_name,
                'company_vat'           => $booking->company_vat ?? $user->company_vat,
                'company_address'       => $booking->company_address ?? $user->company_address,
                'company_billing_email' => $booking->company_billing_email ?? $user->company_billing_email,
            ],
        ]);
    }

    public function register(Request $request)
    {
        $role = $request->input('role', 'user');
        
        // Validation de base
        $rules = [
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'nullable|string|in:user,host',
        ];

        // Validation spécifique pour les voyageurs
        if ($role === 'user') {
            $rules = array_merge($rules, [
                'name' => 'required|string|max:255',
                'nationality' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
                'id_type' => 'required|string|in:CNI,Passeport,Permis',
                'id_number' => 'required|string|max:255',
                'id_document_recto' => 'required|image|mimes:jpeg,jpg,png|max:5120', // 5MB max
            ]);

            // Si CNI ou Permis, le verso est requis
            if (in_array($request->input('id_type'), ['CNI', 'Permis'])) {
                $rules['id_document_verso'] = 'required|image|mimes:jpeg,jpg,png|max:5120';
            }
        } else {
            // Validation pour les hôtes
            $rules = array_merge($rules, [
                'name' => 'required|string|max:255',
                'establishment_name' => 'required|string|max:255',
                'accommodation_type' => 'required|string|in:hotel,motel,guesthouse,apartment,apartment_hotel,residence',
                'address_line1' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'whatsapp' => 'required|string|max:20',
                'phone_fixed' => 'nullable|string|max:20',
            ]);
        }

        $request->validate($rules);

        // Sanitize les inputs
        $sanitizedData = [
            'name' => strip_tags($request->name),
            'email' => filter_var($request->email, FILTER_SANITIZE_EMAIL),
        ];

        // Logger la tentative d'inscription (ne pas faire échouer la requête si le log échoue, ex. permissions)
        try {
            Log::channel('security')->info('Registration attempt', [
                'email' => $sanitizedData['email'],
                'role' => $role,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            // Ne pas appeler Log ici : storage/logs peut aussi être en Permission denied et provoquer une 500
        }

        // Créer l'utilisateur
        $userData = [
            'name' => $sanitizedData['name'],
            'email' => $sanitizedData['email'],
            'password' => Hash::make($request->password),
            'role' => $role,
            'status' => 'active', // Nouveaux utilisateurs sont actifs par défaut
        ];

        // Ajouter les champs spécifiques aux voyageurs
        if ($role === 'user') {
            $userData['country'] = $request->nationality; // Utiliser country pour stocker la nationalité
            $userData['id_type'] = $request->id_type;
            $userData['id_number'] = $request->id_number;
            $userData['phone'] = $request->phone;
        } else {
            // Ajouter les champs spécifiques aux hôtes
            $userData['establishment_name'] = $request->establishment_name;
            $userData['accommodation_type'] = $request->accommodation_type;
            $userData['address_line1'] = $request->address_line1;
            $userData['city'] = $request->city;
            $userData['whatsapp'] = $request->whatsapp;
            $userData['phone_fixed'] = $request->phone_fixed;
            // Utiliser whatsapp comme numéro principal pour les hôtes
            $userData['phone'] = $request->whatsapp;
        }

        $user = User::create($userData);
        CorporateCollaborator::linkPendingInvitations($user);
        $this->notifyLoyaltyWelcome($user);

        // Gérer l'upload des fichiers d'identité pour les voyageurs
        if ($role === 'user') {
            // Upload du recto avec validation de sécurité
            if ($request->hasFile('id_document_recto')) {
                $file = $request->file('id_document_recto');
                
                // Vérifications supplémentaires de sécurité
                $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
                if (!in_array($file->getMimeType(), $allowedMimes)) {
                    Log::channel('security')->warning('Invalid file type upload attempt', [
                        'user_id' => $user->id,
                        'file_type' => $file->getMimeType(),
                        'ip' => $request->ip(),
                        'timestamp' => now()->toIso8601String(),
                    ]);
                    throw ValidationException::withMessages([
                        'id_document_recto' => ['Invalid file type. Only JPEG and PNG are allowed.'],
                    ]);
                }

                $path = $file->store('user-documents', 'public');
                $user->id_document_recto_path = $path;
            }

            // Upload du verso (si requis) avec validation de sécurité
            if ($request->hasFile('id_document_verso')) {
                $file = $request->file('id_document_verso');
                
                $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
                if (!in_array($file->getMimeType(), $allowedMimes)) {
                    Log::channel('security')->warning('Invalid file type upload attempt', [
                        'user_id' => $user->id,
                        'file_type' => $file->getMimeType(),
                        'ip' => $request->ip(),
                        'timestamp' => now()->toIso8601String(),
                    ]);
                    throw ValidationException::withMessages([
                        'id_document_verso' => ['Invalid file type. Only JPEG and PNG are allowed.'],
                    ]);
                }

                $path = $file->store('user-documents', 'public');
                $user->id_document_verso_path = $path;
            }

            $user->save();
        }

        // Logger l'inscription réussie (ne doit jamais faire échouer la requête)
        try {
            Log::channel('security')->info('Successful registration', [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $role,
                'ip' => $request->ip(),
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            // Ignorer les erreurs de log (ex : permissions sur storage/logs)
        }

        // Charger les rôles RBAC
        $user->load('roles');

        $token = $user->createToken('auth_token')->plainTextToken;

        // Notification de bienvenue OneSignal (asynchrone, ne bloque pas la réponse)
        try {
            NotificationController::notifyWelcome($user);
        } catch (\Throwable) {}

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(\App\Http\Requests\SecureLoginRequest $request)
    {
        // La validation est déjà faite dans SecureLoginRequest

        // Verrouillage : après 5 échecs (par e-mail + IP), on bloque 15 min.
        $throttleKey = Str::lower((string) $request->email) . '|' . $request->ip();
        $maxAttempts = 5;

        if (RateLimiter::tooManyAttempts($throttleKey, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            $minutes = (int) ceil($seconds / 60);
            Log::channel('security')->warning('Login locked out (too many attempts)', [
                'email' => $request->email,
                'ip' => $request->ip(),
                'retry_in_seconds' => $seconds,
            ]);
            throw ValidationException::withMessages([
                'email' => ["Trop de tentatives de connexion. Réessayez dans {$minutes} minute(s)."],
            ])->status(429);
        }

        $user = User::where('email', $request->email)->first();

        // Protection contre les attaques de timing : toujours vérifier le hash même si l'utilisateur n'existe pas
        $passwordValid = $user && Hash::check($request->password, $user->password);

        if (!$passwordValid) {
            // Incrémente le compteur d'échecs (fenêtre de 15 min)
            RateLimiter::hit($throttleKey, 900);

            // Logger la tentative de connexion échouée
            Log::channel('security')->warning('Failed login attempt', [
                'email' => $request->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'attempts_left' => RateLimiter::remaining($throttleKey, $maxAttempts),
                'timestamp' => now()->toIso8601String(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Mot de passe correct → on réinitialise le compteur d'échecs.
        RateLimiter::clear($throttleKey);

        // Vérifier si l'utilisateur est actif et non bloqué
        if (!$user->isActive()) {
            Log::channel('security')->warning('Login attempt on blocked/inactive account', [
                'user_id' => $user->id,
                'email' => $user->email,
                'ip' => $request->ip(),
                'status' => $user->status,
                'blocked_at' => $user->blocked_at,
                'timestamp' => now()->toIso8601String(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['Your account has been blocked. Please contact support.'],
            ]);
        }

        // Les admins, super_admins et contrôleurs se connectent directement sans OTP
        $bypassOtp = $user->role === 'admin'
            || $user->hasRole('super_admin')
            || $user->hasRole('admin')
            || $user->hasRole('controleur');

        if ($bypassOtp) {
            $user->update(['last_login_at' => now(), 'last_login_ip' => $request->ip(), 'login_count' => ($user->login_count ?? 0) + 1]);
            $user->load('roles');
            $token = $user->createToken('auth_token')->plainTextToken;
            return response()->json(['user' => $user, 'token' => $token]);
        }

        // Vérifier si le 2FA Google Authenticator est activé
        if ($user->two_factor_enabled) {
            // Retourner un token temporaire qui nécessite la vérification 2FA
            $tempToken = $user->createToken('2fa-verification', ['verify-2fa'])->plainTextToken;

            return response()->json([
                'requires_2fa' => true,
                'user_id' => $user->id,
                'temp_token' => $tempToken,
                'message' => '2FA verification required',
            ], 200);
        }

        // E-mail DÉJÀ vérifié (une seule fois, à la création du compte) → connexion directe.
        // Pas d'OTP à chaque connexion : seul le mot de passe est requis ensuite.
        if ($user->email_verified_at) {
            $user->update([
                'last_login_at' => now(),
                'last_login_ip' => $request->ip(),
                'login_count'   => ($user->login_count ?? 0) + 1,
            ]);
            $user->load('roles');
            $token = $user->createToken('auth_token')->plainTextToken;
            return response()->json(['user' => $user, 'token' => $token]);
        }

        // E-mail pas encore vérifié → on envoie un OTP pour le vérifier (une seule fois).
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->update([
            'email_otp_code'       => $otp,
            'email_otp_expires_at' => now()->addMinutes(10),
        ]);

        $emailSent = true;
        try {
            Mail::to($user->email)->send(new OtpMail($user->name, $otp));
        } catch (\Throwable $e) {
            $emailSent = false;
            Log::error('OTP email send failed: ' . $e->getMessage(), ['user_id' => $user->id]);
        }

        // Envoyer aussi le code par SMS (best-effort, en plus de l'email)
        $smsSent = false;
        if (!empty($user->phone)) {
            $smsSent = app(SmsService::class)->sendOtp($user->phone, $otp);
        }

        if (!$emailSent && !$smsSent) {
            // Effacer l'OTP si aucun canal n'a pu envoyer le code
            $user->update(['email_otp_code' => null, 'email_otp_expires_at' => null]);
            return response()->json([
                'message' => 'Impossible d\'envoyer le code. Veuillez réessayer dans quelques instants.',
            ], 503);
        }

        return response()->json([
            'requires_email_otp' => true,
            'user_id'            => $user->id,
            'message'            => 'Un code de vérification a été envoyé par email' . ($smsSent ? ' et par SMS' : '') . '.',
        ], 200);
    }

    /**
     * Finaliser la connexion après vérification 2FA
     */
    public function complete2FALogin(Request $request)
    {
        $request->validate([
            'code' => 'required_without:recovery_code|string|size:6',
            'recovery_code' => 'required_without:code|string|size:8',
        ]);

        // La cible est TOUJOURS le porteur du token temporaire authentifié par le middleware
        // auth:sanctum — jamais un `user_id` fourni par le client. Avant ce correctif, le
        // contrôleur faisait confiance à `$request->user_id` : n'importe quel compte, muni
        // de son propre token valide (temporaire OU même un token normal), pouvait tenter de
        // vérifier le code 2FA d'un AUTRE compte en indiquant son user_id dans le corps de la
        // requête — un contournement/brute-force possible du 2FA de n'importe qui.
        $user = $request->user();

        // Le token doit être le token temporaire de vérification 2FA émis par login(), pas un
        // token de session normal déjà pleinement authentifié. NB : on vérifie le NOM du token
        // plutôt que tokenCan('verify-2fa') — un token normal a par défaut l'ability '*', qui
        // satisferait n'importe quel tokenCan(), rendant ce contrôle inopérant.
        if (!$user->currentAccessToken() || $user->currentAccessToken()->name !== '2fa-verification') {
            return response()->json(['message' => 'Jeton de vérification 2FA invalide ou expiré.'], 403);
        }

        if (!$user->two_factor_enabled) {
            return response()->json([
                'message' => '2FA is not enabled for this user',
            ], 400);
        }

        $twoFactorService = app(TwoFactorService::class);
        $verified = false;

        if ($request->has('code')) {
            $verified = $twoFactorService->verifyCode($user, $request->code);
        } elseif ($request->has('recovery_code')) {
            $verified = $twoFactorService->verifyRecoveryCode($user, strtoupper($request->recovery_code));
        }

        if (!$verified) {
            throw ValidationException::withMessages([
                'code' => ['Le code de vérification est incorrect.'],
            ]);
        }

        // Supprimer le token temporaire
        $request->user()->tokens()->delete();

        // Créer le token final
        $token = $user->createToken('auth_token')->plainTextToken;

        // Enregistrer les informations de connexion
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'login_count' => ($user->login_count ?? 0) + 1,
        ]);

        // Charger les rôles RBAC
        $user->load('roles');

        Log::channel('security')->info('2FA login completed', [
            'user_id' => $user->id,
            'email' => $user->email,
            'ip' => $request->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        // Charger les rôles RBAC
        $user->load('roles');
        return response()->json($user);
    }

    /**
     * Vérifier si un utilisateur a un rôle spécifique (pour NestJS)
     */
    public function checkRole(Request $request, $id, $role)
    {
        $user = User::findOrFail($id);
        // Endpoint hérité ("pour NestJS") sans aucun contrôle d'accès jusqu'ici : tout
        // utilisateur authentifié pouvait consulter les rôles/permissions de N'IMPORTE QUI
        // d'autre. Réutilise UserPolicy::view() (déjà correcte : soi-même, ou admin/gerant).
        $this->authorize('view', $user);
        $hasRole = $user->hasRole($role);

        return response()->json([
            'hasRole' => $hasRole,
            'userId' => $user->id,
            'role' => $role,
        ]);
    }

    /**
     * Vérifier si un utilisateur a une permission spécifique (pour NestJS)
     */
    public function checkPermission(Request $request, $id, $permission)
    {
        $user = User::findOrFail($id);
        $this->authorize('view', $user);
        $hasPermission = $user->hasPermission($permission);

        return response()->json([
            'hasPermission' => $hasPermission,
            'userId' => $user->id,
            'permission' => $permission,
        ]);
    }

    /**
     * Récupérer tous les rôles d'un utilisateur (pour NestJS)
     */
    public function getUserRoles(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('view', $user);
        $roles = $user->roles()->get();

        return response()->json([
            'data' => $roles,
        ]);
    }

    /**
     * Récupérer toutes les permissions d'un utilisateur (pour NestJS)
     */
    public function getUserPermissions(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('view', $user);
        $permissions = $user->permissions();

        return response()->json([
            'data' => $permissions,
        ]);
    }

    /**
     * Envoyer un OTP par email (endpoint public avec throttle)
     */
    public function sendEmailOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Ne pas révéler si l'email existe ou non
        if (!$user || !$user->isActive()) {
            return response()->json(['message' => 'Si cet email existe, un code vous a été envoyé.'], 200);
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->update([
            'email_otp_code'       => $otp,
            'email_otp_expires_at' => now()->addMinutes(10),
        ]);

        $emailSent = true;
        try {
            Mail::to($user->email)->send(new OtpMail($user->name, $otp));
        } catch (\Throwable $e) {
            $emailSent = false;
            Log::error('OTP email send failed: ' . $e->getMessage(), ['user_id' => $user->id]);
        }

        // Envoyer aussi le code par SMS (best-effort, en plus de l'email)
        $smsSent = false;
        if (!empty($user->phone)) {
            $smsSent = app(SmsService::class)->sendOtp($user->phone, $otp);
        }

        if (!$emailSent && !$smsSent) {
            $user->update(['email_otp_code' => null, 'email_otp_expires_at' => null]);
            return response()->json(['message' => 'Impossible d\'envoyer le code. Veuillez réessayer.'], 503);
        }

        return response()->json(['message' => 'Code OTP envoyé.'], 200);
    }

    /**
     * Vérifier l'OTP email et finaliser la connexion
     */
    public function verifyEmailOtp(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'code'    => 'required|string|size:6',
        ]);

        $user = User::findOrFail($request->user_id);

        $submittedCode = trim($request->code);

        if ($user->email_otp_code === null || $user->email_otp_expires_at === null) {
            throw ValidationException::withMessages([
                'code' => ['Aucun code en attente. Veuillez vous reconnecter pour en recevoir un nouveau.'],
            ]);
        }

        if ($user->email_otp_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => ['Ce code a expiré. Veuillez vous reconnecter pour en recevoir un nouveau.'],
            ]);
        }

        if ($user->email_otp_code !== $submittedCode) {
            throw ValidationException::withMessages([
                'code' => ['Code incorrect. Vérifiez votre email et réessayez.'],
            ]);
        }

        // Effacer l'OTP après utilisation + marquer l'e-mail comme vérifié
        $user->update([
            'email_otp_code'       => null,
            'email_otp_expires_at' => null,
            'email_verified_at'    => $user->email_verified_at ?? now(),
            'last_login_at'        => now(),
            'last_login_ip'        => $request->ip(),
            'login_count'          => ($user->login_count ?? 0) + 1,
        ]);

        $user->load('roles');
        $token = $user->createToken('auth_token')->plainTextToken;

        try {
            Log::channel('security')->info('Email OTP login completed', [
                'user_id'   => $user->id,
                'email'     => $user->email,
                'ip'        => $request->ip(),
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'user'  => $user,
            'token' => $token,
        ]);
    }

    /**
     * Demander un lien de réinitialisation de mot de passe
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Toujours retourner le même message pour ne pas révéler si l'email existe
        $genericMessage = 'Si cet email est associé à un compte, vous recevrez un lien de réinitialisation.';

        if (!$user) {
            return response()->json(['message' => $genericMessage], 200);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->upsert(
            [
                'email'      => $user->email,
                'token'      => Hash::make($token),
                'created_at' => now(),
            ],
            ['email'],
            ['token', 'created_at']
        );

        $resetUrl = 'https://bosejour.ci/auth/reset-password?token=' . urlencode($token) . '&email=' . urlencode($user->email);

        try {
            Mail::to($user->email)->send(new PasswordResetMail($user->name, $resetUrl));
        } catch (\Throwable $e) {
            Log::error('Password reset email failed: ' . $e->getMessage(), ['email' => $user->email]);
        }

        return response()->json(['message' => $genericMessage], 200);
    }

    /**
     * Réinitialiser le mot de passe avec le token reçu par email
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token'                 => 'required|string',
            'email'                 => 'required|email',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record) {
            throw ValidationException::withMessages([
                'token' => ['Ce lien de réinitialisation est invalide ou a expiré.'],
            ]);
        }

        // Vérifier l'expiration (60 minutes)
        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            throw ValidationException::withMessages([
                'token' => ['Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau.'],
            ]);
        }

        if (!Hash::check($request->token, $record->token)) {
            throw ValidationException::withMessages([
                'token' => ['Ce lien de réinitialisation est invalide.'],
            ]);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['Aucun compte associé à cet email.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Supprimer tous les tokens de cet email
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Révoquer tous les tokens Sanctum existants pour forcer une reconnexion
        $user->tokens()->delete();

        try {
            Log::channel('security')->info('Password reset completed', [
                'user_id'   => $user->id,
                'email'     => $user->email,
                'ip'        => $request->ip(),
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'Mot de passe réinitialisé avec succès.'], 200);
    }
}

