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

        return $this->getAdminSettings($request);
    }
}

