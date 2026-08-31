'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import Pagination from '@/components/common/Pagination';
import PropertyCard, { PropertyCardData } from '@/components/home/PropertyCard';
import ResultsMap, { MapItem } from '@/components/accommodations/ResultsMap';
import { Search, SlidersHorizontal, X, Star, Map, List, Minus, Plus, Users, Gift, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Accommodation {
  id: number;
  name: string;
  slug: string;
  type: string;
  description: string;
  city: string;
  price_per_night: number;
  rating: number;
  total_reviews: number;
  latitude?: string | number | null;
  longitude?: string | number | null;
  images: Array<{ url: string; is_primary: boolean }>;
}

const fallbackImg = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';

// Alignés sur l'enum de la base (hotel, lodge, guesthouse, apartment)
const TYPES = [
  { key: 'hotel', label: 'Hôtel' },
  { key: 'lodge', label: 'Écolodge' },
  { key: 'guesthouse', label: "Maison d'hôtes" },
  { key: 'apartment', label: 'Résidence' },
];
// Alignés sur la liste réelle proposée à l'hôte lors de la création de son établissement
// (commonAmenities dans AccommodationCreationWizard.tsx) — un service coché ici doit
// correspondre exactement à ce qui est enregistré en base, sinon le filtre ne trouve rien.
// "Animaux acceptés" n'existe pas dans cette liste (pas un service réel du produit).
const AMENITIES = ['Wi-Fi', 'Climatisation', 'Piscine', 'Parking', 'Petit-déjeuner', 'Restaurant', 'Salle de sport'];
const CANCELLATION = ['Flexible', 'Modérée', 'Stricte'];
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
  featured: boolean;
}
const DEFAULT_FILTERS: Filters = { minPrice: '', maxPrice: '', minRating: 0, type: '', amenities: [], cancellation: '', featured: false };

// Next.js 15 : useSearchParams() dans un composant client doit être entouré d'un
// Suspense pendant la génération statique (voir "missing-suspense-with-csr-bailout"),
// même avec `dynamic = 'force-dynamic'" — la vérification a lieu avant que ce réglage
// ne s'applique. Le fallback ne s'affiche jamais en pratique (contenu quasi instantané).
export default function AccommodationsPage() {
  return (
    <Suspense fallback={null}>
      <AccommodationsPageContent />
    </Suspense>
  );
}

