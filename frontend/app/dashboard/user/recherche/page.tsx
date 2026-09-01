'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import PropertyCard, { PropertyCardData } from '@/components/home/PropertyCard';
import ResultsMap, { MapItem } from '@/components/accommodations/ResultsMap';
import MemberAside from '@/components/dashboard/user/MemberAside';
import Pagination from '@/components/common/Pagination';
import { formatPrice, resolveImageUrl, toDateInputValue } from '@/lib/utils';
import { useAppearanceStore } from '@/stores/appearanceStore';
import {
  Search, MapPin, Calendar, Users, SlidersHorizontal, Star, Map as MapIcon, List, X,
  Scale, Check, Minus, Loader2,
} from 'lucide-react';

interface AccommodationDetail {
  id: number;
  name: string;
  city: string;
  type?: string;
  price_per_night: number;
  rating?: number | string | null;
  total_reviews?: number | null;
  amenities?: string[];
  cancellation_policy_hours?: number | null;
  image?: string;
}

function cancellationLabel(h?: number | null) {
  const v = typeof h === 'number' ? h : 48;
  if (v === 0) return 'Stricte';
  if (v <= 24) return 'Modérée';
  return 'Flexible';
}

interface Accommodation {
  id: number;
  name: string;
  city: string;
  type?: string;
  price_per_night: number;
  rating?: number | string | null;
  total_reviews?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  images?: Array<{ url: string; is_primary?: boolean }>;
}

const TYPES = [
  { key: '', label: 'Tous' },
  { key: 'hotel', label: 'Hôtel' },
  { key: 'lodge', label: 'Écolodge' },
  { key: 'guesthouse', label: "Maison d'hôtes" },
  { key: 'apartment', label: 'Résidence' },
];
const AMENITIES = ['Wifi', 'Parking', 'Piscine', 'Climatisation', 'Petit-déjeuner', 'Restaurant', 'Salle de sport', 'Animaux acceptés'];
const CANCELLATION = [
  { key: '', label: 'Toutes' },
  { key: 'Flexible', label: 'Flexible' },
  { key: 'Modérée', label: 'Modérée' },
  { key: 'Stricte', label: 'Stricte' },
];
const SORTS = [
  { key: 'recommended', label: 'Recommandés' },
  { key: 'price_asc', label: 'Prix croissant' },
  { key: 'price_desc', label: 'Prix décroissant' },
  { key: 'rating', label: 'Mieux notés' },
];
const RATINGS = [
  { value: 0, label: 'Toutes les notes' },
  { value: 4.5, label: '4,5 et plus' },
  { value: 4, label: '4 et plus' },
  { value: 3.5, label: '3,5 et plus' },
];

interface Filters {
  minPrice: string;
  maxPrice: string;
  minRating: number;
  type: string;
  amenities: string[];
  cancellation: string;
}
const DEFAULT_FILTERS: Filters = { minPrice: '', maxPrice: '', minRating: 0, type: '', amenities: [], cancellation: '' };

const inputCls =
  'w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none';

