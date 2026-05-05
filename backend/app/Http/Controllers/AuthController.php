<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\TwoFactorService;
use App\Services\OneSignalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\NotificationController;

class AuthController extends Controller
{
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

        $user = User::where('email', $request->email)->first();

        // Protection contre les attaques de timing : toujours vérifier le hash même si l'utilisateur n'existe pas
        $passwordValid = $user && Hash::check($request->password, $user->password);

        if (!$passwordValid) {
            // Logger la tentative de connexion échouée
            Log::channel('security')->warning('Failed login attempt', [
                'email' => $request->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toIso8601String(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

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

        // Pas de Google 2FA — envoyer un OTP par email
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->update([
            'email_otp_code'       => $otp,
            'email_otp_expires_at' => now()->addMinutes(10),
        ]);

        try {
            $oneSignal = app(OneSignalService::class);
            $oneSignal->sendOtpEmail($user->email, $otp, $user->name);
        } catch (\Throwable $e) {
            Log::error('OTP email send failed: ' . $e->getMessage(), ['user_id' => $user->id]);
        }

        return response()->json([
            'requires_email_otp' => true,
            'user_id'            => $user->id,
            'message'            => 'Un code de vérification a été envoyé à votre adresse email.',
        ], 200);
    }

    /**
     * Finaliser la connexion après vérification 2FA
     */
    public function complete2FALogin(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'code' => 'required_without:recovery_code|string|size:6',
            'recovery_code' => 'required_without:code|string|size:8',
        ]);

        $user = User::findOrFail($request->user_id);

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
    public function checkRole($id, $role)
    {
        $user = User::findOrFail($id);
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
    public function checkPermission($id, $permission)
    {
        $user = User::findOrFail($id);
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
    public function getUserRoles($id)
    {
        $user = User::findOrFail($id);
        $roles = $user->roles()->get();

        return response()->json([
            'data' => $roles,
        ]);
    }

    /**
     * Récupérer toutes les permissions d'un utilisateur (pour NestJS)
     */
    public function getUserPermissions($id)
    {
        $user = User::findOrFail($id);
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

        try {
            $oneSignal = app(OneSignalService::class);
            $oneSignal->sendOtpEmail($user->email, $otp, $user->name);
        } catch (\Throwable $e) {
            Log::error('OTP email send failed: ' . $e->getMessage(), ['user_id' => $user->id]);
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

        if (
            $user->email_otp_code === null ||
            $user->email_otp_expires_at === null ||
            $user->email_otp_expires_at->isPast() ||
            $user->email_otp_code !== $request->code
        ) {
            throw ValidationException::withMessages([
                'code' => ['Le code est invalide ou a expiré.'],
            ]);
        }

        // Effacer l'OTP après utilisation
        $user->update([
            'email_otp_code'       => null,
            'email_otp_expires_at' => null,
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
            $oneSignal = app(OneSignalService::class);
            $oneSignal->sendPasswordResetEmail($user->email, $user->name, $resetUrl);
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

