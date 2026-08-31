'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, ShieldCheck, Sparkles, Calendar, UserPlus, Bell, KeyRound, Map, BrainCircuit } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';

export default function AdminAdvancedSettingsPage() {
  const { showError, showSuccess, showWarning } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [eventTheme, setEventTheme] = useState<'default' | 'noel' | 'nouvel_an' | 'paques'>('default');
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [bookingMinNights, setBookingMinNights] = useState('1');
  const [bookingMaxNights, setBookingMaxNights] = useState('30');
  const [registrationHostsEnabled, setRegistrationHostsEnabled] = useState(true);
  const [mapsProvider, setMapsProvider] = useState<'osm' | 'mapbox'>('osm');
  const [mapboxToken, setMapboxToken] = useState('');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');

  useEffect(() => {
    api.get('/settings/admin')
      .then((res) => {
        const s = res.data || {};
        setMaintenanceEnabled(!!s.maintenance_enabled);
        setMaintenanceMessage(s.maintenance_message ?? '');
        setEventTheme(['default', 'noel', 'nouvel_an', 'paques'].includes(s.theme_mode) ? s.theme_mode : 'default');
        setGroupNotifications(typeof s.notifications_grouped === 'boolean' ? s.notifications_grouped : true);
        setBookingMinNights(String(s.booking_min_nights ?? 1));
        setBookingMaxNights(String(s.booking_max_nights ?? 30));
        setRegistrationHostsEnabled(typeof s.registration_hosts_enabled === 'boolean' ? s.registration_hosts_enabled : true);
        setMapsProvider(s.maps_provider === 'mapbox' ? 'mapbox' : 'osm');
        setMapboxToken(s.mapbox_token ?? '');
        setGoogleMapsApiKey(s.google_maps_api_key ?? '');
        setWhatsappEnabled(!!s.whatsapp_enabled);
        setWhatsappToken(s.whatsapp_token ?? '');
        setWhatsappPhoneId(s.whatsapp_phone_id ?? '');
        setAnthropicApiKey(s.anthropic_api_key ?? '');
      })
      .catch(() => showError('Erreur lors du chargement'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    const minN = parseInt(bookingMinNights, 10);
    const maxN = parseInt(bookingMaxNights, 10);
    if (!Number.isNaN(minN) && !Number.isNaN(maxN) && minN > maxN) {
      showWarning('Les nuitées min doivent être inférieures ou égales aux nuitées max');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        maintenance_enabled: maintenanceEnabled,
        theme_mode: eventTheme,
        notifications_grouped: groupNotifications,
        registration_hosts_enabled: registrationHostsEnabled,
        maps_provider: mapsProvider,
        mapbox_token: mapboxToken.trim() || null,
        google_maps_api_key: googleMapsApiKey.trim() || null,
        whatsapp_enabled: whatsappEnabled,
        whatsapp_token: whatsappToken.trim() || null,
        whatsapp_phone_id: whatsappPhoneId.trim() || null,
        anthropic_api_key: anthropicApiKey.trim() || null,
      };
      if (maintenanceEnabled) {
        payload.maintenance_message = maintenanceMessage.trim()
          || "La plateforme est momentanément en maintenance. Merci de revenir plus tard.";
      }
      if (!Number.isNaN(minN)) payload.booking_min_nights = minN;
      if (!Number.isNaN(maxN)) payload.booking_max_nights = maxN;

      await api.put('/settings/admin', payload);
      showSuccess('Réglages avancés enregistrés');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageShell
      icon={SlidersHorizontal}
      title="Réglages avancés"
      description="Maintenance, thème événementiel, réservations, inscriptions et intégrations techniques."
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" /> Maintenance
            </h2>
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-sm">Activée</span>
              <button
                type="button"
                onClick={() => setMaintenanceEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${maintenanceEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${maintenanceEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            <textarea
              rows={2}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
              placeholder="Message affiché pendant la maintenance"
            />
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" /> Thème
            </h2>
            <select
              value={eventTheme}
              onChange={(e) => setEventTheme(e.target.value as typeof eventTheme)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="default">Standard</option>
              <option value="noel">Noël</option>
              <option value="nouvel_an">Nouvel an</option>
              <option value="paques">Pâques</option>
            </select>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" /> Réservations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nuitées min</label>
                <input type="number" min={1} max={365} value={bookingMinNights} onChange={(e) => setBookingMinNights(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nuitées max</label>
                <input type="number" min={1} max={365} value={bookingMaxNights} onChange={(e) => setBookingMaxNights(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-primary" /> Inscription
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm">Inscription hôtes autorisée</span>
              <button
                type="button"
                onClick={() => setRegistrationHostsEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${registrationHostsEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${registrationHostsEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" /> Notifications
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm">Regroupées</span>
              <button
                type="button"
                onClick={() => setGroupNotifications((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${groupNotifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${groupNotifications ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
              <KeyRound className="w-5 h-5 text-primary" /> Intégrations & API externes
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Clés « navigateur » (non secrètes) — à restreindre par domaine chez le fournisseur.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Map className="w-4 h-4" /> Fond de carte (page résultats)
                </label>
                <select
                  value={mapsProvider}
                  onChange={(e) => setMapsProvider(e.target.value as 'osm' | 'mapbox')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="osm">OpenStreetMap (gratuit, sans clé)</option>
                  <option value="mapbox">Mapbox (nécessite un jeton)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Jeton public Mapbox</label>
                <input type="text" value={mapboxToken} onChange={(e) => setMapboxToken(e.target.value)} placeholder="pk.xxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Clé API Google Maps</label>
                <input type="text" value={googleMapsApiKey} onChange={(e) => setGoogleMapsApiKey(e.target.value)} placeholder="AIzaSy..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono" />
              </div>
              <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">WhatsApp Business API (double confirmation)</span>
                  <button
                    type="button"
                    onClick={() => setWhatsappEnabled((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${whatsappEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${whatsappEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Token WhatsApp (Meta)</label>
                    <input type="password" value={whatsappToken} onChange={(e) => setWhatsappToken(e.target.value)} placeholder="EAAG..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number ID</label>
                    <input type="text" value={whatsappPhoneId} onChange={(e) => setWhatsappPhoneId(e.target.value)} placeholder="1234567890"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono" />
                  </div>
                </div>
              </div>
              {/* Module IA masqué le 2026-08-27 en attendant un échange avec le client sur la
              confidentialité documentaire — les routes /ai/* sont désactivées côté backend,
              ce champ n'aurait donc aucun effet tant qu'elles ne sont pas réactivées.
              <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium flex items-center gap-1.5 mb-3">
                  <BrainCircuit className="w-4 h-4" /> Module IA (Renseignement IA — Claude / Anthropic)
                </span>
                <div>
                  <label className="block text-sm font-medium mb-1">Clé API Anthropic</label>
                  <input type="password" value={anthropicApiKey} onChange={(e) => setAnthropicApiKey(e.target.value)} placeholder="sk-ant-..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono" />
                  <p className="text-xs text-gray-500 mt-1">
                    Tant qu'elle est vide, l'assistant IA administrateur reste indisponible.
                  </p>
                </div>
              </div>
              */}
            </div>
          </section>

          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement…' : 'Enregistrer les réglages avancés'}
            </button>
          </div>
        </div>
      )}
    </SettingsPageShell>
  );
}
