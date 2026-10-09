'use client';

import { useEffect, useState } from 'react';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
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
  const [whatsappUseTemplates, setWhatsappUseTemplates] = useState(false);
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState('');
  const [whatsappAppSecret, setWhatsappAppSecret] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  // Module IA : interrupteur général, modèle, ouverture aux visiteurs non connectés
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState('');
  const [aiModelDefault, setAiModelDefault] = useState('claude-opus-5-5');
  const [aiGuestEnabled, setAiGuestEnabled] = useState(true);
  const [aiGuestDailyLimit, setAiGuestDailyLimit] = useState('300');

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
        setWhatsappUseTemplates(!!s.whatsapp_use_templates);
        setWhatsappToken(s.whatsapp_token ?? '');
        setWhatsappPhoneId(s.whatsapp_phone_id ?? '');
        setWhatsappVerifyToken(s.whatsapp_verify_token ?? '');
        setWhatsappAppSecret(s.whatsapp_app_secret ?? '');
        setAnthropicApiKey(s.anthropic_api_key ?? '');
        setAiEnabled(!!s.ai_enabled);
        setAiModel(s.anthropic_model ?? '');
        setAiModelDefault(s.anthropic_model_default || 'claude-opus-5-5');
        setAiGuestEnabled(s.ai_guest_enabled !== false);
        setAiGuestDailyLimit(String(s.ai_guest_daily_limit ?? 300));
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
        whatsapp_use_templates: whatsappUseTemplates,
        whatsapp_token: whatsappToken.trim() || null,
        whatsapp_phone_id: whatsappPhoneId.trim() || null,
        whatsapp_verify_token: whatsappVerifyToken.trim() || null,
        whatsapp_app_secret: whatsappAppSecret.trim() || null,
        anthropic_api_key: anthropicApiKey.trim() || null,
        ai_enabled: aiEnabled,
        anthropic_model: aiModel || null,
        ai_guest_enabled: aiGuestEnabled,
        ai_guest_daily_limit: Math.max(0, parseInt(aiGuestDailyLimit, 10) || 0),
      };
      if (maintenanceEnabled) {
        payload.maintenance_message = maintenanceMessage.trim()
          || "La plateforme est momentanément en maintenance. Merci de revenir plus tard.";
      }
      if (!Number.isNaN(minN)) payload.booking_min_nights = minN;
      if (!Number.isNaN(maxN)) payload.booking_max_nights = maxN;

      await api.put('/settings/admin', payload);
      // Les menus et l'assistant flottant suivent l'interrupteur IA sans recharger la page.
      await useAppSettingsStore.getState().fetchSettings();
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
              <span className="text-sm">Inscription partenaires autorisée</span>
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
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-sm font-medium">Utiliser les modèles approuvés par Meta</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        À activer en production, une fois les 5 modèles approuvés dans WhatsApp Manager. Désactivé : messages texte libres (tests avec le numéro de test, ou réponse dans les 24 h).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWhatsappUseTemplates((v) => !v)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ${whatsappUseTemplates ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${whatsappUseTemplates ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
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
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                    <p className="text-sm font-medium">Suivi de livraison (webhook Meta)</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Facultatif. Permet de voir dans les journaux du site pourquoi un message WhatsApp n&apos;est pas livré. Dans Meta (application → WhatsApp → Configuration → Webhook), renseignez l&apos;URL ci-dessous, le jeton de vérification, et cochez le champ « messages ».
                    </p>
                    <div>
                      <label className="block text-sm font-medium mb-1">URL de rappel (à copier dans Meta)</label>
                      <input type="text" readOnly value={`${(process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api').replace(/\/$/, '')}/whatsapp/webhook`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Jeton de vérification</label>
                      <input type="text" value={whatsappVerifyToken} onChange={(e) => setWhatsappVerifyToken(e.target.value)} placeholder="Un mot de passe de votre choix, identique dans Meta"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Secret de l&apos;application Meta</label>
                      <input type="password" value={whatsappAppSecret} onChange={(e) => setWhatsappAppSecret(e.target.value)} placeholder="Paramètres de l'app → Général → Clé secrète"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Module IA — un seul interrupteur : désactivé, tout ce qui touche à l'IA disparaît du site */}
              <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4" /> Assistant IA (Claude / Anthropic)
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={aiEnabled}
                    aria-label="Activer l'assistant IA"
                    onClick={() => setAiEnabled((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ${aiEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Active l&apos;assistant voyageur (bulle en bas à droite du site), l&apos;assistant partenaire et le
                  « Renseignement IA » de l&apos;administration. Désactivé, tous ces éléments disparaissent du site.
                </p>
                <p className={`text-xs font-medium mb-3 ${!aiEnabled ? 'text-gray-500' : anthropicApiKey.trim() ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {!aiEnabled
                    ? 'État : désactivé.'
                    : anthropicApiKey.trim()
                    ? 'État : activé. Enregistrez pour appliquer.'
                    : 'État : activé, mais sans clé API — les assistants restent masqués tant que la clé n’est pas renseignée.'}
                </p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="anthropic-key" className="block text-sm font-medium mb-1">Clé API Anthropic</label>
                    <input id="anthropic-key" type="password" value={anthropicApiKey} onChange={(e) => setAnthropicApiKey(e.target.value)} placeholder="sk-ant-..."
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono" />
                    <p className="text-xs text-gray-500 mt-1">
                      À créer sur console.anthropic.com. Chaque question posée aux assistants est facturée sur ce compte.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="anthropic-model" className="block text-sm font-medium mb-1">Modèle</label>
                    <select id="anthropic-model" value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm">
                      <option value="">Par défaut ({aiModelDefault})</option>
                      <option value="claude-opus-5-5">Claude Opus 5.5 — le plus capable (4 $ / 20 $ par million de jetons)</option>
                      <option value="claude-sonnet-5-5">Claude Sonnet 5.5 — équilibré (2 $ / 10 $)</option>
                      <option value="claude-haiku-5-5">Claude Haiku 5.5 — le plus économique (0,10 $ / 0,50 $)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Tarifs indicatifs (entrée / sortie), à vérifier sur le site d&apos;Anthropic.</p>
                  </div>
                  <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                    <div>
                      <span className="text-sm font-medium">Ouvrir l&apos;assistant voyageur aux visiteurs non connectés</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ils peuvent chercher et comparer des hébergements, sans accès à aucun compte. Désactivé : la bulle
                        invite à se connecter.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={aiGuestEnabled}
                      aria-label="Ouvrir l'assistant aux visiteurs non connectés"
                      onClick={() => setAiGuestEnabled((v) => !v)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ${aiGuestEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${aiGuestEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {aiGuestEnabled && (
                    <div>
                      <label htmlFor="ai-guest-limit" className="block text-sm font-medium mb-1">Plafond quotidien des visiteurs non connectés</label>
                      <input id="ai-guest-limit" type="number" min={0} value={aiGuestDailyLimit} onChange={(e) => setAiGuestDailyLimit(e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
                      <p className="text-xs text-gray-500 mt-1">
                        Nombre total de questions par jour, tous visiteurs non connectés confondus (chacun est aussi limité à
                        20 par jour). Au-delà, la bulle invite à se connecter. Sert à maîtriser le coût.
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
