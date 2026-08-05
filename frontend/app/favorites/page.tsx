'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Header from '@/components/common/Header';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PropertyCard, { PropertyCardData } from '@/components/home/PropertyCard';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { Heart, Compass } from 'lucide-react';

interface FavoriteAccommodation {
  id: number;
  name: string;
  city: string;
  price_per_night: number | string;
  rating: number | string | null;
  total_reviews: number | null;
  image: string | null;
  status: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { ids } = useFavoritesStore();
  const [items, setItems] = useState<FavoriteAccommodation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/favorites');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await api.get('/favorites');
      setItems(res.data?.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) fetchFavorites();
  }, [isAuthenticated, isLoading]);

  // Retirer de la liste dès qu'un cœur est décoché (les ids du store changent)
  useEffect(() => {
    setItems((prev) => prev.filter((a) => ids.includes(a.id)));
  }, [ids]);

  if (isLoading || (loading && isAuthenticated)) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement de vos favoris..." size="lg" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const cards: PropertyCardData[] = items.map((a) => ({
    id: a.id,
    title: a.name,
    location: a.city,
    image: a.image || '',
    rating: a.rating != null && Number(a.rating) > 0 ? Number(a.rating) : undefined,
    reviews: a.total_reviews ?? undefined,
    price: Number(a.price_per_night),
  }));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Heart className="w-7 h-7 text-primary fill-primary" />
            Mes favoris
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Retrouvez ici les établissements que vous avez enregistrés.
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="card text-center py-16">
            <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Vous n&apos;avez pas encore de favoris. Explorez et enregistrez vos coups de cœur ❤️
            </p>
            <Link href="/accommodations" className="btn-primary inline-flex items-center gap-2">
              <Compass className="w-4 h-4" />
              Explorer les hébergements
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cards.map((c) => (
              <PropertyCard key={c.id} data={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
