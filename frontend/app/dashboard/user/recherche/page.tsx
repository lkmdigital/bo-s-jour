'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import PropertyCard, { PropertyCardData } from '@/components/home/PropertyCard';
import ResultsMap, { MapItem } from '@/components/accommodations/ResultsMap';
import MemberAside from '@/components/dashboard/user/MemberAside';
import Pagination from '@/components/common/Pagination';
import { resolveImageUrl } from '@/lib/utils';
import {
  Search, MapPin, Calendar, Users, SlidersHorizontal, Star, Map as MapIcon, List, X,
} from 'lucide-react';

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
  { key: 'apartment', label: 'Appartement' },
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
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [applied, setApplied] = useState({ search: '', checkIn: '', checkOut: '', guests: '1' });

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');

  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 9, current_page: 1, last_page: 1 });
  const [mapCfg, setMapCfg] = useState<{ provider: string; token: string }>({ provider: 'osm', token: '' });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.get('/settings/public')
      .then((r) => setMapCfg({ provider: r.data?.maps_provider || 'osm', token: r.data?.mapbox_token || '' }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params: Record<string, string | number> = { per_page: 9, page: currentPage, sort };
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
  }, [currentPage, sort, applied, filters]);

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
          <h1 className="text-2xl sm:text-3xl font-bold mb-5">Trouvez votre prochain séjour</h1>
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

          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary outline-none">
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
              {cards.map((c) => <PropertyCard key={c.id} data={c} />)}
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
    </div>
  );
}