function AccommodationsPageContent() {
  const router = useRouter();
  const urlParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  // Offres promotionnelles réservées aux voyageurs inscrits (levier d'inscription) :
  // posé quand l'API renvoie 401 + requires_auth pour une recherche `featured=1`.
  const [offersAuthRequired, setOffersAuthRequired] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 12, current_page: 1, last_page: 1 });
  // Type initialisé depuis l'URL dès le premier rendu (et non via un effet après coup) :
  // sinon le premier fetch part sans filtre, puis un second fetch filtré part juste après —
  // une course que le second peut perdre selon les latences réseau.
  const [filters, setFilters] = useState<Filters>(() => {
    const t = urlParams.get('type');
    const featuredParam = urlParams.get('featured');
    return {
      ...DEFAULT_FILTERS,
      type: t && TYPES.some((x) => x.key === t) ? t : '',
      featured: featuredParam === '1' || featuredParam === 'true',
    };
  });
  const [sort, setSort] = useState('recommended');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [mapCfg, setMapCfg] = useState<{ provider: string; token: string }>({ provider: 'osm', token: '' });

  // Recherche (éditable) — initialisée depuis l'URL
  const [search, setSearch] = useState(urlParams.get('search') || urlParams.get('city') || '');
  const [checkIn, setCheckIn] = useState(urlParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(urlParams.get('checkOut') || '');
  const [guests, setGuests] = useState(Number(urlParams.get('guests')) || 1);
  const [rooms, setRooms] = useState(Number(urlParams.get('rooms')) || 1);
  const [guestsOpen, setGuestsOpen] = useState(false);
  // Valeurs "appliquées" (déclenchent le fetch) — pour ne chercher qu'au clic
  const [applied, setApplied] = useState({ search: search, checkIn, checkOut, guests });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.get('/settings/public')
      .then((r) => setMapCfg({ provider: r.data?.maps_provider || 'osm', token: r.data?.mapbox_token || '' }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'host') {
      router.push('/dashboard/host');
      return;
    }
    // Offres promotionnelles : on attend que l'état de connexion soit résolu avant de
    // lancer la recherche, sinon un voyageur déjà connecté (token en cours d'hydratation)
    // se verrait affiché à tort l'écran "créez un compte" le temps d'un aller-retour.
    if (filters.featured && isLoading) return;
    if (user?.role !== 'host') fetchAccommodations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters, sort, applied, isAuthenticated, isLoading, user?.role]);

  const fetchAccommodations = async () => {
    try {
      setLoading(true);
      setOffersAuthRequired(false);
      const params: Record<string, string | number> = { per_page: 12, page: currentPage, sort };
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
      if (filters.featured) params.featured = 1;

      const res = await api.get('/accommodations', { params });
      const data = res.data?.data && Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setAccommodations(data);
      setPagination({
        total: res.data.total ?? data.length,
        per_page: res.data.per_page ?? 12,
        current_page: res.data.current_page ?? 1,
        last_page: res.data.last_page ?? 1,
      });
    } catch (e: any) {
      if (filters.featured && e.response?.status === 401 && e.response?.data?.requires_auth) {
        setOffersAuthRequired(true);
      } else {
        console.error('Erreur chargement hébergements:', e);
      }
      setAccommodations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (currentPage !== 1) setCurrentPage(1); /* eslint-disable-next-line */ }, [filters, sort, applied]);

  const applySearch = () => {
    setGuestsOpen(false);
    setApplied({ search, checkIn, checkOut, guests });
  };

  const cards: PropertyCardData[] = useMemo(
    () => accommodations.map((a) => ({
      id: a.id,
      title: a.name,
      location: a.city,
      image: a.images?.find((i) => i.is_primary)?.url || a.images?.[0]?.url || fallbackImg,
      rating: a.rating,
      reviews: a.total_reviews,
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

  const activeFilterCount =
    (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0) + (filters.minRating ? 1 : 0) +
    (filters.type ? 1 : 0) + filters.amenities.length + (filters.cancellation ? 1 : 0);

  const toggleAmenity = (a: string) =>
    setFilters((f) => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] }));

  const FiltersPanel = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Budget par nuit</h3>
        <div className="flex items-center gap-3">
          <input type="number" inputMode="numeric" placeholder="Min" value={filters.minPrice}
            onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <span className="text-gray-400">–</span>
          <input type="number" inputMode="numeric" placeholder="Max" value={filters.maxPrice}
            onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <p className="text-xs text-gray-400 mt-1">en FCFA</p>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Note des voyageurs</h3>
        <div className="space-y-2">
          {RATINGS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="rating" checked={filters.minRating === r.value}
                onChange={() => setFilters((f) => ({ ...f, minRating: r.value }))} className="accent-[#FF0000]" />
              {r.value > 0 && <Star className="w-4 h-4 fill-[#F7C948] text-[#F7C948]" />}
              <span className="text-gray-700 dark:text-gray-300">{r.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Type d'hébergement</h3>
        <div className="space-y-2">
          {TYPES.map((t) => (
            <label key={t.key} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="type" checked={filters.type === t.key}
                onChange={() => setFilters((f) => ({ ...f, type: f.type === t.key ? '' : t.key }))} className="accent-[#FF0000]" />
              <span className="text-gray-700 dark:text-gray-300">{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Politique d'annulation</h3>
        <div className="flex flex-wrap gap-2">
          {CANCELLATION.map((c) => (
            <button key={c} type="button"
              onClick={() => setFilters((f) => ({ ...f, cancellation: f.cancellation === c ? '' : c }))}
              className={cn('px-3 py-1.5 rounded-full text-sm border transition-colors',
                filters.cancellation === c ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-700 dark:text-gray-300 hover:border-primary')}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Services</h3>
        <div className="space-y-2">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={filters.amenities.includes(a)} onChange={() => toggleAmenity(a)} className="accent-[#FF0000] rounded" />
              <span className="text-gray-700 dark:text-gray-300">{a}</span>
            </label>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-sm text-primary font-semibold hover:underline">
          Réinitialiser les filtres ({activeFilterCount})
        </button>
      )}
    </div>
  );

  const guestsSummary = `${guests} voyageur${guests > 1 ? 's' : ''} · ${rooms} chambre${rooms > 1 ? 's' : ''}`;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      {/* Barre de recherche complète (destination, dates, voyageurs) */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-[64px] z-30">
        <div className="container mx-auto px-4 max-w-7xl py-3">
          <form onSubmit={(e) => { e.preventDefault(); applySearch(); }}
            className="flex flex-col md:flex-row md:items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl md:rounded-full p-1.5">
            <div className="flex items-center gap-2 flex-1 px-4 md:border-r border-gray-200 dark:border-gray-700">
              <Search className="w-5 h-5 text-primary flex-shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Où allez-vous ?"
                className="w-full bg-transparent focus:outline-none text-sm py-2" />
            </div>
            <div className="flex items-center gap-2 px-4 md:border-r border-gray-200 dark:border-gray-700">
              <input type="date" value={checkIn} min={today}
                onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value > checkOut) setCheckOut(''); }}
                className="bg-transparent text-sm focus:outline-none text-gray-600" aria-label="Arrivée" />
              <span className="text-gray-300">→</span>
              <input type="date" value={checkOut} min={checkIn || today} disabled={!checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className={cn('bg-transparent text-sm focus:outline-none text-gray-600', !checkIn && 'opacity-50')} aria-label="Départ" />
            </div>
            <div className="relative px-4">
              <button type="button" onClick={() => setGuestsOpen((o) => !o)} className="flex items-center gap-2 text-sm text-gray-600 py-2">
                <Users className="w-4 h-4 text-gray-400" /> {guestsSummary}
              </button>
              {guestsOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setGuestsOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 z-30 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4">
                    {[
                      { label: 'Voyageurs', val: guests, set: setGuests, min: 1 },
                      { label: 'Chambres', val: rooms, set: setRooms, min: 1 },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{row.label}</span>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => row.set(Math.max(row.min, row.val - 1))}
                            className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-40" disabled={row.val <= row.min}>
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="min-w-[2ch] text-center font-semibold">{row.val}</span>
                          <button type="button" onClick={() => row.set(row.val + 1)}
                            className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-primary hover:text-primary">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button type="submit" className="btn-primary text-sm md:mr-1">Rechercher</button>
          </form>
        </div>
      </div>

      <main className="container mx-auto px-4 max-w-7xl py-6">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-[140px] max-h-[calc(100vh-160px)] overflow-y-auto pr-2">
              <FiltersPanel />
            </div>
          </aside>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {applied.search
                    ? `Séjours à ${applied.search}`
                    : filters.featured
                      ? 'Nos offres promotionnelles'
                      : 'Tous les hébergements'}
                </h1>
                {!offersAuthRequired && (
                  <p className="text-sm text-gray-500">{loading ? 'Recherche…' : `${pagination.total} résultat${pagination.total > 1 ? 's' : ''}`}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-sm font-medium">
                  <SlidersHorizontal className="w-4 h-4" /> Filtres{activeFilterCount ? ` (${activeFilterCount})` : ''}
                </button>

                <select value={sort} onChange={(e) => setSort(e.target.value)}
                  className="rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>

                <div className="hidden sm:flex rounded-full border border-gray-300 overflow-hidden">
                  <button onClick={() => setView('list')} className={cn('px-3 py-2 text-sm inline-flex items-center gap-1', view === 'list' ? 'bg-primary text-white' : 'text-gray-600')}>
                    <List className="w-4 h-4" /> Liste
                  </button>
                  <button onClick={() => setView('map')} className={cn('px-3 py-2 text-sm inline-flex items-center gap-1', view === 'map' ? 'bg-primary text-white' : 'text-gray-600')}>
                    <Map className="w-4 h-4" /> Carte
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden shadow-md">
                    <div className="aspect-[4/3] skeleton" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-2/3 skeleton rounded" />
                      <div className="h-3 w-1/2 skeleton rounded" />
                      <div className="h-4 w-1/3 skeleton rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : offersAuthRequired ? (
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 min-h-[360px] flex items-center justify-center text-center p-8">
                <div className="max-w-sm">
                  <span className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-7 h-7" />
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Nos offres promotionnelles sont réservées aux voyageurs inscrits
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Créez votre compte bo séjour (gratuit, une minute) ou connectez-vous pour découvrir nos établissements en promotion.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/auth/register?redirect=%2Faccommodations%3Ffeatured%3D1" className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2">
                      <UserPlus className="w-4 h-4" /> Créer mon compte
                    </Link>
                    <Link href="/auth/login?redirect=%2Faccommodations%3Ffeatured%3D1" className="btn-outline w-full sm:w-auto inline-flex items-center justify-center gap-2">
                      <LogIn className="w-4 h-4" /> Se connecter
                    </Link>
                  </div>
                </div>
              </div>
            ) : view === 'map' ? (
              mapItems.length > 0 ? (
                <ResultsMap items={mapItems} provider={mapCfg.provider} mapboxToken={mapCfg.token} />
              ) : (
                <div className="rounded-2xl border border-gray-200 min-h-[400px] flex items-center justify-center text-center p-6">
                  <div>
                    <Map className="w-10 h-10 text-primary mx-auto mb-3" />
                    <p className="font-semibold text-gray-900 dark:text-white">Aucune localisation disponible</p>
                    <p className="text-sm text-gray-500 mt-1">Les établissements de cette recherche n'ont pas encore de coordonnées GPS.</p>
                  </div>
                </div>
              )
            ) : cards.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500">Aucun hébergement ne correspond à votre recherche.</p>
                <button onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(''); setApplied({ search: '', checkIn: '', checkOut: '', guests: 1 }); }} className="btn-outline mt-4">Réinitialiser</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {cards.map((p) => <PropertyCard key={p.id} data={p} />)}
                </div>
                <Pagination
                  currentPage={pagination.current_page}
                  totalPages={pagination.last_page}
                  onPageChange={(pg) => { setCurrentPage(pg); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.per_page}
                />
              </>
            )}
          </section>
        </div>
      </main>

      {/* Drawer filtres mobile */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="font-bold text-lg">Filtres</h2>
              <button onClick={() => setMobileFiltersOpen(false)} aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4"><FiltersPanel /></div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-900">
              <button onClick={() => setMobileFiltersOpen(false)} className="btn-primary w-full">Voir {pagination.total} résultats</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
