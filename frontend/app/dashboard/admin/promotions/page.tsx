'use client';

import { useEffect, useState } from 'react';
import { Gift, Search, Sparkles, X, Tag } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';

interface FeaturedAccommodation {
  id: number;
  name: string;
  city: string;
  is_featured: boolean;
}

interface PromotionItem {
  id: number;
  accommodation: { id: number; name: string; city: string; host_name: string | null } | null;
  room: { id: number; name: string } | null;
  discount_type: string;
  discount_percent: string | number;
  discount_amount: string | number | null;
  promo_code: string | null;
  start_date: string;
  end_date: string;
  description: string | null;
  is_active: boolean;
  computed_status: 'active' | 'upcoming' | 'expired' | 'disabled';
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  upcoming: { label: 'À venir', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  expired: { label: 'Expirée', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  disabled: { label: 'Désactivée', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function discountLabel(p: PromotionItem) {
  if (p.discount_type === 'fixed') return `-${p.discount_amount} FCFA`;
  if (p.discount_type === 'free_night') return 'Nuit offerte';
  return `-${Number(p.discount_percent)}%`;
}

export default function AdminPromotionsPage() {
  const { showError, showSuccess } = useToast();

  // Section mises en avant
  const [featured, setFeatured] = useState<FeaturedAccommodation[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredSearch, setFeaturedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<FeaturedAccommodation[]>([]);
  const [searching, setSearching] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Section offres des établissements
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [promoSearch, setPromoSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [promoTogglingId, setPromoTogglingId] = useState<number | null>(null);

  const loadFeatured = () => {
    setFeaturedLoading(true);
    api.get('/admin/accommodations', { params: { is_featured: 1, per_page: 50 } })
      .then((r) => setFeatured(r.data?.data ?? []))
      .catch(() => setFeatured([]))
      .finally(() => setFeaturedLoading(false));
  };

  useEffect(loadFeatured, []);

  useEffect(() => {
    if (!featuredSearch.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.get('/admin/accommodations', { params: { search: featuredSearch, per_page: 8 } })
        .then((r) => setSearchResults(r.data?.data ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [featuredSearch]);

  const toggleFeatured = async (id: number) => {
    setTogglingId(id);
    try {
      const res = await api.post(`/admin/accommodations/${id}/toggle-featured`);
      showSuccess(res.data?.message || 'Mis à jour');
      loadFeatured();
      setSearchResults((prev) => prev.map((a) => (a.id === id ? { ...a, is_featured: !a.is_featured } : a)));
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur');
    } finally {
      setTogglingId(null);
    }
  };

  const loadPromotions = () => {
    setPromoLoading(true);
    api.get('/admin/promotions', {
      params: {
        page,
        per_page: 20,
        search: promoSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      },
    })
      .then((r) => {
        setPromotions(r.data?.data ?? []);
        setTotalPages(r.data?.pagination?.last_page ?? 1);
        setTotal(r.data?.pagination?.total ?? 0);
      })
      .catch(() => setPromotions([]))
      .finally(() => setPromoLoading(false));
  };

  useEffect(loadPromotions, [page, promoSearch, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePromotion = async (id: number) => {
    setPromoTogglingId(id);
    try {
      await api.post(`/admin/promotions/${id}/toggle`);
      loadPromotions();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur');
    } finally {
      setPromoTogglingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" /> Promotions
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Mises en avant bo séjour et supervision des offres créées par les établissements.
        </p>
      </div>

      {/* Section 1 : Mises en avant bo séjour */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" /> Mises en avant bo séjour
        </h2>
        <p className="text-xs text-gray-500 -mt-2">
          Établissements affichés dans « Offres promotionnelles » côté voyageur. Décision plateforme, indépendante
          des offres créées par les hôtes ci-dessous.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un établissement à mettre en avant…"
              value={featuredSearch}
              onChange={(e) => setFeaturedSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          {featuredSearch.trim() && (
            <div className="mb-4 border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
              {searching ? (
                <p className="text-sm text-gray-500 p-3">Recherche…</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-gray-500 p-3">Aucun résultat.</p>
              ) : (
                searchResults.map((a) => (
                  <div key={a.id} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{a.name}</p>
                      <p className="text-xs text-gray-500">{a.city}</p>
                    </div>
                    <button
                      onClick={() => toggleFeatured(a.id)}
                      disabled={togglingId === a.id}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full disabled:opacity-50 ${
                        a.is_featured
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-primary text-white hover:bg-primary-dark'
                      }`}
                    >
                      {a.is_featured ? 'Retirer' : 'Mettre en avant'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          <p className="text-xs font-medium text-gray-500 mb-2">
            {featured.length} établissement{featured.length !== 1 ? 's' : ''} actuellement mis en avant
          </p>
          {featuredLoading ? (
            <LoadingSpinner />
          ) : featured.length === 0 ? (
            <p className="text-sm text-gray-500 py-3">Aucun établissement mis en avant pour le moment.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {featured.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                >
                  {a.name}
                  <button
                    onClick={() => toggleFeatured(a.id)}
                    disabled={togglingId === a.id}
                    className="p-0.5 rounded-full hover:bg-primary/20 disabled:opacity-50"
                    aria-label={`Retirer ${a.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 2 : Offres des établissements */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-primary" /> Offres des établissements
        </h2>
        <p className="text-xs text-gray-500 -mt-2">
          Codes promo et réductions créés par les hôtes sur leurs établissements. Vous pouvez désactiver une offre
          non conforme.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un établissement, un code…"
                value={promoSearch}
                onChange={(e) => { setPromoSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="upcoming">À venir</option>
              <option value="expired">Expirées</option>
              <option value="disabled">Désactivées</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {promoLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : promotions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucune offre trouvée.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {promotions.map((p) => {
                const status = STATUS_LABELS[p.computed_status];
                return (
                  <div key={p.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {p.accommodation?.name ?? 'Établissement supprimé'}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>{status.label}</span>
                        {p.promo_code && (
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono">{p.promo_code}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {p.accommodation?.city} · {p.accommodation?.host_name || 'hôte inconnu'}
                        {p.room && ` · Chambre : ${p.room.name}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {discountLabel(p)} · du {fmt(p.start_date)} au {fmt(p.end_date)}
                        {p.description && ` · ${p.description}`}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePromotion(p.id)}
                      disabled={promoTogglingId === p.id}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full disabled:opacity-50 flex-shrink-0 ${
                        p.is_active
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                      }`}
                    >
                      {p.is_active ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!promoLoading && totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={20} />
        )}
      </section>
    </div>
  );
}
