'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Search, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, Bell } from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';

interface ComplianceRequirement {
  label: string;
  ok: boolean;
}

interface HostCompliance {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  days_since_registration: number | null;
  compliance_status: 'conforme' | 'non_conforme';
  compliance_requirements: Record<string, ComplianceRequirement>;
  compliance_reminder_stage: number;
  accommodations: Array<{ id: number; name: string }>;
}

const REMINDER_STAGE_LABEL: Record<number, string> = {
  0: '',
  1: 'Relance J+30 envoyée',
  2: 'Relance J+60 envoyée',
  3: 'Relance J+90 envoyée',
  4: 'Relance J+120 envoyée (risque de suspension)',
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function HostRow({ host }: { host: HostCompliance }) {
  const [expanded, setExpanded] = useState(false);
  const missing = Object.values(host.compliance_requirements || {}).filter((r) => !r.ok);
  const conforme = host.compliance_status === 'conforme';

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900 dark:text-white">{host.name}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
              conforme
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {conforme ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {conforme ? 'Conforme' : 'Non conforme'}
            </span>
            {host.compliance_reminder_stage > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 inline-flex items-center gap-1">
                <Bell className="w-3 h-3" /> {REMINDER_STAGE_LABEL[host.compliance_reminder_stage]}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{host.email} · {host.phone || 'pas de téléphone'}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Inscrit le {fmt(host.created_at)}
            {host.days_since_registration != null && ` (il y a ${Math.floor(host.days_since_registration)} jours)`}
            {host.accommodations.length > 0 && ` · ${host.accommodations.length} établissement${host.accommodations.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/dashboard/admin/users/${host.id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
          >
            Voir <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          {!conforme && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1 text-gray-400 hover:text-primary"
              aria-label="Détails"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      {expanded && !conforme && (
        <div className="px-4 pb-4 -mt-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            {missing.length} élément{missing.length > 1 ? 's' : ''} manquant{missing.length > 1 ? 's' : ''} :
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((r) => (
              <span key={r.label} className="px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 text-xs">
                {r.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCompliancePage() {
  const [hosts, setHosts] = useState<HostCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, conforme: 0, non_conforme: 0 });

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/admin/compliance', {
      params: {
        page,
        per_page: 20,
        status: status !== 'all' ? status : undefined,
        search: search || undefined,
      },
    })
      .then((r) => {
        setHosts(r.data?.data ?? []);
        setTotalPages(r.data?.pagination?.last_page ?? 1);
        setTotal(r.data?.pagination?.total ?? 0);
        if (r.data?.summary) setSummary(r.data.summary);
      })
      .catch(() => setHosts([]))
      .finally(() => setLoading(false));
  }, [page, status, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" /> Conformité
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Dossier documentaire des hôtes (pièce du gérant, RCCM, numéro contribuable…) et relances automatiques.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-400">
        Les hôtes non conformes reçoivent une relance automatique par e-mail à J+30, J+60, J+90 et J+120 après
        leur inscription (tant que le dossier reste incomplet).
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">Hôtes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">Conformes</p>
          <p className="text-2xl font-bold text-green-600">{summary.conforme}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">Non conformes</p>
          <p className="text-2xl font-bold text-red-600">{summary.non_conforme}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un hôte…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="non_conforme">Non conformes</option>
            <option value="conforme">Conformes</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : hosts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucun hôte trouvé pour ces filtres.</p>
        ) : (
          hosts.map((host) => <HostRow key={host.id} host={host} />)
        )}
      </div>

      {!loading && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={20} />
      )}
    </div>
  );
}
