<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Paramètres publics exposés au frontend (pas de données sensibles).
     */
    public function publicSettings()
    {
        return response()->json([
            'maintenance_enabled' => (bool) Setting::get('app_maintenance_enabled', false),
            'maintenance_message' => (string) Setting::get(
                'app_maintenance_message',
                "La plateforme est momentanément en maintenance. Merci de revenir plus tard."
            ),
            'theme_mode' => (string) Setting::get('app_theme_mode', 'default'),
            'app_name' => (string) Setting::get('app_name', 'Bosejour'),
            'app_support_email' => (string) Setting::get('app_support_email', ''),
            'app_support_phone' => (string) Setting::get('app_support_phone', ''),
            'app_currency' => (string) Setting::get('app_currency', 'XOF'),
            // Intégrations carte (clés navigateur, non sensibles)
            'maps_provider' => (string) Setting::get('maps_provider', 'osm'),
            'mapbox_token' => (string) Setting::get('mapbox_token', ''),
            'google_maps_api_key' => (string) Setting::get('google_maps_api_key', ''),
            // Juste le drapeau : jamais le token/phone_id (voir whatsapp_enabled côté admin).
            'whatsapp_verification_enabled' => (bool) Setting::get('whatsapp_enabled', false),
            'languages_enabled' => (array) Setting::get('languages_enabled', ['fr', 'en']),
        ]);
    }

    /**
     * Lecture des paramètres globaux (admin uniquement).
     */
    public function getAdminSettings(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'maintenance_enabled' => (bool) Setting::get('app_maintenance_enabled', false),
            'maintenance_message' => (string) Setting::get('app_maintenance_message', ''),
            'theme_mode' => (string) Setting::get('app_theme_mode', 'default'),
            'notifications_grouped' => (bool) Setting::get('app_notifications_grouped', true),
            'app_name' => (string) Setting::get('app_name', 'Bosejour'),
            'app_support_email' => (string) Setting::get('app_support_email', ''),
            'app_support_phone' => (string) Setting::get('app_support_phone', ''),
            'app_currency' => (string) Setting::get('app_currency', 'XOF'),
            'booking_min_nights' => (int) max(1, (int) Setting::get('booking_min_nights', 1)),
            'booking_max_nights' => (int) max(1, (int) Setting::get('booking_max_nights', 30)),
            'registration_hosts_enabled' => (bool) Setting::get('registration_hosts_enabled', true),
            // Intégrations & API externes
            'maps_provider' => (string) Setting::get('maps_provider', 'osm'),
            'mapbox_token' => (string) Setting::get('mapbox_token', ''),
            'google_maps_api_key' => (string) Setting::get('google_maps_api_key', ''),
            // WhatsApp Business API (Meta) — sensible, jamais exposé publiquement
            'whatsapp_enabled' => (bool) Setting::get('whatsapp_enabled', false),
            'whatsapp_token' => (string) Setting::get('whatsapp_token', ''),
            'whatsapp_phone_id' => (string) Setting::get('whatsapp_phone_id', ''),
            // Module IA (Claude/Anthropic) — sensible, jamais exposé publiquement.
            // Fallback .env géré côté AdminAiAssistantService, pas ici.
            'anthropic_api_key' => (string) Setting::get('anthropic_api_key', ''),
            // Paramètres > Langues
            'languages_enabled' => (array) Setting::get('languages_enabled', ['fr', 'en']),
            // Paramètres > Taxes de séjour
            'vat_rate' => (float) Setting::get('vat_rate', 18),
            'tourist_tax_enabled' => (bool) Setting::get('tourist_tax_enabled', false),
            'tourist_tax_mode' => (string) Setting::get('tourist_tax_mode', 'fixed'),
            'tourist_tax_amount' => (float) Setting::get('tourist_tax_amount', 0),
            // Paramètres > Modèles (WhatsApp)
            'whatsapp_template_confirmation' => (string) Setting::get(
                'whatsapp_template_confirmation',
                \App\Services\WhatsAppService::DEFAULT_CONFIRMATION_TEMPLATE
            ),
            // Paramètres > Facturation
            'deferred_payment_enabled' => (bool) Setting::get('deferred_payment_enabled', true),
            'billing_company_name' => (string) Setting::get('billing_company_name', ''),
            'billing_rccm' => (string) Setting::get('billing_rccm', ''),
            'billing_ncc' => (string) Setting::get('billing_ncc', ''),
            'billing_address' => (string) Setting::get('billing_address', ''),
            // Paramètres > Programme de fidélité (montants des bonus, cf. Setting::get()
            // dans LoyaltyService/AwardLoyaltyPoints/AwardLoyaltyBirthdayBonus/ReviewController)
            'loyalty_points_per_fcfa' => (float) Setting::get('loyalty_points_per_fcfa', 1 / 1000),
            'loyalty_first_booking_bonus' => (int) Setting::get('loyalty_first_booking_bonus', 0),
            'loyalty_birthday_bonus' => (int) Setting::get('loyalty_birthday_bonus', 50),
            'loyalty_review_bonus' => (int) Setting::get('loyalty_review_bonus', 50),
            'loyalty_referral_bonus_parrain' => (int) Setting::get('loyalty_referral_bonus_parrain', 50),
            'loyalty_referral_bonus_filleul' => (int) Setting::get('loyalty_referral_bonus_filleul', 50),
            'loyalty_voucher_validity_days' => (int) Setting::get('loyalty_voucher_validity_days', 180),
        ]);
    }

    /**
     * Mise à jour des paramètres globaux (admin uniquement).
     */
    public function updateAdminSettings(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'maintenance_enabled' => 'sometimes|boolean',
            'maintenance_message' => 'sometimes|string|max:500',
            'theme_mode' => 'sometimes|string|in:default,noel,nouvel_an,paques',
            'notifications_grouped' => 'sometimes|boolean',
            'app_name' => 'sometimes|string|max:100',
            'app_support_email' => 'sometimes|nullable|string|email|max:255',
            'app_support_phone' => 'sometimes|nullable|string|max:50',
            'app_currency' => 'sometimes|string|max:10',
            'booking_min_nights' => 'sometimes|integer|min:1|max:365',
            'booking_max_nights' => 'sometimes|integer|min:1|max:365',
            'registration_hosts_enabled' => 'sometimes|boolean',
            'maps_provider' => 'sometimes|string|in:osm,mapbox',
            'mapbox_token' => 'sometimes|nullable|string|max:255',
            'google_maps_api_key' => 'sometimes|nullable|string|max:255',
            'whatsapp_enabled' => 'sometimes|boolean',
            'whatsapp_token' => 'sometimes|nullable|string|max:1000',
            'whatsapp_phone_id' => 'sometimes|nullable|string|max:100',
            'anthropic_api_key' => 'sometimes|nullable|string|max:255',
            'languages_enabled' => ['sometimes', 'array', 'min:1', function ($attribute, $value, $fail) {
                if (!in_array('fr', $value, true)) {
                    $fail('Le français ne peut pas être désactivé (langue de base de la plateforme).');
                }
            }],
            'languages_enabled.*' => 'string|in:fr,en',
            'vat_rate' => 'sometimes|numeric|min:0|max:100',
            'tourist_tax_enabled' => 'sometimes|boolean',
            'tourist_tax_mode' => 'sometimes|string|in:fixed,percentage',
            'tourist_tax_amount' => 'sometimes|numeric|min:0',
            'whatsapp_template_confirmation' => 'sometimes|string|max:1000',
            'deferred_payment_enabled' => 'sometimes|boolean',
            'billing_company_name' => 'sometimes|nullable|string|max:191',
            'billing_rccm' => 'sometimes|nullable|string|max:100',
            'billing_ncc' => 'sometimes|nullable|string|max:100',
            'billing_address' => 'sometimes|nullable|string|max:500',
            'loyalty_points_per_fcfa' => 'sometimes|numeric|min:0',
            'loyalty_first_booking_bonus' => 'sometimes|integer|min:0',
            'loyalty_birthday_bonus' => 'sometimes|integer|min:0',
            'loyalty_review_bonus' => 'sometimes|integer|min:0',
            'loyalty_referral_bonus_parrain' => 'sometimes|integer|min:0',
            'loyalty_referral_bonus_filleul' => 'sometimes|integer|min:0',
            'loyalty_voucher_validity_days' => 'sometimes|integer|min:0',
        ]);

        if (array_key_exists('maintenance_enabled', $data)) {
            Setting::set('app_maintenance_enabled', $data['maintenance_enabled'], 'boolean', 'Mode maintenance');
        }

        if (array_key_exists('maintenance_message', $data)) {
            Setting::set('app_maintenance_message', $data['maintenance_message'], 'string', 'Message maintenance');
        }

        if (array_key_exists('theme_mode', $data)) {
            Setting::set('app_theme_mode', $data['theme_mode'], 'string', 'Thème événementiel');
        }

        if (array_key_exists('notifications_grouped', $data)) {
            Setting::set(
                'app_notifications_grouped',
                $data['notifications_grouped'],
                'boolean',
                'Notifications groupées'
            );
        }

        if (array_key_exists('app_name', $data)) {
            Setting::set('app_name', $data['app_name'], 'string', 'Nom de l\'application');
        }

        if (array_key_exists('app_support_email', $data)) {
            Setting::set('app_support_email', $data['app_support_email'] ?? '', 'string', 'Email support');
        }

        if (array_key_exists('app_support_phone', $data)) {
            Setting::set('app_support_phone', $data['app_support_phone'] ?? '', 'string', 'Téléphone support');
        }

        if (array_key_exists('app_currency', $data)) {
            Setting::set('app_currency', $data['app_currency'], 'string', 'Devise (ex. XOF)');
        }

        if (array_key_exists('booking_min_nights', $data)) {
            Setting::set('booking_min_nights', (int) $data['booking_min_nights'], 'number', 'Nuitées min réservation');
        }

        if (array_key_exists('booking_max_nights', $data)) {
            Setting::set('booking_max_nights', (int) $data['booking_max_nights'], 'number', 'Nuitées max réservation');
        }

        if (array_key_exists('registration_hosts_enabled', $data)) {
            Setting::set(
                'registration_hosts_enabled',
                $data['registration_hosts_enabled'],
                'boolean',
                'Inscription hôtes autorisée'
            );
        }

        if (array_key_exists('maps_provider', $data)) {
            Setting::set('maps_provider', $data['maps_provider'], 'string', 'Fournisseur de fond de carte');
        }

        if (array_key_exists('mapbox_token', $data)) {
            Setting::set('mapbox_token', $data['mapbox_token'] ?? '', 'string', 'Jeton public Mapbox');
        }

        if (array_key_exists('google_maps_api_key', $data)) {
            Setting::set('google_maps_api_key', $data['google_maps_api_key'] ?? '', 'string', 'Clé API Google Maps');
        }

        if (array_key_exists('whatsapp_enabled', $data)) {
            Setting::set('whatsapp_enabled', $data['whatsapp_enabled'], 'boolean', 'WhatsApp Business activé');
        }
        if (array_key_exists('whatsapp_token', $data)) {
            Setting::set('whatsapp_token', $data['whatsapp_token'] ?? '', 'string', 'Token WhatsApp Business API');
        }
        if (array_key_exists('whatsapp_phone_id', $data)) {
            Setting::set('whatsapp_phone_id', $data['whatsapp_phone_id'] ?? '', 'string', 'Phone Number ID WhatsApp');
        }
        if (array_key_exists('anthropic_api_key', $data)) {
            Setting::set('anthropic_api_key', $data['anthropic_api_key'] ?? '', 'string', 'Clé API Anthropic (Module IA)');
        }

        if (array_key_exists('languages_enabled', $data)) {
            Setting::set('languages_enabled', array_values($data['languages_enabled']), 'json', 'Langues actives');
        }

        if (array_key_exists('vat_rate', $data)) {
            Setting::set('vat_rate', (float) $data['vat_rate'], 'number', 'Taux de TVA (%)');
        }

        if (array_key_exists('tourist_tax_enabled', $data)) {
            Setting::set('tourist_tax_enabled', $data['tourist_tax_enabled'], 'boolean', 'Taxe de séjour activée');
        }

        if (array_key_exists('tourist_tax_mode', $data)) {
            Setting::set('tourist_tax_mode', $data['tourist_tax_mode'], 'string', 'Mode taxe de séjour (fixed/percentage)');
        }

        if (array_key_exists('tourist_tax_amount', $data)) {
            Setting::set('tourist_tax_amount', (float) $data['tourist_tax_amount'], 'number', 'Montant/taux taxe de séjour');
        }

        if (array_key_exists('whatsapp_template_confirmation', $data)) {
            Setting::set(
                'whatsapp_template_confirmation',
                $data['whatsapp_template_confirmation'],
                'string',
                'Modèle WhatsApp — confirmation de réservation'
            );
        }

        if (array_key_exists('deferred_payment_enabled', $data)) {
            Setting::set('deferred_payment_enabled', $data['deferred_payment_enabled'], 'boolean', 'Paiement différé autorisé');
        }

        if (array_key_exists('billing_company_name', $data)) {
            Setting::set('billing_company_name', $data['billing_company_name'] ?? '', 'string', 'Raison sociale (facturation)');
        }

        if (array_key_exists('billing_rccm', $data)) {
            Setting::set('billing_rccm', $data['billing_rccm'] ?? '', 'string', 'RCCM (facturation)');
        }

        if (array_key_exists('billing_ncc', $data)) {
            Setting::set('billing_ncc', $data['billing_ncc'] ?? '', 'string', 'NCC (facturation)');
        }

        if (array_key_exists('billing_address', $data)) {
            Setting::set('billing_address', $data['billing_address'] ?? '', 'string', 'Adresse de facturation');
        }

        if (array_key_exists('loyalty_points_per_fcfa', $data)) {
            Setting::set('loyalty_points_per_fcfa', (float) $data['loyalty_points_per_fcfa'], 'number', 'Points fidélité par FCFA dépensé');
        }

        if (array_key_exists('loyalty_first_booking_bonus', $data)) {
            Setting::set('loyalty_first_booking_bonus', (int) $data['loyalty_first_booking_bonus'], 'number', 'Bonus 1ère réservation (fidélité)');
        }

        if (array_key_exists('loyalty_birthday_bonus', $data)) {
            Setting::set('loyalty_birthday_bonus', (int) $data['loyalty_birthday_bonus'], 'number', 'Bonus anniversaire (fidélité)');
        }

        if (array_key_exists('loyalty_review_bonus', $data)) {
            Setting::set('loyalty_review_bonus', (int) $data['loyalty_review_bonus'], 'number', 'Bonus avis après séjour (fidélité)');
        }

        if (array_key_exists('loyalty_referral_bonus_parrain', $data)) {
            Setting::set('loyalty_referral_bonus_parrain', (int) $data['loyalty_referral_bonus_parrain'], 'number', 'Bonus parrainage — parrain');
        }

        if (array_key_exists('loyalty_referral_bonus_filleul', $data)) {
            Setting::set('loyalty_referral_bonus_filleul', (int) $data['loyalty_referral_bonus_filleul'], 'number', 'Bonus parrainage — filleul');
        }

        if (array_key_exists('loyalty_voucher_validity_days', $data)) {
            Setting::set('loyalty_voucher_validity_days', (int) $data['loyalty_voucher_validity_days'], 'number', 'Durée de validité des bons (jours)');
        }

        return $this->getAdminSettings($request);
    }
}

