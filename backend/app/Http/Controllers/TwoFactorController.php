<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class TwoFactorController extends Controller
{
    protected $twoFactorService;

    public function __construct(TwoFactorService $twoFactorService)
    {
        $this->twoFactorService = $twoFactorService;
    }

    /**
     * Générer un secret 2FA et retourner le QR code
     */
    public function setup(Request $request)
    {
        $user = $request->user();

        if ($user->two_factor_enabled) {
            return response()->json([
                'message' => '2FA is already enabled',
            ], 400);
        }

        $secret = $this->twoFactorService->generateSecret($user);
        $qrCodeUrl = $this->twoFactorService->getQRCodeUrl($user, $secret);

        return response()->json([
            'secret' => $secret,
            'qr_code_url' => $qrCodeUrl,
            'manual_entry_key' => $secret,
        ]);
    }

    /**
     * Activer le 2FA après vérification du code
     */
    public function enable(Request $request)
    {
        $request->validate([
            'secret' => 'required|string',
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();

        if ($user->two_factor_enabled) {
            return response()->json([
                'message' => '2FA is already enabled',
            ], 400);
        }

        $enabled = $this->twoFactorService->enable(
            $user,
            $request->secret,
            $request->code
        );

        if (!$enabled) {
            throw ValidationException::withMessages([
                'code' => ['Le code de vérification est incorrect.'],
            ]);
        }

        // Récupérer les codes de récupération
        $recoveryCodes = json_decode(
            decrypt($user->fresh()->two_factor_recovery_codes),
            true
        );

        return response()->json([
            'message' => '2FA enabled successfully',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Désactiver le 2FA
     */
    public function disable(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (!$user->two_factor_enabled) {
            return response()->json([
                'message' => '2FA is not enabled',
            ], 400);
        }

        // Vérifier le mot de passe
        if (!\Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Le mot de passe est incorrect.'],
            ]);
        }

        $this->twoFactorService->disable($user);

        return response()->json([
            'message' => '2FA disabled successfully',
        ]);
    }

    /**
     * Vérifier un code 2FA (pour la connexion)
     */
    public function verify(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6',
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::findOrFail($request->user_id);

        if (!$user->two_factor_enabled) {
            return response()->json([
                'message' => '2FA is not enabled for this user',
            ], 400);
        }

        $valid = $this->twoFactorService->verifyCode($user, $request->code);

        if (!$valid) {
            throw ValidationException::withMessages([
                'code' => ['Le code de vérification est incorrect.'],
            ]);
        }

        return response()->json([
            'message' => 'Code verified successfully',
            'verified' => true,
        ]);
    }

    /**
     * Vérifier un code de récupération (pour la connexion)
     */
    public function verifyRecoveryCode(Request $request)
    {
        $request->validate([
            'recovery_code' => 'required|string|size:8',
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::findOrFail($request->user_id);

        if (!$user->two_factor_enabled) {
            return response()->json([
                'message' => '2FA is not enabled for this user',
            ], 400);
        }

        $valid = $this->twoFactorService->verifyRecoveryCode($user, strtoupper($request->recovery_code));

        if (!$valid) {
            throw ValidationException::withMessages([
                'recovery_code' => ['Le code de récupération est incorrect ou déjà utilisé.'],
            ]);
        }

        return response()->json([
            'message' => 'Recovery code verified successfully',
            'verified' => true,
        ]);
    }

    /**
     * Régénérer les codes de récupération
     */
    public function regenerateRecoveryCodes(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (!$user->two_factor_enabled) {
            return response()->json([
                'message' => '2FA is not enabled',
            ], 400);
        }

        // Vérifier le mot de passe
        if (!\Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Le mot de passe est incorrect.'],
            ]);
        }

        try {
            $recoveryCodes = $this->twoFactorService->regenerateRecoveryCodes($user);

            return response()->json([
                'message' => 'Recovery codes regenerated successfully',
                'recovery_codes' => $recoveryCodes,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Obtenir le statut 2FA de l'utilisateur
     */
    public function status(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'enabled' => $user->two_factor_enabled,
            'enabled_at' => $user->two_factor_enabled_at,
        ]);
    }
}



