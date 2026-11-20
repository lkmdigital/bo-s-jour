'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { customDocumentUrl, secureDocumentUrl } from '@/lib/utils';
import { ArrowRight, Camera, Check, CheckCircle2, FileText, Landmark, Loader2, Upload } from 'lucide-react';

/*
 * Documents du partenaire, en pas à pas : un document (ou deux) par étape, « Passer pour l'instant » toujours visible,
 * puis un récapitulatif qui renvoie vers la suite (profil ou ajout d'un établissement).
 * Les étapes suivent ce que l'administrateur demande (Paramètres > Documents partenaires) : un document qu'il n'a pas
 * demandé n'apparaît pas, et une étape sans rien à afficher est sautée.
 */

interface ComplianceRequirement { label: string; ok: boolean; required?: boolean }

interface CustomDocument {
  id: number;
  label: string;
  description: string | null;
  is_required: boolean;
  is_custom: boolean;
  provided: boolean;
}

interface HostProfile {
  id?: number;
  id_type?: string;
  id_number?: string;
  id_document_path?: string;
  id_document_recto_path?: string;
  id_document_verso_path?: string;
  proof_of_address_path?: string;
  business_license_path?: string;
  rccm?: string;
  rccm_document_path?: string;
  tax_account_number?: string;
  tax_document_path?: string;
}

interface ProfileResponse {
  user?: HostProfile;
  compliance_requirements?: Record<string, ComplianceRequirement>;
  compliance_status?: string | null;
  documents_required?: boolean;
  missing_contact_fields?: string[];
  is_complete?: boolean;
}

/** Message d'erreur renvoyé par l'API, s'il y en a un. */
const apiMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

interface Slot {
  key: string;
  label: string;
  hint?: string | null;
  required?: boolean;
  provided: boolean;
  url: string | null;
  upload: (file: File) => void;
  uploading: boolean;
}

interface NumberField { key: 'id' | 'rccm' | 'tax'; label: string; placeholder: string; value: string; set: (v: string) => void }

interface Step {
  id: 'identity' | 'address' | 'company' | 'permits';
  short: string;
  title: string;
  text: string;
  withTypes?: boolean;
  numbers: NumberField[];
  slots: Slot[];
}

const ID_TYPES = ['CNI', 'Passeport', 'Permis de conduire', 'Autre'];

