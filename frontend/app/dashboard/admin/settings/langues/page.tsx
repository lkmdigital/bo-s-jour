'use client';

import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';

const AVAILABLE_LANGUAGES = [
  { code: 'fr', label: 'Français', locked: true },
  { code: 'en', label: 'English', locked: false },
];

export default function AdminLanguagesSettingsPage() {
  const { showError, showSuccess } = useToast();
  const [enabled, setEnabled] = useState<string[]>(['fr', 'en']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings/admin')
      .then((res) => setEnabled(res.data?.languages_enabled ?? ['fr', 'en']))
      .catch(() => showError('Erreur lors du chargement'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (code: string) => {
    if (code === 'fr') return; // langue de base, non désactivable
    setEnabled((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings/admin', { languages_enabled: enabled });
      showSuccess('Langues mises à jour');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageShell
      icon={Languages}
      title="Langues"
      description="Langues proposées aux voyageurs dans l'espace membre et le sélecteur de langue."
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <section className="card space-y-4">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <div key={lang.code} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{lang.label}</p>
                {lang.locked && (
                  <p className="text-xs text-gray-500">Langue de base — toujours active</p>
                )}
              </div>
              <button
                type="button"
                disabled={lang.locked}
                onClick={() => toggle(lang.code)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  enabled.includes(lang.code) ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    enabled.includes(lang.code) ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}

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
