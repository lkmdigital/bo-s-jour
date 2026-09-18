'use client';

import { FilterBar, FilterSearch, FilterSelect, FilterResetButton } from '@/components/common/FilterBar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isAdmin } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Pagination from '@/components/common/Pagination';
import { Star, Eye, EyeOff, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReviewItem {
  id: number;
  rating: number;
  comment: string;
  moderation_status: string;
  is_reported: boolean;
  report_count: number;
  report_reason: string | null;
  created_at: string;
  user: { id: number; name: string; email?: string };
  accommodation: { id: number; name: string; host_id?: number };
}

export default function AdminReviewsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('pending');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 20, current_page: 1, last_page: 1 });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin(user))) {
      router.push('/dashboard/admin/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && isAdmin(user)) {
      fetchReviews();
    }
  }, [isAuthenticated, user, filter, search, page]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { per_page: 20, page };
      if (filter) params.moderation_status = filter;
      if (search) params.search = search;
      const res = await api.get('/admin/reviews', { params });
      setReviews(res.data?.data ?? []);
      setPagination({
        total: res.data?.total ?? 0,
        per_page: res.data?.per_page ?? 20,
        current_page: res.data?.current_page ?? 1,
        last_page: res.data?.last_page ?? 1,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleModerate = async (id: number, action: 'approve' | 'hide') => {
    setProcessingId(id);
    try {
      await api.post(`/admin/reviews/${id}/moderate`, { action });
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin(user)) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flag className="w-8 h-8 text-primary" />
            Modération des avis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Approuver ou masquer les avis signalés
          </p>
        </div>

        <FilterBar className="mb-4">
          <FilterSearch
            value={searchInput}
            onChange={setSearchInput}
            onSubmit={handleSearchSubmit}
            placeholder="Rechercher un voyageur, un établissement, un mot du commentaire..."
          />
          <FilterSelect value={filter} onChange={setFilter} ariaLabel="Statut">
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="hidden">Masqués</option>
          </FilterSelect>
          <FilterResetButton onClick={() => { setFilter('pending'); setSearch(''); setSearchInput(''); }} />
        </FilterBar>

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">Aucun avis dans cette catégorie.</p>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="card border-l-4 border-l-amber-500"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold">{review.user.name}</span>
                      <span className="text-sm text-gray-500">{review.user.email}</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {review.rating}/5
                      </span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(review.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-2">{review.comment}</p>
                    <p className="text-sm text-gray-500">
                      Hébergement : <strong>{review.accommodation.name}</strong> (ID {review.accommodation.id})
                    </p>
                    {review.is_reported && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                        Signalé {review.report_count} fois
                        {review.report_reason && ` · ${review.report_reason}`}
                      </p>
                    )}
                  </div>
                  {review.moderation_status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleModerate(review.id, 'approve')}
                        disabled={processingId === review.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        <Eye className="w-4 h-4" />
                        Approuver
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerate(review.id, 'hide')}
                        disabled={processingId === review.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        <EyeOff className="w-4 h-4" />
                        Masquer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {pagination.last_page > 1 && (
          <Pagination
            currentPage={pagination.current_page}
            totalPages={pagination.last_page}
            onPageChange={setPage}
            totalItems={pagination.total}
            itemsPerPage={pagination.per_page}
          />
        )}
      </main>
    </div>
  );
}
