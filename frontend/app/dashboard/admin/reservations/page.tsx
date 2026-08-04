'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Pagination from '@/components/common/Pagination';
import { formatPrice } from '@/lib/utils';
import { Search, Filter, MapPin, Building2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminBooking {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: string;
  created_at: string;
  user: { id: number; name: string; email: string; phone?: string };
  accommodation: { id: number; name: string; city: string; host?: { id: number; name: string } };
  room?: { id: number; name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  completed: { label: 'Terminée', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Non payé',
  paid: 'Payé',
  failed: 'Échec',
  refunded: 'Remboursé',
};

export default function AdminReservationsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 20, current_page: 1, last_page: 1 });

  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    api
      .get('/admin/bookings/cities')
      .then((res) => setCities(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get('/admin/bookings', {
        params: {
          page,
          per_page: 20,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          city: cityFilter !== 'all' ? cityFilter : undefined,
          search: search || undefined,
        },
      })
      .then((res) => {
        setBookings(res.data?.data ?? []);
        const p = res.data?.pagination;
        if (p) setPagination(p);
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur lors du chargement des réservations'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, cityFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, cityFilter, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Réservations</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Vue globale de toutes les réservations, tous établissements confondus</p>
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

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-sm border-none outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmée</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-sm border-none outline-none"
          >
            <option value="all">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">Aucune réservation ne correspond à ces critères</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="text-left py-3 px-4">Client</th>
                <th className="text-left py-3 px-4">Établissement</th>
                <th className="text-left py-3 px-4">Dates</th>
                <th className="text-right py-3 px-4">Montant</th>
                <th className="text-center py-3 px-4">Paiement</th>
                <th className="text-center py-3 px-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900 dark:text-white">{b.user?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{b.user?.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/dashboard/admin/accommodations/${b.accommodation?.id}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-bosejour-red inline-flex items-center gap-1"
                    >
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {b.accommodation?.name ?? '—'}
                    </Link>
                    <p className="text-xs text-gray-400">{b.accommodation?.city}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                    {format(new Date(b.check_in), 'dd MMM', { locale: fr })} → {format(new Date(b.check_out), 'dd MMM yyyy', { locale: fr })}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-bosejour-red">{formatPrice(b.total_price)} FCFA</td>
                  <td className="py-3 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    {PAYMENT_LABELS[b.payment_status] ?? b.payment_status}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[b.status]?.color ?? ''}`}>
                      {STATUS_CONFIG[b.status]?.label ?? b.status}
                    </span>
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
