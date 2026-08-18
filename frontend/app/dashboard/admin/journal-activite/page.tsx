'use client';

import { useEffect, useState } from 'react';
import { History, Search, User as UserIcon, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';

interface LogEntry {
  id: string;
  source: 'user' | 'accommodation';
  action: string;
  description: string | null;
  actor: { id: number; name: string; email: string } | null;
  target: { type: string; id: number; label?: string | null } | null;
  ip_address: string | null;
  changes: Record<string, any>;
  created_at: string;
}

const SOURCE_LABELS: Record<string, { label: string; icon: any; cls: string }> = {
  user: { label: 'Utilisateur', icon: UserIcon, cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  accommodation: { label: 'Établissement', icon: Building2, cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
};

function fmt(d: string) {
  return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const src = SOURCE_LABELS[entry.source];
  const Icon = src.icon;
  const hasChanges = entry.changes && Object.keys(entry.changes).length > 0;

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${src.cls}`}>
            <Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {entry.description || entry.action}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {entry.actor ? (
                <>Par <span className="font-medium">{entry.actor.name}</span></>
              ) : (
                'Système'
              )}
              {entry.target?.label && <> · {entry.target.label}</>}
              {' · '}{fmt(entry.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${src.cls}`}>{src.label}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {entry.action}
          </span>
          {hasChanges && (
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
      {expanded && hasChanges && (
        <div className="px-4 pb-4 -mt-2">
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(entry.changes, null, 2)}
          </pre>
          {entry.ip_address && <p className="text-xs text-gray-400 mt-2">IP : {entry.ip_address}</p>}
        </div>
      )}
    </div>
  );
}

export default function AdminActivityLogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [source, setSource] = useState('all');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    api.get('/admin/activity-log/actions').then((r) => setActions(r.data?.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/activity-log', {
      params: {
        page,
        per_page: 20,
        source: source !== 'all' ? source : undefined,
        action: action || undefined,
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      },
    })
      .then((r) => {
        setEntries(r.data?.data ?? []);
        setTotalPages(r.data?.pagination?.last_page ?? 1);
        setTotal(r.data?.pagination?.total ?? 0);
      })
      .catch(() => { setEntries([]); })
      .finally(() => setLoading(false));
  }, [page, source, action, search, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="w-6 h-6 text-primary" /> Journal d&apos;activité
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Actions administratives sur les comptes utilisateurs et les établissements.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-400">
        Portée actuelle : actions admin sur les utilisateurs (création, blocage, rôles…) et le cycle de vie
        des établissements (création, approbation, rejet…). Les réservations, paiements et avis ne sont pas
        encore tracés ici.
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">Toutes les sources</option>
            <option value="user">Utilisateurs</option>
            <option value="accommodation">Établissements</option>
          </select>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">Toutes les actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucune activité trouvée pour ces filtres.</p>
        ) : (
          entries.map((entry) => <LogRow key={entry.id} entry={entry} />)
        )}
      </div>

      {!loading && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={20} />
      )}
    </div>
  );
}
