'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileCheck2, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

interface PartnerDocumentsSetting {
  required: boolean;
  can_change: boolean;
  last_change: string | null;
  partners_total: number;
  partners_non_compliant: number;
}

export default function AdminPartnerDocumentsSettingsPage() {
  const { showError, showSuccess } = useToast();
  const [setting, setSetting] = useState<PartnerDocumentsSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings/partner-documents')
      .then((res) => setSetting(res.data))
      .catch(() => showError('Erreur lors du chargement du réglage'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = async (required: boolean) => {
    setSaving(true);
    try {
      const res = await api.put('/settings/partner-documents', { required });
      setSetting(res.data);
      setConfirming(false);
      useAppSettingsStore.getState().fetchSettings();
      showSuccess(required ? 'Documents partenaires : désormais obligatoires' : 'Documents partenaires : désormais facultatifs');
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageShell
      icon={FileCheck2}
      title="Documents partenaires"
      description="Pièce d'identité, justificatif de domicile, licence d'exploitation, RCCM et document fiscal : obligatoires ou facultatifs pour ajouter un établissement."
    >
      {loading || !setting ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <section className="card">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 rounded-xl p-2 ${setting.required ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                {setting.required ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">État actuel</p>
                <h2 className="text-lg font-bold" data-testid="documents-state">
                  {setting.required ? 'Documents obligatoires' : 'Documents facultatifs'}
                </h2>
                {setting.last_change && (
                  <p className="text-xs text-gray-500 mt-1">Dernière modification : {setting.last_change}</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mt-5 text-sm">
              <div className={`rounded-xl border p-4 ${!setting.required ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                <p className="font-semibold mb-2">Facultatifs</p>
                <ul className="list-disc pl-4 space-y-1 text-gray-600 dark:text-gray-300">
                  <li>Un partenaire ajoute ses établissements dès que ses informations de contact sont complètes.</li>
                  <li>Aucune validation du compte par un administrateur n&apos;est nécessaire pour cela.</li>
                  <li>Aucune relance de conformité n&apos;est envoyée.</li>
                  <li>Les documents restent déposables et consultables : rien n&apos;est effacé.</li>
                </ul>
              </div>
              <div className={`rounded-xl border p-4 ${setting.required ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                <p className="font-semibold mb-2">Obligatoires</p>
                <ul className="list-disc pl-4 space-y-1 text-gray-600 dark:text-gray-300">
                  <li>Le profil doit être complet à 100 %, documents et numéros compris.</li>
                  <li>Un administrateur doit valider le compte avant le premier établissement.</li>
                  <li>Les relances de conformité reprennent chaque matin.</li>
                </ul>
              </div>
            </div>
          </section>

          {!setting.required && setting.partners_non_compliant > 0 && (
            <p className="text-sm rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 p-4">
              Si vous les rendez obligatoires maintenant, <strong>{setting.partners_non_compliant} partenaire{setting.partners_non_compliant > 1 ? 's' : ''} sur {setting.partners_total}</strong>{' '}
              n&apos;aurai{setting.partners_non_compliant > 1 ? 'ent' : 't'} pas tous leurs documents et ne pourrai{setting.partners_non_compliant > 1 ? 'ent' : 't'} plus ajouter d&apos;établissement
              (leurs établissements déjà publiés ne sont pas touchés). Suivez-les dans{' '}
              <Link href="/dashboard/admin/conformite" className="underline">Conformité</Link>.
            </p>
          )}

          {setting.can_change ? (
            <section className="card">
              {!confirming ? (
                <button
                  type="button"
                  onClick={() => (setting.required ? change(false) : setConfirming(true))}
                  disabled={saving}
                  className={setting.required ? 'btn-outline' : 'btn-primary'}
                >
                  {setting.required ? 'Rendre les documents facultatifs' : 'Rendre les documents obligatoires'}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">
                    Confirmer ? À partir de maintenant, un partenaire devra avoir un profil complet et validé pour ajouter un établissement,
                    et les relances de conformité reprendront.
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => change(true)} disabled={saving} className="btn-primary">
                      {saving ? 'Enregistrement…' : 'Oui, rendre obligatoires'}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} disabled={saving} className="btn-outline">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3">Le changement est immédiat et réversible à tout moment.</p>
            </section>
          ) : (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Lock className="w-4 h-4" /> Seul le super administrateur peut modifier ce réglage.
            </p>
          )}
        </div>
      )}
    </SettingsPageShell>
  );
}
