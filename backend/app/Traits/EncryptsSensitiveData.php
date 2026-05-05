<?php

namespace App\Traits;

use Illuminate\Support\Facades\Crypt;

trait EncryptsSensitiveData
{
    /**
     * Chiffrer une donnée sensible
     */
    protected function encryptSensitiveData($data): string
    {
        if (empty($data)) {
            return '';
        }
        
        return Crypt::encryptString($data);
    }

    /**
     * Déchiffrer une donnée sensible
     */
    protected function decryptSensitiveData($encryptedData): string
    {
        if (empty($encryptedData)) {
            return '';
        }
        
        try {
            return Crypt::decryptString($encryptedData);
        } catch (\Exception $e) {
            \Log::error('Failed to decrypt sensitive data', [
                'error' => $e->getMessage(),
            ]);
            return '';
        }
    }

    /**
     * Chiffrer les données sensibles d'un tableau
     */
    protected function encryptSensitiveFields(array $data, array $sensitiveFields): array
    {
        foreach ($sensitiveFields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                $data[$field] = $this->encryptSensitiveData($data[$field]);
            }
        }
        
        return $data;
    }

    /**
     * Déchiffrer les données sensibles d'un tableau
     */
    protected function decryptSensitiveFields(array $data, array $sensitiveFields): array
    {
        foreach ($sensitiveFields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                $data[$field] = $this->decryptSensitiveData($data[$field]);
            }
        }
        
        return $data;
    }
}

