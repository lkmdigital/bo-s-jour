<?php

namespace App\Services;

use App\Models\Setting;

/**
 * État du module IA (assistants admin, partenaire et voyageur).
 *
 * Un seul interrupteur, réglé par l'admin dans Paramètres > Réglages avancés :
 * `ai_enabled`. Désactivé, toutes les routes IA répondent « introuvable » et le site
 * masque tout ce qui s'y rapporte. Pour que les assistants répondent réellement, il
 * faut en plus une clé API Anthropic (`anthropic_api_key`, ou ANTHROPIC_API_KEY).
 */
class AiModule
{
    /** Nombre de questions par jour pour un visiteur non connecté (par adresse IP). */
    public const GUEST_DAILY_LIMIT_PER_IP = 20;

    /** Plafond quotidien par défaut, tous visiteurs non connectés confondus. */
    public const DEFAULT_GUEST_DAILY_LIMIT = 300;

    /** L'admin a-t-il activé le module ? */
    public static function enabled(): bool
    {
        return (bool) Setting::get('ai_enabled', false);
    }

    /** Une clé API est-elle renseignée (réglage admin, sinon .env) ? */
    public static function configured(): bool
    {
        return self::apiKey() !== '';
    }

    /** Le module est activé ET utilisable : c'est ce que le site affiche. */
    public static function available(): bool
    {
        return self::enabled() && self::configured();
    }

    public static function apiKey(): string
    {
        return (string) (Setting::get('anthropic_api_key', '') ?: config('services.anthropic.api_key', ''));
    }

    /** Modèle Claude utilisé : réglage admin, sinon valeur par défaut de la configuration. */
    public static function model(): string
    {
        return (string) (Setting::get('anthropic_model', '') ?: config('services.anthropic.model', 'claude-opus-5-5'));
    }

    /** L'assistant voyageur répond-il aussi aux visiteurs non connectés ? */
    public static function guestsAllowed(): bool
    {
        return (bool) Setting::get('ai_guest_enabled', true);
    }

    /** Plafond quotidien global des questions de visiteurs non connectés (maîtrise du coût). */
    public static function guestDailyLimit(): int
    {
        return max(0, (int) Setting::get('ai_guest_daily_limit', self::DEFAULT_GUEST_DAILY_LIMIT));
    }
}
