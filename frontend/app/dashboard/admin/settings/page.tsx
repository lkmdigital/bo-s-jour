'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import {
  Settings,
  Wallet,
  ShieldCheck,
  Sparkles,
  Bell,
  Building2,
  Mail,
  Phone,
  Calendar,
  UserPlus,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const [commissionRate, setCommissionRate] = useState<string>('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [eventTheme, setEventTheme] = useState<'default' | 'noel' | 'nouvel_an' | 'paques'>('default');
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [appName, setAppName] = useState('');
  const [appSupportEmail, setAppSupportEmail] = useState('');
  const [appSupportPhone, setAppSupportPhone] = useState('');
  const [appCurrency, setAppCurrency] = useState('XOF');
  const [bookingMinNights, setBookingMinNights] = useState('1');
  const [bookingMaxNights, setBookingMaxNights] = useState('30');
  const [registrationHostsEnabled, setRegistrationHostsEnabled] = useState(true);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') loadSettings();
  }, [isAuthenticated, user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminRes = await api.get('/settings/admin');
      const s = adminRes.data || {};
      setMaintenanceEnabled(!!s.maintenance_enabled);
      setMaintenanceMessage(s.maintenance_message ?? '');
      setEventTheme(['default', 'noel', 'nouvel_an', 'paques'].includes(s.theme_mode) ? s.theme_mode : 'default');
      setGroupNotifications(typeof s.notifications_grouped === 'boolean' ? s.notifications_grouped : true);
      setAppName(s.app_name ?? '');
      setAppSupportEmail(s.app_support_email ?? '');
      setAppSupportPhone(s.app_support_phone ?? '');
      setAppCurrency(s.app_currency ?? 'XOF');
      setBookingMinNights(String(s.booking_min_nights ?? 1));
      setBookingMaxNights(String(s.booking_max_nights ?? 30));
      setRegistrationHostsEnabled(typeof s.registration_hosts_enabled === 'boolean' ? s.registration_hosts_enabled : true);

      try {
        const commissionRes = await api.get('/revenue/commission-rate');
        setCommissionRate(String(commissionRes.data?.commission_rate ?? 10));
      } catch {
        setCommissionRate('10');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erreur chargement paramètres');
    } finally {
      setLoading(false);
    }
  };

  const saveCommission = async () => {
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 8 || rate > 10) {
      alert('Taux entre 8 et 10');
      return;
    }
    setSaving(true);
    try {
      await api.put('/revenue/commission-rate', { commission_rate: rate });
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const saveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const rate = parseFloat(commissionRate);
      if (isNaN(rate) || rate < 8 || rate > 10) {
        alert('Taux de commission entre 8 et 10');
        setSavingGeneral(false);
        return;
      }

      const payload: Record<string, any> = {};

      // Maintenance: toujours envoyer l'état, message seulement si actif
      payload.maintenance_enabled = maintenanceEnabled;
      if (maintenanceEnabled) {
        const defaultMessage =
          "La plateforme est momentanément en maintenance. Merci de revenir plus tard.";
        const msg = maintenanceMessage.trim() || defaultMessage;
        payload.maintenance_message = msg;
        if (!maintenanceMessage.trim()) {
          setMaintenanceMessage(defaultMessage);
        }
      }

      // Thème : toujours sauvegardé (valeur simple)
      payload.theme_mode = eventTheme;

      // Notifications regroupées : bool simple
      payload.notifications_grouped = groupNotifications;

      // App / contact : autoriser aussi l'effacement volontaire
      payload.app_name = appName.trim();
      payload.app_support_email = appSupportEmail.trim() || null;
      payload.app_support_phone = appSupportPhone.trim();
      payload.app_currency = appCurrency.trim() || 'XOF';

      // Réservations : n'envoyer que si valeurs valides
      const minN = parseInt(bookingMinNights, 10);
      const maxN = parseInt(bookingMaxNights, 10);
      if (!Number.isNaN(minN)) {
        payload.booking_min_nights = minN;
      }
      if (!Number.isNaN(maxN)) {
        payload.booking_max_nights = maxN;
      }
      if (!Number.isNaN(minN) && !Number.isNaN(maxN) && minN > maxN) {
        alert('Nuitées min doit être inférieure ou égale à nuitées max');
        setSavingGeneral(false);
        return;
      }

      // Inscription hôtes : bool simple
      payload.registration_hosts_enabled = registrationHostsEnabled;

      await api.put('/settings/admin', payload);
      await api.put('/revenue/commission-rate', { commission_rate: rate });
      await loadSettings();
      alert('Paramètres enregistrés avec succès');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Erreur');
    } finally {
      setSavingGeneral(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Settings className="w-6 h-6 text-primary" />
          Paramètres
        </h1>

        {error && (
          <div className="mb-4">
            <ErrorDisplay error={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <div className="space-y-6">
          {/* App / Contact */}
          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              App & Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom de l&apos;app</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Bosejour"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Devise</label>
                <input
                  type="text"
                  value={appCurrency}
                  onChange={(e) => setAppCurrency(e.target.value)}
                  placeholder="XOF"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Mail className="w-4 h-4" /> Email support</label>
                <input
                  type="email"
                  value={appSupportEmail}
                  onChange={(e) => setAppSupportEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Phone className="w-4 h-4" /> Téléphone support</label>
                <input
                  type="text"
                  value={appSupportPhone}
                  onChange={(e) => setAppSupportPhone(e.target.value)}
                  placeholder="+225 00 00 00 00 00"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Commission */}
          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-primary" />
              Commission (%)
            </h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Taux</label>
                <input
                  type="number"
                  min={8}
                  max={10}
                  step={0.1}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">Valeur autorisée : 8 à 10%</p>
              </div>
              <button onClick={saveCommission} disabled={saving} className="btn-primary">
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </section>

          {/* Maintenance */}
          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Maintenance
            </h2>
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-sm">Activée</span>
              <button
                type="button"
                onClick={() => setMaintenanceEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  maintenanceEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    maintenanceEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                rows={2}
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          </section>

          {/* Thème */}
          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              Thème
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1">Mode</label>
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
            </div>
          </section>

          {/* Réservations */}
          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              Réservations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nuitées min</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={bookingMinNights}
                  onChange={(e) => setBookingMinNights(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nuitées max</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={bookingMaxNights}
                  onChange={(e) => setBookingMaxNights(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Inscription */}
          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-primary" />
              Inscription
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm">Inscription hôtes autorisée</span>
              <button
                type="button"
                onClick={() => setRegistrationHostsEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  registrationHostsEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    registrationHostsEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Notifications */}
          <section className="card">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm">Regroupées</span>
              <button
                type="button"
                onClick={() => setGroupNotifications((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  groupNotifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    groupNotifications ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          <div className="flex justify-end">
            <button onClick={saveGeneral} disabled={savingGeneral} className="btn-primary">
              {savingGeneral ? 'Enregistrement…' : 'Enregistrer tous les paramètres'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
