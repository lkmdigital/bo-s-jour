'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import { useConfirm } from '@/components/common/ConfirmContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface DocumentType {
  id: number;
  key: string;
  label: string;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  documents_count: number;
}

interface Draft {
  id: number | null;
  label: string;
  description: string;
  is_required: boolean;
}

const EMPTY_DRAFT: Draft = { id: null, label: '', description: '', is_required: true };

export default function HostDocumentTypesManager({ documentsRequired }: { documentsRequired: boolean }) {
  const { showError, showSuccess } = useToast();
  const confirmAction = useConfirm();
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [canChange, setCanChange] = useState(false);

  const load = () =>
    api.get('/admin/host-document-types')
      .then((res) => { setTypes(res.data?.data ?? []); setCanChange(!!res.data?.can_change); })
      .catch(() => showError('Erreur lors du chargement des documents'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const patch = async (type: DocumentType, changes: Partial<DocumentType>) => {
    try {
      await api.put(`/admin/host-document-types/${type.id}`, changes);
      await load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const saveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.label.trim()) return;
    setSaving(true);
    const body = { label: draft.label.trim(), description: draft.description.trim() || null, is_required: draft.is_required };
    try {
      if (draft.id) {
        await api.put(`/admin/host-document-types/${draft.id}`, body);
        showSuccess('Document modifié');
      } else {
        await api.post('/admin/host-document-types', body);
        showSuccess('Document ajouté');
      }
      setDraft(null);
      await load();
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (type: DocumentType) => {
    const ok = await confirmAction({
      title: `Supprimer « ${type.label} » ?`,
      message: type.documents_count > 0
        ? `Ce document ne sera plus demandé aux établissements. Les ${type.documents_count} fichier(s) déjà fournis sont conservés.`
        : 'Ce document ne sera plus demandé aux établissements.',
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/host-document-types/${type.id}`);
      showSuccess('Document supprimé');
      await load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <section className="card space-y-4" aria-labelledby="documents-demandes-title">
      <div>
        <h2 id="documents-demandes-title" className="text-lg font-bold">Documents demandés</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Ajoutez ou retirez des documents et choisissez pour chacun s&apos;il est obligatoire ou facultatif.
          {documentsRequired
            ? " Les documents sont actuellement obligatoires : seuls ceux cochés « Obligatoire » bloquent l'ajout d'un établissement."
            : " Les documents sont actuellement facultatifs : ces choix s'appliqueront dès que vous les rendrez obligatoires ci-dessus."}
        </p>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {types.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-500">Aucun document demandé pour le moment.</p>
            )}
            {types.map((type) => (
              <div key={type.id} className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${type.is_active ? '' : 'opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                  {type.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{type.documents_count} fichier(s) fourni(s) via ce type</p>
                </div>

                <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-sm" role="group" aria-label={`Exigence de ${type.label}`}>
                  <button
                    type="button"
                    disabled={!canChange}
                    onClick={() => !type.is_required && patch(type, { is_required: true })}
                    className={`px-3 py-1.5 ${type.is_required ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                  >
                    Obligatoire
                  </button>
                  <button
                    type="button"
                    disabled={!canChange}
                    onClick={() => type.is_required && patch(type, { is_required: false })}
                    className={`px-3 py-1.5 border-l border-gray-200 dark:border-gray-600 ${!type.is_required ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                  >
                    Facultatif
                  </button>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={type.is_active}
                    disabled={!canChange}
                    onChange={(e) => patch(type, { is_active: e.target.checked })}
                  />
                  Actif
                </label>

                {canChange && <div className="flex gap-1">
                  <button
                    type="button"
                    title="Modifier"
                    aria-label={`Modifier ${type.label}`}
                    onClick={() => setDraft({ id: type.id, label: type.label, description: type.description ?? '', is_required: type.is_required })}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    aria-label={`Supprimer ${type.label}`}
                    onClick={() => remove(type)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>}
              </div>
            ))}
          </div>

          {!canChange ? (
            <p className="text-sm text-gray-500">Seul le super administrateur peut modifier les documents demandés.</p>
          ) : draft ? (
            <form onSubmit={saveDraft} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">{draft.id ? 'Modifier le document' : 'Nouveau type de document'}</h2>
              <div>
                <label htmlFor="doc-label" className="block text-sm font-medium mb-1">Nom du document</label>
                <input
                  id="doc-label"
                  type="text"
                  required
                  maxLength={150}
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Ex : Attestation d'assurance"
                />
              </div>
              <div>
                <label htmlFor="doc-description" className="block text-sm font-medium mb-1">Précision pour l&apos;établissement (optionnel)</label>
                <input
                  id="doc-description"
                  type="text"
                  maxLength={255}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.is_required}
                  onChange={(e) => setDraft({ ...draft, is_required: e.target.checked })}
                />
                Document obligatoire
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50">
                  <Check className="w-4 h-4" /> {draft.id ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button type="button" onClick={() => setDraft(null)} className="btn-outline text-sm inline-flex items-center gap-2">
                  <X className="w-4 h-4" /> Annuler
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setDraft({ ...EMPTY_DRAFT })} className="btn-primary text-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter un type de document
            </button>
          )}
        </div>
      )}
    </section>
  );
}
