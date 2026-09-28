<?php

namespace App\Services\Ops;

/**
 * Rend une ligne de log brute lisible pour l'espace Ops (page "Flux de logs") :
 * sépare le message de son contexte JSON, classe par catégorie (Paiement,
 * WhatsApp, Sécurité...), traduit les clés de contexte connues en libellés
 * français, et masque les valeurs sensibles avant tout affichage à l'écran.
 */
class LogTranslator
{
    /** Fragment de clé (recherché en minuscules) → jamais affiché en clair. */
    private const SENSITIVE_KEY_FRAGMENTS = [
        'password', 'secret', 'token', 'api_key', 'apikey', 'authorization',
        'id_number', 'tax_account_number', 'rccm', 'card', 'cvv', 'iban',
    ];

    /** Clé de contexte connue → libellé affiché devant sa valeur. */
    private const CONTEXT_LABELS = [
        'payment_id' => 'Paiement #',
        'booking_id' => 'Réservation #',
        'reference' => 'Réf.',
        'payment_reference' => 'Réf. paiement',
        'transaction_id' => 'Transaction',
        'claimed_transaction_id' => 'Transaction réclamée',
        'our_transaction_id' => 'Notre transaction',
        'wamid' => 'Message WhatsApp',
        'to' => 'Destinataire',
        'admin_id' => 'Admin #',
        'admin_email' => 'Admin',
        'user_id' => 'Utilisateur #',
        'ip' => 'IP',
        'status' => 'Statut',
        'malia_status' => 'Statut Malia Pay',
        'code' => 'Code',
        'template' => 'Modèle',
        'threshold_hours' => 'Seuil (h)',
        'stuck_count' => 'Bloqués',
        'method' => 'Méthode',
        'status_code' => 'Code HTTP',
        'url' => 'URL',
        'user_agent' => 'Agent',
    ];

    /** Préfixe de message (insensible à la casse) → catégorie + couleur. Premier qui matche gagne. */
    private const CATEGORY_RULES = [
        ['prefix' => 'webhook malia-pay', 'category' => 'Paiement', 'color' => 'emerald'],
        ['prefix' => 'maliapay', 'category' => 'Paiement', 'color' => 'emerald'],
        ['prefix' => 'paiement confirmé', 'category' => 'Paiement', 'color' => 'emerald'],
        ['prefix' => "payments:flag-stuck-pending", 'category' => 'Paiement', 'color' => 'emerald'],
        ['prefix' => 'webhook whatsapp', 'category' => 'WhatsApp', 'color' => 'teal'],
        ['prefix' => 'whatsapp', 'category' => 'WhatsApp', 'color' => 'teal'],
        ['prefix' => 'ops :', 'category' => 'Ops', 'color' => 'indigo'],
        ['prefix' => 'profil mis à jour', 'category' => 'Compte', 'color' => 'sky'],
        ['prefix' => 'unauthenticated', 'category' => 'Sécurité', 'color' => 'rose'],
        ['prefix' => 'forbidden', 'category' => 'Sécurité', 'color' => 'rose'],
        ['prefix' => 'authentication/authorization failure', 'category' => 'Sécurité', 'color' => 'rose'],
        ['prefix' => 'sensitive route access', 'category' => 'Sécurité', 'color' => 'sky'],
    ];

    /** @return array{datetime: ?string, level: string, badgeColor: string, category: string, categoryColor: string, title: string, truncatedTitle: ?string, context: array<int, array{label: string, value: string}>} */
    public function translate(array $entry): array
    {
        [$message, $context] = $this->splitMessageAndContext($entry['message']);
        $level = $entry['level'];
        $lower = mb_strtolower($message);

        $category = 'Système';
        $categoryColor = 'gray';
        foreach (self::CATEGORY_RULES as $rule) {
            if (str_starts_with($lower, $rule['prefix'])) {
                $category = $rule['category'];
                $categoryColor = $rule['color'];
                break;
            }
        }
        if ($category === 'Système' && in_array($level, ['ERROR', 'CRITICAL', 'EMERGENCY', 'ALERT'], true)) {
            $category = 'Erreur système';
            $categoryColor = 'red';
        }

        $title = trim($message);
        $truncatedTitle = null;
        if (mb_strlen($title) > 220) {
            $truncatedTitle = mb_substr($title, 0, 220) . '…';
        }

        return [
            'datetime' => $entry['datetime'],
            'level' => $level,
            'badgeColor' => $this->colorForLevel($level),
            'category' => $category,
            'categoryColor' => $categoryColor,
            'title' => $title,
            'truncatedTitle' => $truncatedTitle,
            'context' => $this->formatContext($context),
        ];
    }

    private function splitMessageAndContext(string $raw): array
    {
        $pos = strpos($raw, ' {');
        if ($pos === false) {
            return [$raw, null];
        }

        $candidate = trim(substr($raw, $pos + 1));
        $decoded = json_decode($candidate, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return [rtrim(substr($raw, 0, $pos)), $decoded];
        }

        return [$raw, null];
    }

    /** @return array<int, array{label: string, value: string}> */
    private function formatContext(?array $context): array
    {
        if (!$context) {
            return [];
        }

        $chips = [];
        foreach ($context as $key => $value) {
            if ($this->isSensitiveKey((string) $key)) {
                $chips[] = ['label' => self::CONTEXT_LABELS[$key] ?? $key, 'value' => '••••••'];
                continue;
            }

            // Les objets/tableaux imbriqués (webhook_body, payload complet…) peuvent
            // contenir des informations personnelles de tiers (téléphone, e-mail) — jamais
            // affichés en détail sur cet écran, seulement signalés comme présents.
            if (is_array($value)) {
                $chips[] = ['label' => self::CONTEXT_LABELS[$key] ?? $key, 'value' => '{…} (' . count($value) . ' champ(s), voir le journal serveur pour le détail)'];
                continue;
            }

            $label = self::CONTEXT_LABELS[$key] ?? $key;
            $stringValue = is_bool($value) ? ($value ? 'oui' : 'non') : (string) ($value ?? '—');
            $chips[] = ['label' => $label, 'value' => mb_strlen($stringValue) > 140 ? mb_substr($stringValue, 0, 140) . '…' : $stringValue];
        }

        return $chips;
    }

    private function isSensitiveKey(string $key): bool
    {
        $key = mb_strtolower($key);
        foreach (self::SENSITIVE_KEY_FRAGMENTS as $fragment) {
            if (str_contains($key, $fragment)) {
                return true;
            }
        }

        return false;
    }

    private function colorForLevel(string $level): string
    {
        return match (strtoupper($level)) {
            'EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR' => 'red',
            'WARNING' => 'amber',
            'NOTICE', 'INFO' => 'blue',
            default => 'gray',
        };
    }
}
