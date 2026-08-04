<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;

class SecurityService
{
    /**
     * Vérifier et bloquer les IPs suspectes
     */
    public static function checkSuspiciousActivity(Request $request, string $action): bool
    {
        $ip = $request->ip();
        $key = "suspicious_activity:{$ip}:{$action}";
        
        $attempts = Cache::get($key, 0);
        
        // Si plus de 10 tentatives suspectes en 1 heure, bloquer
        if ($attempts >= 10) {
            Log::channel('security')->warning('Suspicious activity detected - IP blocked', [
                'ip' => $ip,
                'action' => $action,
                'attempts' => $attempts,
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toIso8601String(),
            ]);
            
            return false;
        }
        
        return true;
    }

    /**
     * Enregistrer une activité suspecte
     */
    public static function recordSuspiciousActivity(Request $request, string $action): void
    {
        $ip = $request->ip();
        $key = "suspicious_activity:{$ip}:{$action}";
        
        $attempts = Cache::increment($key);
        Cache::put($key, $attempts, now()->addHour());
        
        Log::channel('security')->warning('Suspicious activity recorded', [
            'ip' => $ip,
            'action' => $action,
            'attempts' => $attempts,
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Valider et nettoyer les données sensibles
     */
    public static function sanitizeInput($data)
    {
        if (is_array($data)) {
            return array_map([self::class, 'sanitizeInput'], $data);
        }
        
        if (is_string($data)) {
            // Supprimer les caractères de contrôle
            $data = preg_replace('/[\x00-\x1F\x7F]/', '', $data);
            // Échapper les caractères HTML
            $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
        }
        
        return $data;
    }

    /**
     * Valider l'email de manière stricte
     */
    public static function validateEmail(string $email): bool
    {
        // Validation stricte de l'email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        
        // Vérifier la longueur
        if (strlen($email) > 255) {
            return false;
        }
        
        // Vérifier les caractères dangereux
        if (preg_match('/[<>"\']/', $email)) {
            return false;
        }
        
        return true;
    }

    /**
     * Valider le numéro de téléphone
     */
    public static function validatePhone(string $phone): bool
    {
        // Nettoyer le numéro
        $phone = preg_replace('/[^0-9+]/', '', $phone);
        
        // Vérifier la longueur (entre 8 et 20 caractères)
        if (strlen($phone) < 8 || strlen($phone) > 20) {
            return false;
        }
        
        return true;
    }

    /**
     * Générer un token CSRF sécurisé
     */
    public static function generateCsrfToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Vérifier le token CSRF
     */
    public static function verifyCsrfToken(string $token, string $storedToken): bool
    {
        return hash_equals($storedToken, $token);
    }
}