export default function MemberSearchPage() {
  const t = useTranslations('member.pages.search');
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [applied, setApplied] = useState({ search: '', checkIn: '', checkOut: '', guests: '1' });

  // Préférences de personnalisation (Paramètres) : tri par défaut + résultats par page.
  const { defaultSort, resultsPerPage } = useAppearanceStore();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState(defaultSort);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');

  // Comparateur d'établissements (brief Étape 4 — "comparer les établissements")
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [compareDetails, setCompareDetails] = useState<Record<number, AccommodationDetail>>({});
  const [compareLoading, setCompareLoading] = useState(false);

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const openCompare = async () => {
    setShowCompare(true);
    const missing = compareIds.filter((id) => !compareDetails[id]);
    if (missing.length === 0) return;
    setCompareLoading(true);
    try {
      const results = await Promise.all(missing.map((id) => api.get(`/accommodations/${id}`).then((r) => r.data).catch(() => null)));
      setCompareDetails((prev) => {
        const next = { ...prev };
        results.forEach((d, i) => {
          if (d) {
            next[missing[i]] = {
              id: d.id, name: d.name, city: d.city, type: d.type,
              price_per_night: d.price_per_night, rating: d.rating, total_reviews: d.total_reviews,
              amenities: d.amenities || [], cancellation_policy_hours: d.cancellation_policy_hours,
              image: d.images?.find((im: any) => im.is_primary)?.url || d.images?.[0]?.url,
            };
          }
        });
        return next;
      });
    } finally {
      setCompareLoading(false);
    }
  };

  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: resultsPerPage, current_page: 1, last_page: 1 });
  const [mapCfg, setMapCfg] = useState<{ provider: string; token: string }>({ provider: 'osm', token: '' });

  const today = toDateInputValue(new Date());

  useEffect(() => {
    api.get('/settings/public')
      .then((r) => setMapCfg({ provider: r.data?.maps_provider || 'osm', token: r.data?.mapbox_token || '' }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params: Record<string, string | number> = { per_page: resultsPerPage, page: currentPage, sort };
        if (applied.search) params.search = applied.search;
        if (applied.checkIn) params.check_in = applied.checkIn;
        if (applied.checkOut) params.check_out = applied.checkOut;
        if (applied.guests) params.guests = applied.guests;
        if (filters.type) params.type = filters.type;
        if (filters.minPrice) params.min_price = filters.minPrice;
        if (filters.maxPrice) params.max_price = filters.maxPrice;
        if (filters.minRating) params.min_rating = filters.minRating;
        if (filters.amenities.length) params.amenities = filters.amenities.join(',');
        if (filters.cancellation) params.cancellation_policy = filters.cancellation;

        const res = await api.get('/accommodations', { params });
        const data: Accommodation[] = res.data?.data && Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setAccommodations(data);
        setPagination({
          total: res.data.total ?? data.length,
          per_page: res.data.per_page ?? 9,
          current_page: res.data.current_page ?? 1,
          last_page: res.data.last_page ?? 1,
        });
      } catch {
        setAccommodations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage, sort, applied, filters, resultsPerPage]);

  // Retour page 1 quand la recherche/les filtres changent
  useEffect(() => { if (currentPage !== 1) setCurrentPage(1); /* eslint-disable-next-line */ }, [applied, filters, sort]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied({ search: destination.trim(), checkIn, checkOut, guests });
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const toggleAmenity = (a: string) =>
    setFilters((f) => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] }));

  const activeFilterCount =
    (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0) + (filters.minRating ? 1 : 0) +
    (filters.type ? 1 : 0) + filters.amenities.length + (filters.cancellation ? 1 : 0);

  const cards: PropertyCardData[] = useMemo(
    () => accommodations.map((a) => ({
      id: a.id,
      title: a.name,
      location: a.city,
      image: resolveImageUrl(a.images?.find((i) => i.is_primary)?.url || a.images?.[0]?.url) || '',
      rating: a.rating != null && Number(a.rating) > 0 ? Number(a.rating) : undefined,
      reviews: a.total_reviews ?? undefined,
      price: a.price_per_night,
    })),
    [accommodations]
  );

  const mapItems: MapItem[] = useMemo(
    () => accommodations
      .map((a) => ({ id: a.id, title: a.name, price: a.price_per_night, lat: Number(a.latitude), lng: Number(a.longitude) }))
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng) && (m.lat !== 0 || m.lng !== 0)),
    [accommodations]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        {/* Hero recherche */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-6 sm:p-8 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-5">{t('title')}</h1>
          <form onSubmit={applySearch} className="bg-white rounded-2xl p-2 flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" className={`${inputCls} text-gray-900`} />
            </div>
            <div className="relative flex-1">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} className={`${inputCls} text-gray-900`} />
            </div>
            <div className="relative flex-1">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date" value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} className={`${inputCls} text-gray-900`} />
            </div>
            <div className="relative flex-1">
              <Users className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select value={guests} onChange={(e) => setGuests(e.target.value)} className={`${inputCls} text-gray-900 appearance-none`}>
                {[1, 2, 3, 4, 5, 6].map((n) => (<option key={n} value={n}>{n} voyageur{n > 1 ? 's' : ''}</option>))}
              </select>
            </div>
            <button type="submit" className="btn-primary flex items-center justify-center gap-2 lg:px-6 whitespace-nowrap">
              <Search className="w-4 h-4" /> Rechercher
            </button>
          </form>
        </div>

        {/* Barre d'outils : filtres + tri + vue */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount ? 'border-primary text-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filtres
            {activeFilterCount > 0 && <span className="ml-1 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">{activeFilterCount}</span>}
          </button>

          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="px-3 py-2 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary outline-none">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          <span className="text-sm text-gray-500 ml-1">{pagination.total} résultat{pagination.total > 1 ? 's' : ''}</span>

          <div className="ml-auto flex rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setView('list')} className={`px-3 py-2 text-sm inline-flex items-center gap-1.5 ${view === 'list' ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              <List className="w-4 h-4" /> Liste
            </button>
            <button onClick={() => setView('map')} className={`px-3 py-2 text-sm inline-flex items-center gap-1.5 ${view === 'map' ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              <MapIcon className="w-4 h-4" /> Carte
            </button>
          </div>
        </div>

        {/* Panneau de filtres (repliable) */}
        {showFilters && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Filtres</h3>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Réinitialiser</button>
                )}
                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Budget */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Budget par nuit (FCFA)</h4>
                <div className="flex items-center gap-2">
                  <input type="number" inputMode="numeric" placeholder="Min" value={filters.minPrice} onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                  <span className="text-gray-400">–</span>
                  <input type="number" inputMode="numeric" placeholder="Max" value={filters.maxPrice} onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>

              {/* Note */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Note des voyageurs</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {RATINGS.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" name="rating" checked={filters.minRating === r.value} onChange={() => setFilters((f) => ({ ...f, minRating: r.value }))} className="accent-[#FF0000]" />
                      {r.value > 0 && <Star className="w-3.5 h-3.5 fill-[#F7C948] text-[#F7C948]" />}
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Type d'établissement</h4>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button key={t.key} onClick={() => setFilters((f) => ({ ...f, type: f.type === t.key ? '' : t.key }))} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filters.type === t.key ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-700'}`}>{t.label}</button>
                  ))}
                </div>
              </div>

              {/* Annulation */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Politique d'annulation</h4>
                <select value={filters.cancellation} onChange={(e) => setFilters((f) => ({ ...f, cancellation: e.target.value }))} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none">
                  {CANCELLATION.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Équipements */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Équipements</h4>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => (
                  <button key={a} onClick={() => toggleAmenity(a)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filters.amenities.includes(a) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-700'}`}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Résultats : liste ou carte */}
        {view === 'map' ? (
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 h-[560px] bg-white dark:bg-gray-800">
            {mapItems.length > 0 ? (
              <ResultsMap items={mapItems} provider={mapCfg.provider} mapboxToken={mapCfg.token} className="h-full" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                <MapPin className="w-8 h-8" /><p className="text-sm">Aucun établissement géolocalisé.</p>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => <div key={i} className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Aucun établissement ne correspond à votre recherche.</p>
            {(activeFilterCount > 0 || applied.search) && (
              <button onClick={() => { resetFilters(); setDestination(''); setApplied({ search: '', checkIn: '', checkOut: '', guests: '1' }); }} className="btn-outline mt-4 text-sm">Réinitialiser la recherche</button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {cards.map((c) => {
                const id = Number(c.id);
                const checked = compareIds.includes(id);
                return (
                  <div key={c.id} className="relative">
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/95 dark:bg-gray-900/95 shadow-sm border border-gray-200 dark:border-gray-700 text-xs font-medium cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && compareIds.length >= 3}
                        onChange={() => toggleCompare(id)}
                        className="accent-[#FF0000] w-3.5 h-3.5"
                      />
                      Comparer
                    </label>
                    <PropertyCard data={c} />
                  </div>
                );
              })}
            </div>
            {pagination.last_page > 1 && (
              <Pagination
                currentPage={pagination.current_page}
                totalPages={pagination.last_page}
                onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                totalItems={pagination.total}
                itemsPerPage={pagination.per_page}
              />
            )}
          </>
        )}
      </div>

      <MemberAside />

      {/* Barre flottante de comparaison */}
      {compareIds.length >= 2 && !showCompare && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-full shadow-xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium flex items-center gap-2"><Scale className="w-4 h-4" /> {compareIds.length} établissement{compareIds.length > 1 ? 's' : ''} sélectionné{compareIds.length > 1 ? 's' : ''}</span>
          <button onClick={openCompare} className="btn-primary text-sm !py-1.5 !px-4">Comparer</button>
          <button onClick={() => setCompareIds([])} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Modale de comparaison */}
      {showCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCompare(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Scale className="w-5 h-5 text-primary" /> Comparer les établissements</h2>
              <button onClick={() => setShowCompare(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {compareLoading ? (
              <div className="py-16 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 w-28"></th>
                      {compareIds.map((id) => {
                        const d = compareDetails[id];
                        return (
                          <th key={id} className="p-2 text-left align-top min-w-[180px]">
                            <div className="relative w-full h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-2">
                              {d?.image && <img src={resolveImageUrl(d.image) || d.image} alt={d.name} className="w-full h-full object-cover" />}
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">{d?.name || '…'}</p>
                            <p className="text-xs text-gray-500">{d?.city}</p>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr>
                      <td className="p-2 text-gray-500">Prix / nuit</td>
                      {compareIds.map((id) => <td key={id} className="p-2 font-semibold">{compareDetails[id] ? `${formatPrice(compareDetails[id].price_per_night)} F` : '—'}</td>)}
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-500">Note</td>
                      {compareIds.map((id) => {
                        const d = compareDetails[id];
                        const r = d?.rating != null ? Number(d.rating) : 0;
                        return <td key={id} className="p-2">{r > 0 ? <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-[#F7C948] text-[#F7C948]" /> {r.toFixed(1)} {d?.total_reviews ? `(${d.total_reviews})` : ''}</span> : 'Pas encore d\'avis'}</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-500">Type</td>
                      {compareIds.map((id) => <td key={id} className="p-2">{TYPES.find((t) => t.key === compareDetails[id]?.type)?.label || compareDetails[id]?.type || '—'}</td>)}
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-500">Politique d'annulation</td>
                      {compareIds.map((id) => <td key={id} className="p-2">{compareDetails[id] ? cancellationLabel(compareDetails[id].cancellation_policy_hours) : '—'}</td>)}
                    </tr>
                    {AMENITIES.map((a) => (
                      <tr key={a}>
                        <td className="p-2 text-gray-500">{a}</td>
                        {compareIds.map((id) => (
                          <td key={id} className="p-2">
                            {compareDetails[id]?.amenities?.includes(a)
                              ? <Check className="w-4 h-4 text-green-600" />
                              : <Minus className="w-4 h-4 text-gray-300" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td className="p-2"></td>
                      {compareIds.map((id) => (
                        <td key={id} className="p-2">
                          <a href={`/accommodations/${id}`} className="btn-outline text-xs inline-block">Voir la fiche</a>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
