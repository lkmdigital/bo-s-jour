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

/** Les trois positions d'un document : obligatoire, facultatif, ou pas demandé du tout (inactif). */
type Level = 'required' | 'optional' | 'off';

const LEVELS: { value: Level; label: string }[] = [
  { value: 'required', label: 'Obligatoire' },
  { value: 'optional', label: 'Facultatif' },
  { value: 'off', label: 'Non demandé' },
];

const levelOf = (type: Pick<DocumentType, 'is_required' | 'is_active'>): Level =>
  !type.is_active ? 'off' : type.is_required ? 'required' : 'optional';

/** Traduit une position en champs de l'API. « Non demandé » désactive le type sans toucher à son exigence. */
const fieldsOf = (level: Level, current: boolean): { is_active: boolean; is_required: boolean } =>
  level === 'off' ? { is_active: false, is_required: current } : { is_active: true, is_required: level === 'required' };

interface Draft {
  id: number | null;
  label: string;
  description: string;
  level: Level;
}

const EMPTY_DRAFT: Draft = { id: null, label: '', description: '', level: 'optional' };

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Sélecteur à trois positions, utilisé dans le tableau et dans le formulaire. */
function LevelSelector({ value, onChange, disabled, label }: { value: Level; onChange: (v: Level) => void; disabled?: boolean; label: string }) {
  const tone: Record<Level, string> = {
    required: 'bg-primary text-white',
    optional: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
    off: 'bg-gray-500 text-white',
  };

  return (
    <div className="inline-flex rounded-full bg-gray-100 p-0.5 dark:bg-gray-700" role="group" aria-label={label}>
      {LEVELS.map((l) => (
        <button
          key={l.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === l.value}
          onClick={() => value !== l.value && onChange(l.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed ${value === l.value ? tone[l.value] : 'text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export default function HostDocumentTypesManager({ documentsRequired, partnersTotal }: { documentsRequired: boolean; partnersTotal: number }) {
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const setLevel = async (type: DocumentType, level: Level) => {
    try {
      await api.put(`/admin/host-document-types/${type.id}`, fieldsOf(level, type.is_required));
      await load();
    } catch (err: unknown) {
      showError(errorMessage(err, 'Erreur lors de la mise à jour'));
    }
  };

  const saveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.label.trim()) return;
    setSaving(true);
    const current = draft.id ? (types.find((t) => t.id === draft.id)?.is_required ?? false) : false;
    const body = { label: draft.label.trim(), description: draft.description.trim() || null, ...fieldsOf(draft.level, current) };
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
    } catch (err: unknown) {
      showError(errorMessage(err, "Erreur lors de l'enregistrement"));
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
    } catch (err: unknown) {
      showError(errorMessage(err, 'Erreur lors de la suppression'));
    }
  };

  return (
    <section className="card space-y-4" aria-labelledby="documents-demandes-title">
      <div>
        <h2 id="documents-demandes-title" className="text-lg font-bold">Documents demandés</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Pour chaque document : <strong>Obligatoire</strong>, <strong>Facultatif</strong> ou <strong>Non demandé</strong> (il disparaît des formulaires, les fichiers déjà fournis sont conservés).
          {documentsRequired
            ? " Les documents sont actuellement obligatoires : seuls ceux marqués « Obligatoire » bloquent l'ajout d'un établissement."
            : " Les documents sont actuellement facultatifs : « Obligatoire » ne s'appliquera qu'une fois le régime général passé en « Obligatoires »."}
        </p>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_19rem_9rem_5.5rem] gap-4 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <span>Document demandé</span><span>Exigence</span><span>Fournis</span><span />
            </div>
            {types.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">Aucun document demandé pour le moment.</p>}
            {types.map((type) => {
              const level = levelOf(type);
              const pct = partnersTotal > 0 ? Math.min(100, Math.round((type.documents_count / partnersTotal) * 100)) : 0;
              return (
                <div key={type.id} className={`grid gap-3 md:grid-cols-[minmax(0,1fr)_19rem_9rem_5.5rem] md:items-center md:gap-4 px-4 py-3.5 border-t border-gray-100 dark:border-gray-700 ${level === 'off' ? 'opacity-60' : ''}`}>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {type.label}
                      {level === 'required' && !documentsRequired && (
                        <span className="ml-2 text-[11.5px] font-medium text-gray-500">· s&apos;appliquera en mode obligatoire</span>
                      )}
                    </p>
                    {type.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</p>}
                  </div>
                  <LevelSelector value={level} onChange={(v) => setLevel(type, v)} disabled={!canChange} label={`Exigence de ${type.label}`} />
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" aria-hidden="true">
                      <span className="block h-full bg-green-600" style={{ width: `${pct}%` }} />
                    </span>
                    <span><strong className="text-gray-900 dark:text-white">{type.documents_count}</strong>{partnersTotal > 0 ? ` / ${partnersTotal}` : ''}</span>
                  </div>
                  {canChange ? (
                    <div className="flex gap-1 md:justify-end">
                      <button
                        type="button"
                        title="Modifier"
                        aria-label={`Modifier ${type.label}`}
                        onClick={() => setDraft({ id: type.id, label: type.label, description: type.description ?? '', level })}
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
                    </div>
                  ) : <span />}
                </div>
              );
            })}
          </div>

          {!canChange ? (
            <p className="text-sm text-gray-500">Seul le super administrateur peut modifier les documents demandés.</p>
          ) : draft ? (
            <form onSubmit={saveDraft} className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{draft.id ? 'Modifier le document' : 'Nouveau document'}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="doc-label" className="block text-sm font-medium mb-1">Nom du document</label>
                  <input
                    id="doc-label"
                    type="text"
                    required
                    maxLength={150}
                    value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    placeholder="Ex : Attestation d'assurance"
                  />
                </div>
                <div>
                  <label htmlFor="doc-description" className="block text-sm font-medium mb-1">Précision pour le partenaire (facultatif)</label>
                  <input
                    id="doc-description"
                    type="text"
                    maxLength={255}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">Exigence :</span>
                <LevelSelector value={draft.level} onChange={(v) => setDraft({ ...draft, level: v })} label="Exigence du document" />
                <span className="flex-1" />
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
              <Plus className="w-4 h-4" /> Ajouter un document
            </button>
          )}
        </div>
      )}
    </section>
  );
}
