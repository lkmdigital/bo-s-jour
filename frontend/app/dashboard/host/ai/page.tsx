'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { Sparkles, TrendingUp, ImageIcon, MessageSquareWarning, PartyPopper, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface HostAnalytics {
  occupancy_rate: number;
  room_stats?: {
    rooms_needing_images: number;
    avg_images_per_room: number;
  } | null;
}

interface Review {
  id: number;
  host_reply?: string | null;
}

interface Recommendation {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export default function HostAiAssistantPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<HostAnalytics>('/analytics/host'),
      api.get('/host/reviews', { params: { per_page: 50 } }),
    ])
      .then(([analyticsRes, reviewsRes]) => {
        const analytics = analyticsRes.data;
        const reviews: Review[] = Array.isArray(reviewsRes.data?.data)
          ? reviewsRes.data.data
          : reviewsRes.data || [];
        const unansweredCount = reviews.filter((r) => !r.host_reply).length;

        const recs: Recommendation[] = [];

        if (analytics.occupancy_rate > 70) {
          recs.push({
            key: 'pricing',
            icon: TrendingUp,
            title: 'Augmentez vos tarifs',
            description: `Votre taux d'occupation est à ${Math.round(analytics.occupancy_rate)}%. Vous pouvez augmenter vos tarifs de 5 à 10 % sans impacter vos réservations.`,
            ctaLabel: 'Ajuster mes tarifs',
            ctaHref: '/dashboard/host/rooms',
          });
        }

        const avgImages = analytics.room_stats?.avg_images_per_room ?? null;
        const roomsNeedingImages = analytics.room_stats?.rooms_needing_images ?? 0;
        if ((avgImages !== null && avgImages < 3) || roomsNeedingImages > 0) {
          recs.push({
            key: 'photos',
            icon: ImageIcon,
            title: 'Optimisez vos photos',
            description:
              roomsNeedingImages > 0
                ? `${roomsNeedingImages} chambre(s) manquent de photos. Les chambres avec photos HD reçoivent jusqu'à 25 % de réservations en plus.`
                : `Vos chambres ont en moyenne ${avgImages?.toFixed(1)} photo(s). Ajoutez-en davantage pour améliorer votre visibilité.`,
            ctaLabel: 'Gérer mes chambres',
            ctaHref: '/dashboard/host/rooms',
          });
        }

        if (unansweredCount > 0) {
          recs.push({
            key: 'reviews',
            icon: MessageSquareWarning,
            title: 'Répondez aux avis',
            description: `Vous avez ${unansweredCount} avis sans réponse. Cela affecte votre score Bosejour.`,
            ctaLabel: 'Répondre aux avis',
            ctaHref: '/dashboard/host/reviews',
          });
        }

        setRecommendations(recs);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Erreur lors du chargement de l'assistant IA");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} onDismiss={() => setError(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-bosejour-red" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assistant IA</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Recommandations intelligentes pour optimiser vos établissements
          </p>
        </div>
      </div>

      {!recommendations || recommendations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <PartyPopper className="w-12 h-12 mx-auto text-bosejour-red/60 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tout est optimisé !</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Aucune recommandation pour le moment. Continuez comme ça !
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map(({ key, icon: Icon, title, description, ctaLabel, ctaHref }) => (
            <div
              key={key}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-bosejour-red/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-bosejour-red" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">{description}</p>
              <Link
                href={ctaHref}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-bosejour-red"
              >
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
