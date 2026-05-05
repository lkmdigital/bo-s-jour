<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Collection;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Support\Facades\Log;

class TwoFactorService
{
    protected $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Générer un secret 2FA pour un utilisateur
     */
    public function generateSecret(User $user): string
    {
        $secret = $this->google2fa->generateSecretKey();
        
        // Stocker temporairement le secret (sera confirmé lors de l'activation)
        // On ne le stocke pas encore dans la base de données
        return $secret;
    }

    /**
     * Générer le QR Code URL pour Google Authenticator
     */
    public function getQRCodeUrl(User $user, string $secret): string
    {
        $companyName = config('app.name', 'Bosejour');
        $companyEmail = $user->email;
        
        return $this->google2fa->getQRCodeUrl(
            $companyName,
            $companyEmail,
            $secret
        );
    }

    /**
     * Vérifier un code 2FA
     */
    public function verifyCode(User $user, string $code): bool
    {
        if (!$user->two_factor_enabled || !$user->two_factor_secret) {
            return false;
        }

        try {
            $secret = Crypt::decryptString($user->two_factor_secret);
            
            // Vérifier le code avec une fenêtre de 4 périodes (2 minutes de chaque côté)
            $valid = $this->google2fa->verifyKey($secret, $code, 4);
            
            if ($valid) {
                Log::channel('security')->info('2FA code verified successfully', [
                    'user_id' => $user->id,
                    'ip' => request()->ip(),
                    'timestamp' => now()->toIso8601String(),
                ]);
            } else {
                Log::channel('security')->warning('2FA code verification failed', [
                    'user_id' => $user->id,
                    'ip' => request()->ip(),
                    'timestamp' => now()->toIso8601String(),
                ]);
            }
            
            return $valid;
        } catch (\Exception $e) {
            Log::channel('security')->error('2FA verification error', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Vérifier un code de récupération
     */
    public function verifyRecoveryCode(User $user, string $code): bool
    {
        if (!$user->two_factor_enabled || !$user->two_factor_recovery_codes) {
            return false;
        }

        try {
            $recoveryCodes = json_decode(Crypt::decryptString($user->two_factor_recovery_codes), true);
            
            if (!is_array($recoveryCodes)) {
                return false;
            }

            $key = array_search($code, $recoveryCodes);
            
            if ($key !== false) {
                // Supprimer le code utilisé
                unset($recoveryCodes[$key]);
                
                // Mettre à jour les codes de récupération
                $user->update([
                    'two_factor_recovery_codes' => !empty($recoveryCodes) 
                        ? Crypt::encryptString(json_encode(array_values($recoveryCodes)))
                        : null,
                ]);
                
                Log::channel('security')->info('2FA recovery code used', [
                    'user_id' => $user->id,
                    'ip' => request()->ip(),
                    'timestamp' => now()->toIso8601String(),
                ]);
                
                return true;
            }
            
            return false;
        } catch (\Exception $e) {
            Log::channel('security')->error('2FA recovery code verification error', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Générer des codes de récupération
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = strtoupper(bin2hex(random_bytes(4))); // 8 caractères hex
        }
        return $codes;
    }

    /**
     * Activer le 2FA pour un utilisateur
     */
    public function enable(User $user, string $secret, string $verificationCode): bool
    {
        // Vérifier d'abord que le code est correct
        $tempUser = clone $user;
        $tempUser->two_factor_secret = Crypt::encryptString($secret);
        
        if (!$this->verifyCode($tempUser, $verificationCode)) {
            return false;
        }

        // Générer les codes de récupération
        $recoveryCodes = $this->generateRecoveryCodes();
        
        // Activer le 2FA
        $user->update([
            'two_factor_enabled' => true,
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_recovery_codes' => Crypt::encryptString(json_encode($recoveryCodes)),
            'two_factor_enabled_at' => now(),
        ]);

        Log::channel('security')->info('2FA enabled for user', [
            'user_id' => $user->id,
            'ip' => request()->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        return true;
    }

    /**
     * Désactiver le 2FA pour un utilisateur
     */
    public function disable(User $user): void
    {
        $user->update([
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_enabled_at' => null,
        ]);

        Log::channel('security')->info('2FA disabled for user', [
            'user_id' => $user->id,
            'ip' => request()->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Régénérer les codes de récupération
     */
    public function regenerateRecoveryCodes(User $user): array
    {
        if (!$user->two_factor_enabled) {
            throw new \Exception('2FA is not enabled for this user');
        }

        $recoveryCodes = $this->generateRecoveryCodes();
        
        $user->update([
            'two_factor_recovery_codes' => Crypt::encryptString(json_encode($recoveryCodes)),
        ]);

        Log::channel('security')->info('2FA recovery codes regenerated', [
            'user_id' => $user->id,
            'ip' => request()->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        return $recoveryCodes;
    }
}

