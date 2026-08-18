'use client';

import { useState } from 'react';
import { Star, Users, Sparkles, Sofa, Coffee, Wifi, Accessibility, Bus, Activity, Wallet, Utensils } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import ReportReviewButton from '@/components/review/ReportReviewButton';

interface CategoryRatings {
  staff?: number;
  cleanliness?: number;
  comfort?: number;
  breakfast?: number;
  wifi?: number;
  accessibility?: number;
  shuttle?: number;
  activities?: number;
  value_for_money?: number;
  restaurant?: number;
}

interface ReviewItem {
  id: number;
  rating: number;
  comment: string;
  category_ratings?: CategoryRatings;
  user: { name: string; avatar?: string | null };
  created_at: string;
  admin_reply?: string | null;
}

interface ReviewsSectionProps {
  id?: string;
  reviews: ReviewItem[];
  averageRating?: number | null;
  totalReviews?: number | null;
  isAuthenticated: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  staff: 'Personnel',
  cleanliness: 'Propreté',
  comfort: 'Confort',
  breakfast: 'Petits déjeuners',
  wifi: 'Wifi',
  accessibility: 'Accessibilité',
  shuttle: 'Navette',
  activities: 'Autres activités',
  value_for_money: 'Rapport qualité-prix',
  restaurant: 'Restaurant',
};

// Résumé "Note globale" : moyenne par critère, affichée uniquement pour les
// critères effectivement notés par au moins un voyageur.
const SUMMARY_CATEGORIES: Array<{ key: keyof CategoryRatings; label: string; icon: typeof Star }> = [
  { key: 'staff', label: 'Personnel', icon: Users },
  { key: 'cleanliness', label: 'Propreté', icon: Sparkles },
  { key: 'comfort', label: 'Confort', icon: Sofa },
  { key: 'breakfast', label: 'Petits déjeuners', icon: Coffee },
  { key: 'wifi', label: 'Wifi', icon: Wifi },
  { key: 'accessibility', label: 'Accessibilité', icon: Accessibility },
  { key: 'shuttle', label: 'Navette', icon: Bus },
  { key: 'activities', label: 'Autres activités', icon: Activity },
  { key: 'value_for_money', label: 'Rapport qualité-prix', icon: Wallet },
  { key: 'restaurant', label: 'Restaurant', icon: Utensils },
];

const PAGE_SIZE = 6;

function reviewAvatarUrl(user: { name: string; avatar?: string | null }): string {
  if (user.avatar) {
    if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
      return resolveImageUrl(user.avatar);
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';
    const baseUrl = apiUrl.replace(/\/(tunnel-)?api$/, '');
    return resolveImageUrl(`${baseUrl}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`);
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=C1121F&color=fff&size=80`;
}

function ReviewCard({ review, isAuthenticated }: { review: ReviewItem; isAuthenticated: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.comment.length > 140;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reviewAvatarUrl(review.user)}
            alt={review.user.name}
            className="w-9 h-9 rounded-full object-cover bg-gray-100 dark:bg-gray-800 flex-shrink-0"
          />
          <div className="min-w-0">
            <span className="font-semibold text-sm block truncate">{review.user.name}</span>
            <span className="text-xs text-gray-500">
              {new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-xs flex-shrink-0">
          {Number(review.rating).toFixed(1)}
        </span>
      </div>

      <p className={`text-sm text-gray-700 dark:text-gray-300 flex-1 ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
        {review.comment}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs font-medium text-primary hover:underline mt-2 self-start"
        >
          {expanded ? 'Afficher moins' : 'Afficher plus'}
        </button>
      )}

      {isAuthenticated && (
        <div className="mt-2">
          <ReportReviewButton reviewId={review.id} />
        </div>
      )}
      {review.admin_reply && (
        <div className="mt-3 pl-3 border-l-2 border-primary/30 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg py-2 pr-3">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Réponse de l&apos;établissement</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">{review.admin_reply}</p>
        </div>
      )}
    </div>
  );
}

export default function ReviewsSection({ id, reviews, averageRating, totalReviews, isAuthenticated }: ReviewsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  if (!reviews || reviews.length === 0) return null;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(Number(r.rating)) === star).length;
    return { star, count, percent: reviews.length ? Math.round((count / reviews.length) * 100) : 0 };
  });

  const displayedAverage = Number(
    averageRating ?? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
  );

  const categoryAverages = SUMMARY_CATEGORIES.map(({ key, label, icon }) => {
    const values = reviews
      .map((r) => r.category_ratings?.[key])
      .filter((v): v is number => v != null);
    const avg = values.length ? values.reduce((s, v) => s + Number(v), 0) / values.length : null;
    return { label, icon, avg };
  }).filter((c) => c.avg != null);

  const visibleReviews = showAll ? reviews : reviews.slice(0, PAGE_SIZE);

  return (
    <div id={id} className="card scroll-mt-40">
      <h2 className="text-2xl font-bold mb-6">Avis ({totalReviews ?? reviews.length})</h2>

      {/* Note globale + répartition + catégories */}
      <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-sm">
            {displayedAverage.toFixed(1)}
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {displayedAverage >= 4.8 ? 'Excellent' : displayedAverage >= 4.2 ? 'Très bien' : displayedAverage >= 3.5 ? 'Bien' : 'Correct'}
          </span>
          <span className="text-sm text-gray-500">{totalReviews ?? reviews.length} avis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-8">
          <div className="space-y-1.5 md:w-56">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Note globale</p>
            {distribution.map(({ star, count, percent }) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-4 shrink-0 text-gray-500 dark:text-gray-400 text-xs">{star}</span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className="h-full bg-gray-900 dark:bg-white rounded-full" style={{ width: `${percent}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-gray-400 text-xs">{count}</span>
              </div>
            ))}
          </div>

          {categoryAverages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {categoryAverages.map(({ label, icon: Icon, avg }) => (
                <div key={label} className="text-center">
                  <Icon className="w-5 h-5 mx-auto text-gray-500 dark:text-gray-400 mb-1.5" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
                  <p className="font-bold text-gray-900 dark:text-white">{avg!.toFixed(1)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Liste des avis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visibleReviews.map((review) => (
          <ReviewCard key={review.id} review={review} isAuthenticated={isAuthenticated} />
        ))}
      </div>

      {!showAll && reviews.length > PAGE_SIZE && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="btn-secondary"
          >
            Afficher les {reviews.length} avis
          </button>
        </div>
      )}
    </div>
  );
}
