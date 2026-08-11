'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import PropertyCard, { PropertyCardData } from '@/components/home/PropertyCard';
import ResultsMap, { MapItem } from '@/components/accommodations/ResultsMap';
import MemberAside from '@/components/dashboard/user/MemberAside';
import { resolveImageUrl } from '@/lib/utils';
import { Search, MapPin, Calendar, Users, SlidersHorizontal, ArrowRight } from 'lucide-react';

interface RawAccommodation {
  id: number;
  name: string;
  city: string;
  price_per_night: number;
  rating?: number | string | null;
  total_reviews?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  images?: Array<{ url: string; is_primary?: boolean }>;
}

// Les filtres avancés vivent sur la page résultats complète (/accommodations).
const FILTER_PILLS = [
  { label: 'Région', href: '/accommodations' },
  { label: 'Prix', href: '/accommodations' },
  { label: 'Étoiles', href: '/accommodations' },
  { label: 'Équipements', href: '/accommodations' },
  { label: 'Annulation gratuite', href: '/accommodations?cancellation=flexible' },
];

const inputCls =
  'w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none';

export default function MemberSearchPage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [items, setItems] = useState<RawAccommodation[]>([]);
  const [mapCfg, setMapCfg] = useState<{ provider: string; token: string }>({ provider: 'osm', token: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/public')
      .then((r) => setMapCfg({ provider: r.data?.maps_provider || 'osm', token: r.data?.mapbox_token || '' }))
      .catch(() => {});
    api.get('/accommodations', { params: { per_page: 8, sort: 'recommended' } })
      .then((r) => setItems(r.data?.data ?? (Array.isArray(r.data) ? r.data : [])))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (destination.trim()) p.set('destination', destination.trim());
    if (checkIn) p.set('check_in', checkIn);
    if (checkOut) p.set('check_out', checkOut);
    if (guests) p.set('guests', guests);
    router.push(`/accommodations${p.toString() ? `?${p.toString()}` : ''}`);
  };

  const cards: PropertyCardData[] = useMemo(
    () =>
      items.map((a) => ({
        id: a.id,
        title: a.name,
        location: a.city,
        image: resolveImageUrl(a.images?.find((i) => i.is_primary)?.url || a.images?.[0]?.url) || '',
        rating: a.rating != null && Number(a.rating) > 0 ? Number(a.rating) : undefined,
        reviews: a.total_reviews ?? undefined,
        price: a.price_per_night,
      })),
    [items]
  );

  const mapItems: MapItem[] = useMemo(
    () =>
      items
        .filter((a) => a.latitude != null && a.longitude != null && Number.isFinite(Number(a.latitude)) && Number.isFinite(Number(a.longitude)))
        .map((a) => ({ id: a.id, title: a.name, price: a.price_per_night, lat: Number(a.latitude), lng: Number(a.longitude) })),
    [items]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        {/* Hero recherche */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-6 sm:p-8 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-5">Trouvez votre prochain séjour</h1>
          <form onSubmit={onSearch} className="bg-white rounded-2xl p-2 flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" className={`${inputCls} text-gray-900`} />
            </div>
            <div className="relative flex-1">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={`${inputCls} text-gray-900`} />
            </div>
            <div className="relative flex-1">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn || undefined} className={`${inputCls} text-gray-900`} />
            </div>
            <div className="relative flex-1">
              <Users className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select value={guests} onChange={(e) => setGuests(e.target.value)} className={`${inputCls} text-gray-900 appearance-none`}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} voyageur{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary flex items-center justify-center gap-2 lg:px-6 whitespace-nowrap">
              <Search className="w-4 h-4" /> Rechercher
            </button>
          </form>
        </div>

        {/* Filtres (renvoient vers la recherche complète) */}
        <div className="flex flex-wrap gap-2">
          <Link href="/accommodations" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary transition-colors">
            <SlidersHorizontal className="w-4 h-4" /> Filtres
          </Link>
          {FILTER_PILLS.map((f) => (
            <Link key={f.label} href={f.href} className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary transition-colors">
              {f.label}
            </Link>
          ))}
        </div>

        {/* Carte + résultats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 min-h-[360px] bg-white dark:bg-gray-800">
            {mapItems.length > 0 ? (
              <ResultsMap items={mapItems} provider={mapCfg.provider} mapboxToken={mapCfg.token} className="h-full min-h-[360px]" />
            ) : (
              <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-gray-400 gap-2">
                <MapPin className="w-8 h-8" />
                <p className="text-sm">Carte interactive — Côte d&apos;Ivoire</p>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {loading ? (
              <p className="text-sm text-gray-500">Chargement des établissements…</p>
            ) : cards.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun établissement pour le moment.</p>
            ) : (
              cards.slice(0, 4).map((c) => <PropertyCard key={c.id} data={c} />)
            )}
          </div>
        </div>

        <div className="text-center">
          <Link href="/accommodations" className="btn-outline inline-flex items-center gap-2">
            Voir tous les résultats <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <MemberAside />
    </div>
  );
}
