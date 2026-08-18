'use client';

import { useEffect, useState } from 'react';
import { MessageSquareText, Mail } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';

const EMAIL_TEMPLATES = [
  { name: 'Confirmation de réservation', trigger: 'Envoyé dès la confirmation du paiement' },
  { name: 'Rappel avant séjour', trigger: 'Envoyé quelques jours avant la date d\'arrivée' },
  { name: 'Confirmation de paiement', trigger: 'Envoyé après chaque paiement réussi' },
  { name: 'Annulation de réservation', trigger: 'Envoyé lors de l\'annulation d\'un séjour' },
  { name: 'Lien d\'avis post-séjour', trigger: 'Envoyé après la date de départ' },
  { name: 'Rappel d\'activation (voyageur)', trigger: 'Envoyé si le compte reste inactivé' },
  { name: 'Rappel d\'intégration (hôte)', trigger: 'Envoyé si l\'inscription hôte reste incomplète' },
  { name: 'Réinitialisation du mot de passe', trigger: 'Envoyé à la demande de l\'utilisateur' },
];

export default function AdminTemplatesSettingsPage() {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState('');
  const [defaultTemplate, setDefaultTemplate] = useState('');

  useEffect(() => {
    api.get('/settings/admin')
      .then((res) => {
        const value = res.data?.whatsapp_template_confirmation ?? '';
        setTemplate(value);
        setDefaultTemplate(value);
      })
      .catch(() => showError('Erreur lors du chargement'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!template.trim()) {
      showError('Le modèle ne peut pas être vide');
      return;
    }
    setSaving(true);
    try {
      await api.put('/settings/admin', { whatsapp_template_confirmation: template });
      showSuccess('Modèle WhatsApp enregistré');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setTemplate(defaultTemplate);

  return (
    <SettingsPageShell
      icon={MessageSquareText}
      title="Modèles"
      description="Message WhatsApp automatique de confirmation et aperçu des e-mails transactionnels."
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          <section className="card space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              WhatsApp — Confirmation de réservation
            </h2>
            <p className="text-sm text-gray-500">
              Envoyé au voyageur en double canal avec l&apos;e-mail (si WhatsApp Business est configuré dans
              Réglages avancés). Espaces réservés disponibles :{' '}
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{'{etablissement}'}</code>{' '}
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{'{code}'}</code>{' '}
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{'{arrivee}'}</code>{' '}
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{'{depart}'}</code>.
            </p>
            <textarea
              rows={6}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono"
            />
            <div className="flex justify-between items-center pt-1">
              <button type="button" onClick={reset} className="text-sm text-gray-500 hover:text-primary">
                Réinitialiser
              </button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </section>

          <section className="card">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5">
              <Mail className="w-4 h-4" /> E-mails transactionnels
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Modèles gérés par le code de l&apos;application — leur contenu n&apos;est pas encore
              personnalisable depuis cette interface.
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {EMAIL_TEMPLATES.map((t) => (
                <div key={t.name} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                  <span className="text-xs text-gray-400">{t.trigger}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </SettingsPageShell>
  );
}
