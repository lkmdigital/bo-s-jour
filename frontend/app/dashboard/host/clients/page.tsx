'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Pagination from '@/components/common/Pagination';
import { formatPrice } from '@/lib/utils';
import { Users, Mail, Phone } from 'lucide-react';
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

  useEffect(() => {
    setLoading(true);
    api
      .get('/host/clients', { params: { page } })
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
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Voyageurs ayant réservé chez vous</p>
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
        />
      )}
    </div>
  );
}
