'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Pagination from '@/components/common/Pagination';
import DateRangeFilter from '@/components/common/DateRangeFilter';
import { formatPrice } from '@/lib/utils';
import { Users, Mail, Phone, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  bookings_count: number;
  total_spent: number;
  last_stay: string | null;
  cancelled_count: number;
}

export default function HostClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 20, current_page: 1, last_page: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  // Retour client 2026-09-18 : filtre "dernier séjour" — absent jusqu'ici,
  // un hôte avec beaucoup de clients ne pouvait pas retrouver quelqu'un
  // n'ayant pas séjourné récemment.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/host/clients', {
        params: {
          page,
          search: search || undefined,
          from_date: dateFrom || undefined,
          to_date: dateTo || undefined,
        },
      })
      .then((res) => {
        const data = res.data;
        setClients(data.data ?? []);
        setPagination({
          total: data.total ?? 0,
          per_page: data.per_page ?? 20,
          current_page: data.current_page ?? 1,
          last_page: data.last_page ?? 1,
        });
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur lors du chargement des clients'))
      .finally(() => setLoading(false));
  }, [page, search, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Voyageurs ayant réservé chez vous</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher un client (nom, email, téléphone)..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-sm border-none focus:ring-2 focus:ring-bosejour-red/40 outline-none"
          />
        </form>
        <DateRangeFilter from={dateFrom} to={dateTo} onRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); }} label="Dernier séjour" />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs font-medium text-gray-500 hover:text-bosejour-red"
          >
            Effacer les dates
          </button>
        )}
      </div>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner />
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Aucun client pour le moment</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="text-left py-3 px-4">Client</th>
                <th className="text-left py-3 px-4">Contact</th>
                <th className="text-center py-3 px-4">Réservations</th>
                <th className="text-right py-3 px-4">Total dépensé</th>
                <th className="text-left py-3 px-4">Dernier séjour</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {c.email}
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5" /> {c.phone}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">{c.bookings_count}</td>
                  <td className="py-3 px-4 text-right font-semibold text-bosejour-red">
                    {formatPrice(c.total_spent)} FCFA
                  </td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                    {c.last_stay ? format(new Date(c.last_stay), 'dd MMM yyyy', { locale: fr }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.last_page > 1 && (
        <Pagination
          currentPage={pagination.current_page}
          totalPages={pagination.last_page}
          onPageChange={setPage}
          totalItems={pagination.total}
          itemsPerPage={pagination.per_page}
        />
      )}
    </div>
  );
}
