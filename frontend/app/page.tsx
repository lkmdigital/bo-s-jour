'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import HeroSection from '@/components/common/HeroSection';
import PropertyCarousel from '@/components/home/PropertyCarousel';
import { PropertyCardData } from '@/components/home/PropertyCard';
import { resolveImageUrl } from '@/lib/utils';
import {
  TrustSection, TrendingDestinations, SaveMore, TopSites, Activities, VideoShowcase, Testimonials,
} from '@/components/home/sections';

const img = (id: string, w = 600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// Fallbacks (si l'API ne renvoie rien) — href vers la recherche pour éviter tout 404
const WEEKEND_FALLBACK: PropertyCardData[] = [
  { id: 'w1', title: 'Villa Sérénité Bord de mer', location: 'Assinie', image: img('1613490493576-7fde63acd811'), rating: 4.0, reviews: 160, price: 175000, oldPrice: 250000, offerLabel: 'Offre Escapade', href: '/accommodations' },
  { id: 'w2', title: 'Bungalow Tropical', location: 'Grand-Bassam', image: img('1573843981267-be1999ff37cd'), rating: 3.8, reviews: 210, price: 160000, oldPrice: 210000, offerLabel: 'Offre Escapade', href: '/accommodations' },
  { id: 'w3', title: 'Suites Lagune', location: 'Abidjan, Cocody', image: img('1571896349842-33c89424de2d'), rating: 4.9, reviews: 185, price: 255000, oldPrice: 300000, offerLabel: 'Offre Escapade', href: '/accommodations' },
  { id: 'w4', title: 'Complexe hôtelier détente', location: 'San-Pédro', image: img('1571003123894-1f0594d2b5d9'), rating: 4.6, reviews: 142, price: 190000, oldPrice: 280000, offerLabel: 'Offre Escapade', href: '/accommodations' },
];

const LOVED_FALLBACK: PropertyCardData[] = [
  { id: 'l1', title: 'Hôtel Azur Horizon', location: 'Assinie Mafia', image: img('1566073771259-6a8506099945'), rating: 5.0, reviews: 350, price: 165000, href: '/accommodations' },
  { id: 'l2', title: 'Maison Palmeraie', location: 'Grand-Bassam', image: img('1613977257363-707ba9348227'), rating: 5.0, reviews: 200, price: 175000, href: '/accommodations' },
  { id: 'l3', title: 'Casa Tranquila', location: 'Grand-Béréby', image: img('1520250497591-112f2f40a3f4'), rating: 4.8, reviews: 160, price: 145000, href: '/accommodations' },
  { id: 'l4', title: 'Villa San Martino', location: 'Assinie Mafia', image: img('1582719478250-c89cae4dc85b'), rating: 5.0, reviews: 160, price: 190000, href: '/accommodations' },
];

interface ApiAccommodation {
  id: number; name: string; city: string; price_per_night: number;
  rating: number; total_reviews: number; images?: Array<{ url: string; is_primary: boolean }>;
}

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [loved, setLoved] = useState<PropertyCardData[]>(LOVED_FALLBACK);
  const [weekend, setWeekend] = useState<PropertyCardData[]>(WEEKEND_FALLBACK);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user?.role === 'host') {
      router.push('/dashboard/host');
      return;
    }
    if (user?.role !== 'host') {
      api.get('/accommodations', { params: { per_page: 8 } })
        .then((res) => {
          const list: ApiAccommodation[] = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
          if (list.length) {
            const mapped: PropertyCardData[] = list.slice(0, 8).map((a) => ({
              id: a.id,
              title: a.name,
              location: a.city,
              image: resolveImageUrl(a.images?.find((i) => i.is_primary)?.url || a.images?.[0]?.url) || img('1566073771259-6a8506099945'),
              rating: a.rating,
              reviews: a.total_reviews,
              price: a.price_per_night,
            }));
            setLoved(mapped);
            // Offres du week-end : mêmes établissements avec un prix « avant » indicatif
            setWeekend(mapped.map((m) => ({ ...m, offerLabel: 'Offre Escapade', oldPrice: Math.round(m.price * 1.3) })));
          }
        })
        .catch(() => { /* garde le fallback */ });
    }
  }, [isAuthenticated, isLoading, user?.role, router]);

  // Photos réelles (établissements) pour les sections éditoriales, fallback Unsplash sinon
  const editorialPhotos = useMemo(() => loved.map((l) => l.image), [loved]);

  const handleSearch = (params: {
    search?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    rooms?: number;
    city?: string;
    type?: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    router.push(`/accommodations?${qs.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-32 text-gray-500">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="relative z-50">
        <Header />
      </div>

      <HeroSection onSearch={handleSearch} />

      <TrustSection />
      <TrendingDestinations photos={editorialPhotos} />

      <div className="bg-gray-50 dark:bg-gray-900/40">
        <PropertyCarousel title="Offres du week-end" items={weekend} />
      </div>

      <SaveMore />
      <TopSites photos={editorialPhotos} />
      <Activities photos={editorialPhotos} />
      <VideoShowcase photos={editorialPhotos} />

      <PropertyCarousel title="Les maisons que les clients adorent" items={loved} />

      <Testimonials />
      <Footer />
    </div>
  );
}
