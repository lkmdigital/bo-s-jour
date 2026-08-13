'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { resolveImageUrl } from '@/lib/utils';
import { CheckCircle2, XCircle, FileText, Upload, Eye, Loader2, CreditCard, Landmark, ShieldCheck } from 'lucide-react';

interface ComplianceRequirement { label: string; ok: boolean }

interface HostProfile {
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

function documentUrl(path?: string | null): string | null {
  if (!path) return null;
  return resolveImageUrl(path.startsWith('/storage') ? path : `/storage/${path}`);
}

function FileRow({
  label, currentPath, onPick, uploading,
}: { label: string; currentPath?: string | null; onPick: (f: File) => void; uploading: boolean }) {
  const url = documentUrl(currentPath);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        {currentPath ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fourni
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                <Eye className="w-3.5 h-3.5" /> Voir
              </a>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-0.5">
            <XCircle className="w-3.5 h-3.5" /> Manquant
          </span>
        )}
      </div>
      <label className={`btn-outline text-sm inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {currentPath ? 'Remplacer' : 'Téléverser'}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }}
        />
      </label>
    </div>
  );
}

export default function HostDocumentsPage() {
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [requirements, setRequirements] = useState<Record<string, ComplianceRequirement>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [rccmNumber, setRccmNumber] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [savingNumbers, setSavingNumbers] = useState(false);

  const load = () => {
    api.get('/host/profile')
      .then((res) => {
        const u = res.data?.user ?? {};
        setProfile(u);
        setIdType(u.id_type || '');
        setIdNumber(u.id_number || '');
        setRccmNumber(u.rccm || '');
        setTaxNumber(u.tax_account_number || '');
        setRequirements(res.data?.compliance_requirements ?? {});
        setStatus(res.data?.compliance_status ?? null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur lors du chargement des documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const uploadFile = async (field: string, file: File) => {
    setUploadingField(field);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append(field, file);
      const res = await api.post('/host/profile', fd);
      setProfile(res.data?.user ?? profile);
      setRequirements(res.data?.compliance_requirements ?? requirements);
      setStatus(res.data?.compliance_status ?? status);
      setSuccess('Document enregistré ✓');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du téléversement du document");
    } finally {
      setUploadingField(null);
    }
  };

  const saveNumbers = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSavingNumbers(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append('id_type', idType);
      fd.append('id_number', idNumber);
      fd.append('rccm', rccmNumber);
      fd.append('tax_account_number', taxNumber);
      const res = await api.post('/host/profile', fd);
      setProfile(res.data?.user ?? profile);
      setRequirements(res.data?.compliance_requirements ?? requirements);
      setStatus(res.data?.compliance_status ?? status);
      setSuccess('Informations enregistrées ✓');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement");
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

  const items = Object.entries(requirements);
  const needsRectoVerso = idType === 'CNI' || idType === 'Permis de conduire';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Téléversez vos documents légaux et administratifs. Ils sont vérifiés par notre équipe avant la publication de votre établissement.
        </p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}
      {success && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {status && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-bosejour-red flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Statut global</p>
            <p className="font-semibold text-gray-900 dark:text-white capitalize">{status === 'conforme' ? 'Conforme' : 'Non conforme — documents manquants'}</p>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {items.map(([key, req]) => (
            <div key={key} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">{req.label}</span>
              {req.ok ? (
                <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Fourni
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
                  <XCircle className="w-4 h-4" /> Manquant
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pièce d'identité du représentant */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" /> Pièce d&apos;identité du représentant
        </h2>
        <form onSubmit={saveNumbers} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-sm font-medium mb-2">Type de pièce</label>
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="">Sélectionner…</option>
              <option value="CNI">CNI</option>
              <option value="Passeport">Passeport</option>
              <option value="Permis de conduire">Permis de conduire</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Numéro de pièce</label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={savingNumbers} className="btn-outline text-sm disabled:opacity-50 inline-flex items-center gap-2">
              {savingNumbers && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer le type / numéro
            </button>
          </div>
        </form>

        <div className="mt-2">
          {needsRectoVerso ? (
            <>
              <FileRow
                label="Document d'identité — Recto"
                currentPath={profile?.id_document_recto_path}
                uploading={uploadingField === 'id_document_recto'}
                onPick={(f) => uploadFile('id_document_recto', f)}
              />
              <FileRow
                label="Document d'identité — Verso"
                currentPath={profile?.id_document_verso_path}
                uploading={uploadingField === 'id_document_verso'}
                onPick={(f) => uploadFile('id_document_verso', f)}
              />
            </>
          ) : (
            <FileRow
              label="Document d'identité"
              currentPath={profile?.id_document_path}
              uploading={uploadingField === 'id_document'}
              onPick={(f) => uploadFile('id_document', f)}
            />
          )}
        </div>
      </div>

      {/* Documents administratifs */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Documents administratifs
        </h2>

        <FileRow
          label="Justificatif de domicile"
          currentPath={profile?.proof_of_address_path}
          uploading={uploadingField === 'proof_of_address'}
          onPick={(f) => uploadFile('proof_of_address', f)}
        />

        <div className="py-3 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-medium mb-2">Numéro RCCM</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={rccmNumber}
              onChange={(e) => setRccmNumber(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              placeholder="Ex: CI-ABJ-2024-B-12345"
            />
            <button type="button" onClick={() => saveNumbers()} disabled={savingNumbers} className="btn-outline text-sm disabled:opacity-50 whitespace-nowrap">
              Enregistrer
            </button>
          </div>
        </div>
        <FileRow
          label="Document RCCM"
          currentPath={profile?.rccm_document_path}
          uploading={uploadingField === 'rccm_document'}
          onPick={(f) => uploadFile('rccm_document', f)}
        />

        <div className="py-3 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-medium mb-2">Numéro contribuable (IFU)</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              placeholder="Ex: CI-1234567A"
            />
            <button type="button" onClick={() => saveNumbers()} disabled={savingNumbers} className="btn-outline text-sm disabled:opacity-50 whitespace-nowrap">
              Enregistrer
            </button>
          </div>
        </div>
        <FileRow
          label="Document contribuable (IFU)"
          currentPath={profile?.tax_document_path}
          uploading={uploadingField === 'tax_document'}
          onPick={(f) => uploadFile('tax_document', f)}
        />

        <FileRow
          label="Licence d'exploitation (optionnel)"
          currentPath={profile?.business_license_path}
          uploading={uploadingField === 'business_license'}
          onPick={(f) => uploadFile('business_license', f)}
        />
      </div>

      <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 flex items-start gap-3">
        <Landmark className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Les coordonnées bancaires (RIB) pour vos reversements se renseignent dans{' '}
          <a href="/dashboard/host/finances?tab=retraits" className="text-primary hover:underline">Finances → Demandes de retrait</a>.
        </p>
      </div>
    </div>
  );
}
