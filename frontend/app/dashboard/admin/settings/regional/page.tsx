'use client';

import { useEffect, useState } from 'react';
import { Globe2, Mail, Phone } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';

export default function AdminRegionalSettingsPage() {
  const { showError, showSuccess, showWarning } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appName, setAppName] = useState('');
  const [appCurrency, setAppCurrency] = useState('XOF');
  const [appSupportEmail, setAppSupportEmail] = useState('');
  const [appSupportPhone, setAppSupportPhone] = useState('');

  useEffect(() => {
    api.get('/settings/admin')
      .then((res) => {
        const s = res.data || {};
        setAppName(s.app_name ?? '');
        setAppCurrency(s.app_currency ?? 'XOF');
        setAppSupportEmail(s.app_support_email ?? '');
        setAppSupportPhone(s.app_support_phone ?? '');
      })
      .catch(() => showError('Erreur lors du chargement'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!appCurrency.trim()) {
      showWarning('La devise est requise');
      return;
    }
    setSaving(true);
    try {
      await api.put('/settings/admin', {
        app_name: appName.trim(),
        app_currency: appCurrency.trim(),
        app_support_email: appSupportEmail.trim() || null,
        app_support_phone: appSupportPhone.trim(),
      });
      showSuccess('Paramètres régionaux enregistrés');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageShell
      icon={Globe2}
      title="Paramètres régionaux"
      description="Devise de la plateforme, nom de l'application et coordonnées de support affichées aux voyageurs et hôtes."
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <section className="card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom de l&apos;application</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="bo séjour"
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
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Mail className="w-4 h-4" /> Email support
              </label>
              <input
                type="email"
                value={appSupportEmail}
                onChange={(e) => setAppSupportEmail(e.target.value)}
                placeholder="contact@bosejour.ci"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Phone className="w-4 h-4" /> Téléphone support
              </label>
              <input
                type="text"
                value={appSupportPhone}
                onChange={(e) => setAppSupportPhone(e.target.value)}
                placeholder="+225 00 00 00 00 00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </section>
      )}
    </SettingsPageShell>
  );
}