function RequirementBadge({ required }: { required?: boolean }) {
  if (required === undefined) return null;
  return (
    <span className={`ml-2 align-middle text-[11px] font-semibold px-1.5 py-0.5 rounded ${required ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
      {required ? 'Obligatoire' : 'Facultatif'}
    </span>
  );
}

/** Une case à remplir : « Photographier » sur téléphone, « Téléverser » partout, puis « Fourni » avec voir / remplacer. */
function SlotBox({ slot }: { slot: Slot }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) slot.upload(f);
    e.target.value = '';
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl p-4 border-2 ${slot.provided ? 'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-900/10' : 'border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}>
      <span className="flex h-12 w-10 flex-none items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-900">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {slot.label}
          <RequirementBadge required={slot.required} />
        </p>
        {slot.hint && <p className="text-xs text-gray-500 dark:text-gray-400">{slot.hint}</p>}
        {slot.uploading ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi en cours…
          </p>
        ) : slot.provided ? (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Fourni
            {slot.url && (
              <a href={slot.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">Voir</a>
            )}
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">PDF, JPG ou PNG</p>
        )}
      </div>
      <div className="flex gap-2">
        <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pick} />
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          disabled={slot.uploading}
          className="btn-outline inline-flex items-center gap-2 text-sm disabled:opacity-50 sm:hidden"
        >
          <Camera className="h-4 w-4" /> Photo
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={slot.uploading}
          className={`${slot.provided ? 'btn-outline' : 'btn-primary'} inline-flex items-center gap-2 text-sm disabled:opacity-50`}
        >
          <Upload className="h-4 w-4" /> {slot.provided ? 'Remplacer' : 'Téléverser'}
        </button>
      </div>
    </div>
  );
}

export default function HostDocumentsPage() {
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [requirements, setRequirements] = useState<Record<string, ComplianceRequirement>>({});
  const [status, setStatus] = useState<string | null>(null);
  // Documents facultatifs tant que le super administrateur ne les a pas rendus obligatoires.
  const [documentsRequired, setDocumentsRequired] = useState(false);
  const [missingContact, setMissingContact] = useState<string[]>([]);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [customDocs, setCustomDocs] = useState<CustomDocument[]>([]);
  const [step, setStep] = useState(0);

  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [rccmNumber, setRccmNumber] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [savingNumbers, setSavingNumbers] = useState(false);

  const loadCustomDocs = () =>
    api.get('/host/documents')
      .then((res) => setCustomDocs((res.data?.data ?? []).filter((d: CustomDocument) => d.is_custom)))
      .catch(() => {});

  const applyResponse = (data: ProfileResponse) => {
    const u: HostProfile = data?.user ?? {};
    setProfile(u);
    setRequirements(data?.compliance_requirements ?? {});
    setStatus(data?.compliance_status ?? null);
    setDocumentsRequired(!!data?.documents_required);
    setMissingContact(data?.missing_contact_fields ?? []);
    setProfileComplete(!!data?.is_complete);
    return u;
  };

  const load = () => {
    loadCustomDocs();
    api.get('/host/profile')
      .then((res) => {
        const u = applyResponse(res.data);
        setIdType(u.id_type || '');
        setIdNumber(u.id_number || '');
        setRccmNumber(u.rccm || '');
        setTaxNumber(u.tax_account_number || '');
      })
      .catch((err: unknown) => setError(apiMessage(err, 'Erreur lors du chargement des documents')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const flash = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const uploadFile = async (field: string, file: File) => {
    setUploadingField(field);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append(field, file);
      const res = await api.post('/host/profile', fd);
      applyResponse({ ...res.data, user: res.data?.user ?? profile });
      flash('Document enregistré ✓');
    } catch (err: unknown) {
      setError(apiMessage(err, "Erreur lors du téléversement du document"));
    } finally {
      setUploadingField(null);
    }
  };

  const uploadCustom = async (doc: CustomDocument, file: File) => {
    setUploadingField(`custom_${doc.id}`);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/host/documents/${doc.id}`, fd);
      setRequirements(res.data?.compliance_requirements ?? requirements);
      setStatus(res.data?.compliance_status ?? status);
      await loadCustomDocs();
      flash('Document enregistré ✓');
    } catch (err: unknown) {
      setError(apiMessage(err, "Erreur lors du téléversement du document"));
    } finally {
      setUploadingField(null);
    }
  };

  /** Enregistre les types et numéros d'un coup, seulement s'ils ont changé (à la sortie d'un champ et en continuant). */
  const saveNumbers = async () => {
    if (!profile) return;
    const unchanged =
      idType === (profile.id_type || '') && idNumber === (profile.id_number || '') &&
      rccmNumber === (profile.rccm || '') && taxNumber === (profile.tax_account_number || '');
    if (unchanged) return;
    setSavingNumbers(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('id_type', idType);
      fd.append('id_number', idNumber);
      fd.append('rccm', rccmNumber);
      fd.append('tax_account_number', taxNumber);
      const res = await api.post('/host/profile', fd);
      applyResponse({ ...res.data, user: res.data?.user ?? profile });
      flash('Informations enregistrées ✓');
    } catch (err: unknown) {
      setError(apiMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setSavingNumbers(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );
  }

  // Une case n'est affichée que si l'admin demande ce document ; sinon (type supprimé ou désactivé) on la masque.
  const asked = (key: string) => key in requirements;
  const isRequired = (key: string) => requirements[key]?.required;
  const needsRectoVerso = idType === 'CNI' || idType === 'Permis de conduire';

  const fileSlot = (key: string, label: string, field: string, path: string | undefined | null, requirementKey: string): Slot => ({
    key,
    label,
    required: isRequired(requirementKey),
    provided: !!path,
    url: path ? secureDocumentUrl(profile?.id, field) : null,
    upload: (f) => uploadFile(field, f),
    uploading: uploadingField === field,
  });

  const identitySlots: Slot[] = !asked('manager_id_document')
    ? []
    : needsRectoVerso
      ? [
          fileSlot('id_recto', "Pièce d'identité, recto", 'id_document_recto', profile?.id_document_recto_path, 'manager_id_document'),
          fileSlot('id_verso', "Pièce d'identité, verso", 'id_document_verso', profile?.id_document_verso_path, 'manager_id_document'),
        ]
      : [fileSlot('id', "Pièce d'identité", 'id_document', profile?.id_document_path, 'manager_id_document')];

  const customSlots: Slot[] = customDocs.map((doc) => ({
    key: `custom_${doc.id}`,
    label: doc.label,
    hint: doc.description,
    required: doc.is_required,
    provided: doc.provided,
    url: customDocumentUrl(profile?.id, doc.id),
    upload: (f) => uploadCustom(doc, f),
    uploading: uploadingField === `custom_${doc.id}`,
  }));

  const allSteps: Step[] = [
    {
      id: 'identity', short: 'Identité', title: "Pièce d'identité", withTypes: true,
      text: "Celle du représentant de l'établissement. Recto et verso pour la CNI et le permis.",
      numbers: [{ key: 'id', label: 'Numéro de pièce', placeholder: 'Ex : C0012345678', value: idNumber, set: setIdNumber }],
      slots: identitySlots,
    },
    {
      id: 'address', short: 'Domicile', title: 'Justificatif de domicile',
      text: 'Une facture ou une attestation de moins de 3 mois.',
      numbers: [],
      slots: asked('proof_of_address') ? [fileSlot('proof', 'Justificatif de domicile', 'proof_of_address', profile?.proof_of_address_path, 'proof_of_address')] : [],
    },
    {
      id: 'company', short: 'Entreprise', title: 'Votre entreprise',
      text: 'Registre du commerce et numéro contribuable, avec leur numéro.',
      numbers: [
        { key: 'rccm', label: 'Numéro RCCM', placeholder: 'Ex : CI-ABJ-2024-B-12345', value: rccmNumber, set: setRccmNumber },
        { key: 'tax', label: 'Numéro contribuable (IFU)', placeholder: 'Ex : CI-1234567A', value: taxNumber, set: setTaxNumber },
      ],
      slots: [
        ...(asked('rccm_document') ? [fileSlot('rccm', 'Document RCCM', 'rccm_document', profile?.rccm_document_path, 'rccm_document')] : []),
        ...(asked('tax_document') ? [fileSlot('tax', 'Document contribuable (IFU)', 'tax_document', profile?.tax_document_path, 'tax_document')] : []),
      ],
    },
    {
      id: 'permits', short: 'Autorisations', title: 'Autorisations et autres documents',
      text: "Licence d'exploitation et autres documents demandés par boséjour.",
      numbers: [],
      slots: [
        ...(asked('operating_license_document') ? [fileSlot('license', "Licence d'exploitation", 'business_license', profile?.business_license_path, 'operating_license_document')] : []),
        ...customSlots,
      ],
    },
  ];
  // Une étape sans rien à remplir ni à téléverser est sautée.
  const steps = allSteps.filter((s) => s.slots.length > 0 || s.numbers.length > 0);
  const recapIndex = steps.length;
  const current = Math.min(step, recapIndex);
  const onRecap = current === recapIndex;
  const cur = steps[current];

  const stepState = (s: Step): 'done' | 'partial' | 'none' => {
    const units = s.slots.length > 0
      ? s.slots.map((x) => x.provided)
      : s.numbers.map((n) => n.value.trim() !== '');
    const done = units.filter(Boolean).length;
    return done === units.length ? 'done' : done > 0 ? 'partial' : 'none';
  };

  const goTo = async (i: number) => {
    await saveNumbers();
    setStep(Math.max(0, Math.min(recapIndex, i)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {documentsRequired
            ? 'Téléversez vos documents légaux et administratifs, une étape à la fois. Ils sont vérifiés par notre équipe avant la publication de votre établissement.'
            : "Une étape à la fois. Vous pouvez passer à tout moment : ces documents sont facultatifs pour le moment, vous pouvez ajouter vos établissements sans eux."}
        </p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}
      {success && (
        <div role="status" className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
        {/* Étapes : liste à gauche sur grand écran, barre de progression sur téléphone */}
        <nav aria-label="Étapes" className="md:self-start">
          <div className="flex gap-1.5 md:hidden" aria-hidden="true">
            {[...steps, null].map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`} />
            ))}
          </div>
          <ol className="hidden md:grid gap-1">
            {[...steps.map((s) => ({ id: s.id as string, short: s.short, state: stepState(s) })), { id: 'recap', short: 'Récapitulatif', state: 'none' as const }].map((s, i) => {
              const active = i === current;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={active ? 'step' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${active ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs ${active ? 'bg-primary text-white' : s.state === 'done' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100'}`}>
                      {s.state === 'done' && !active ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    {s.short}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="rounded-3xl bg-gray-50 p-5 sm:p-7 dark:bg-gray-800/60 space-y-5" aria-live="polite">
          {!onRecap ? (
            <>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Étape {current + 1} sur {steps.length}</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{cur.title}</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{cur.text}</p>
              </div>

              {cur.withTypes && (
                <div>
                  <p className="mb-2 text-sm font-medium">Type de pièce</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Type de pièce">
                    {ID_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={idType === t}
                        onClick={() => setIdType(t)}
                        onBlur={saveNumbers}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${idType === t ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cur.numbers.map((n) => (
                <div key={n.key}>
                  <label htmlFor={`num-${n.key}`} className="mb-2 block text-sm font-medium">{n.label}</label>
                  <input
                    id={`num-${n.key}`}
                    type="text"
                    value={n.value}
                    onChange={(e) => n.set(e.target.value)}
                    onBlur={saveNumbers}
                    placeholder={n.placeholder}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
              ))}

              <div className="space-y-3">
                {cur.slots.map((slot) => <SlotBox key={slot.key} slot={slot} />)}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => goTo(current - 1)}
                  className={`btn-outline text-sm ${current === 0 ? 'invisible' : ''}`}
                  aria-hidden={current === 0}
                  tabIndex={current === 0 ? -1 : 0}
                >
                  Retour
                </button>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => goTo(current + 1)} className="text-sm font-semibold text-gray-600 underline underline-offset-4 hover:text-gray-900 dark:text-gray-300">
                    Passer pour l&apos;instant
                  </button>
                  <button type="button" onClick={() => goTo(current + 1)} disabled={savingNumbers} className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50">
                    {savingNumbers ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Continuer <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Récapitulatif</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Votre dossier est enregistré</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Vous pourrez revenir ajouter ou remplacer un document à tout moment.
                  {status === 'conforme' && ' Votre dossier est conforme.'}
                </p>
              </div>

              <ul className="space-y-2">
                {steps.map((s, i) => {
                  const state = stepState(s);
                  const missingRequired = state !== 'done' && documentsRequired && s.slots.some((x) => x.required && !x.provided);
                  const [label, cls] =
                    state === 'done' ? ['Fourni', 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400']
                    : missingRequired ? ['À fournir', 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400']
                    : state === 'partial' ? ['Partiel', 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300']
                    : ['Passé pour l\'instant', 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'];
                  return (
                    <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 dark:bg-gray-800">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{label}</span>
                      <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{s.title}</span>
                      <button type="button" onClick={() => goTo(i)} className="text-sm font-semibold text-primary hover:underline">Modifier</button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-amber-50 p-4 dark:bg-amber-900/10">
                {profileComplete ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">Prochaine étape : votre établissement</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Votre profil est complet, vous pouvez ajouter un établissement.</p>
                    </div>
                    <Link href="/dashboard/host/accommodations/new" className="btn-primary text-sm">Ajouter un établissement</Link>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">Prochaine étape : compléter votre profil</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300" data-testid="missing-contact">
                        {missingContact.length > 0
                          ? `Il manque : ${missingContact.join(', ')}.`
                          : 'Quelques informations de contact sont à compléter avant d’ajouter un établissement.'}
                      </p>
                    </div>
                    <Link href="/dashboard/host/profile" className="btn-primary text-sm">Compléter le profil</Link>
                  </>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
                <Landmark className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Les coordonnées bancaires (RIB) pour vos reversements se renseignent dans{' '}
                  <Link href="/dashboard/host/finances?tab=retraits" className="text-primary hover:underline">Finances → Demandes de retrait</Link>.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
