'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileCheck2, Info, Lock } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import HostDocumentTypesManager from '@/components/dashboard/admin/HostDocumentTypesManager';

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
    } catch (err: unknown) {
      showError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const blocked = setting?.partners_non_compliant ?? 0;

  return (
    <SettingsPageShell
      icon={FileCheck2}
      title="Documents partenaires"
      description="Choisissez, pour chaque document, s'il est obligatoire, facultatif ou pas demandé, et si ces exigences s'appliquent pour ajouter un établissement."
    >
      {loading || !setting ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {/* Régime général : un seul interrupteur, son effet en clair et son impact avant de confirmer */}
          <section className={`rounded-2xl border p-5 ${setting.required ? 'border-amber-300 bg-amber-50/70 dark:bg-amber-900/10' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60'}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Régime général</p>
                <h2 className="mt-0.5 text-lg font-bold" data-testid="documents-state">
                  {setting.required ? 'Documents obligatoires' : 'Documents facultatifs'}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {setting.required
                    ? "Le profil doit être complet à 100 % et validé par un administrateur avant le premier établissement : seuls les documents marqués « Obligatoire » ci-dessous bloquent l'ajout. Les relances de conformité reprennent chaque matin."
                    : "Un partenaire ajoute ses établissements dès que ses informations de contact sont complètes. Aucune validation par un administrateur, aucune relance de conformité. Les documents restent déposables : rien n'est effacé."}
                </p>
                {setting.last_change && <p className="mt-1 text-xs text-gray-500">Dernière modification : {setting.last_change}</p>}
              </div>

              {setting.can_change ? (
                <div className="inline-flex flex-none rounded-full bg-white p-0.5 shadow-sm dark:bg-gray-700" role="group" aria-label="Régime général des documents">
                  <button
                    type="button"
                    aria-pressed={!setting.required}
                    disabled={saving}
                    onClick={() => { if (setting.required) change(false); else setConfirming(false); }}
                    className={`rounded-full px-5 py-2 text-sm font-bold ${!setting.required ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    Facultatifs
                  </button>
                  <button
                    type="button"
                    aria-pressed={setting.required}
                    disabled={saving}
                    onClick={() => { if (!setting.required) setConfirming(true); }}
                    className={`rounded-full px-5 py-2 text-sm font-bold ${setting.required ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    Obligatoires
                  </button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Lock className="w-4 h-4" /> Seul le super administrateur peut modifier ce réglage.
                </p>
              )}
            </div>

            {confirming && !setting.required && (
              <div className="mt-4 rounded-xl bg-amber-100 p-4 text-sm text-amber-950 dark:bg-amber-900/30 dark:text-amber-100" role="alertdialog" aria-label="Confirmer le passage en documents obligatoires">
                <p className="font-bold">Rendre les documents obligatoires ?</p>
                <p className="mt-1">
                  {blocked > 0 ? (
                    <>
                      <strong>{blocked} partenaire{blocked > 1 ? 's' : ''} sur {setting.partners_total}</strong>{' '}
                      ne pourrai{blocked > 1 ? 'ent' : 't'} plus ajouter d&apos;établissement tant qu&apos;il{blocked > 1 ? 's' : ''} n&apos;aurai{blocked > 1 ? 'ent' : 't'} pas tous leurs documents obligatoires.
                    </>
                  ) : (
                    'Aucun partenaire ne serait bloqué aujourd’hui.'
                  )}{' '}
                  Leurs établissements déjà publiés ne sont pas touchés. Réversible à tout moment. Suivi dans{' '}
                  <Link href="/dashboard/admin/conformite" className="underline">Conformité</Link>.
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => change(true)} disabled={saving} className="btn-primary text-sm">
                    {saving ? 'Enregistrement…' : 'Oui, rendre obligatoires'}
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} disabled={saving} className="btn-outline text-sm">Annuler</button>
                </div>
              </div>
            )}
          </section>

          <p className="flex items-start gap-2 px-1 text-sm text-gray-600 dark:text-gray-300">
            <Info className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              Dans tous les cas, le partenaire doit renseigner ses <strong>informations de contact</strong> (nom, téléphone, numéro de l&apos;établissement,
              date de naissance, adresse) pour ajouter un établissement. La biographie et le WhatsApp restent facultatifs.
            </span>
          </p>

          <HostDocumentTypesManager documentsRequired={setting.required} partnersTotal={setting.partners_total} />
        </div>
      )}
    </SettingsPageShell>
  );
}
