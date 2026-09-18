'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, MessageSquareText, ThumbsUp, ThumbsDown } from 'lucide-react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import Brand from '@/components/common/Brand';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/common/ToastContext';
import api from '@/lib/api';
import { resolveImageUrl } from '@/lib/utils';

interface ReviewApi {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  user: { name: string; avatar?: string | null } | null;
  accommodation: { id: number; name: string; city: string } | null;
  likes_count: number;
  dislikes_count: number;
  my_reaction: 'like' | 'dislike' | null;
}

interface PaginatedReviews {
  data: ReviewApi[];
  current_page: number;
  last_page: number;
  total: number;
}

interface TestimonialApi {
  id: number;
  first_name: string;
  avatar_path: string | null;
  comment: string;
  likes_count: number;
  dislikes_count: number;
  my_reaction: 'like' | 'dislike' | null;
}

function reviewAvatarUrl(user: { name: string; avatar?: string | null } | null): string {
  const name = user?.name || 'Voyageur';
  if (user?.avatar) return resolveImageUrl(user.avatar);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C1121F&color=fff&size=80`;
}

function ReactionButtons({
  likesCount,
  dislikesCount,
  myReaction,
  onLike,
  onDislike,
}: {
  likesCount: number;
  dislikesCount: number;
  myReaction: 'like' | 'dislike' | null;
  onLike: () => void;
  onDislike: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onLike}
        aria-pressed={myReaction === 'like'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          myReaction === 'like'
            ? 'bg-primary text-white border-primary'
            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary'
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" /> {likesCount}
      </button>
      <button
        type="button"
        onClick={onDislike}
        aria-pressed={myReaction === 'dislike'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          myReaction === 'dislike'
            ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'
            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-800 hover:text-gray-800 dark:hover:border-gray-100 dark:hover:text-gray-100'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" /> {dislikesCount}
      </button>
    </div>
  );
}

function ReviewCard({ review, onReact }: { review: ReviewApi; onReact: (id: number, type: 'like' | 'dislike') => void }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reviewAvatarUrl(review.user)}
            alt={review.user?.name || 'Voyageur'}
            className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800 flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{review.user?.name || 'Voyageur'}</p>
            <p className="text-xs text-gray-500">
              {new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < Math.round(review.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3 flex-1">{review.comment}</p>

      {review.accommodation && (
        <Link
          href={`/accommodations/${review.accommodation.id}`}
          className="text-xs font-medium text-primary hover:underline self-start mb-3"
        >
          {review.accommodation.name} — {review.accommodation.city}
        </Link>
      )}

      <ReactionButtons
        likesCount={review.likes_count}
        dislikesCount={review.dislikes_count}
        myReaction={review.my_reaction}
        onLike={() => onReact(review.id, 'like')}
        onDislike={() => onReact(review.id, 'dislike')}
      />
    </div>
  );
}

function TestimonialAvatar({ t }: { t: TestimonialApi }) {
  if (t.avatar_path) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={resolveImageUrl(t.avatar_path)}
        alt={t.first_name}
        className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800 flex-shrink-0"
      />
    );
  }
  return (
    <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
      {t.first_name.charAt(0).toUpperCase()}
    </span>
  );
}

function TestimonialCard({ t, onReact }: { t: TestimonialApi; onReact: (id: number, type: 'like' | 'dislike') => void }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-3">
        <TestimonialAvatar t={t} />
        <p className="font-semibold text-sm truncate">{t.first_name}</p>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 flex-1">{t.comment}</p>

      <ReactionButtons
        likesCount={t.likes_count}
        dislikesCount={t.dislikes_count}
        myReaction={t.my_reaction}
        onLike={() => onReact(t.id, 'like')}
        onDislike={() => onReact(t.id, 'dislike')}
      />
    </div>
  );
}

export default function AvisClientsPage() {
  const { isAuthenticated } = useAuthStore();
  const { showError } = useToast();

  const [testimonials, setTestimonials] = useState<TestimonialApi[] | null>(null);
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<PaginatedReviews | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/testimonials').then((res) => setTestimonials(res.data?.data ?? [])).catch(() => setTestimonials([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/reviews', { params: { page } })
      .then((res) => { if (!cancelled) setReviews(res.data); })
      .catch(() => { if (!cancelled) setReviews({ data: [], current_page: 1, last_page: 1, total: 0 }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  const reactTestimonial = useCallback(async (id: number, type: 'like' | 'dislike') => {
    if (!isAuthenticated) {
      showError('Connectez-vous pour apprécier un avis.');
      return;
    }
    try {
      const res = await api.post(`/testimonials/${id}/react`, { type });
      setTestimonials((prev) => prev && prev.map((t) => (t.id === id ? { ...t, ...res.data } : t)));
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'enregistrement de votre réaction.");
    }
  }, [isAuthenticated, showError]);

  const reactReview = useCallback(async (id: number, type: 'like' | 'dislike') => {
    if (!isAuthenticated) {
      showError('Connectez-vous pour apprécier un avis.');
      return;
    }
    try {
      const res = await api.post(`/reviews/${id}/react`, { type });
      setReviews((prev) => prev && { ...prev, data: prev.data.map((r) => (r.id === id ? { ...r, ...res.data } : r)) });
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'enregistrement de votre réaction.");
    }
  }, [isAuthenticated, showError]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Avis clients</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Ce que les voyageurs pensent de <Brand /> et de leurs séjours réservés.
          </p>
        </div>

        {/* Avis plateforme ("Laissez un avis sur boséjour") */}
        <section className="mb-14">
          <h2 className="text-xl font-bold mb-5">Avis sur la plateforme</h2>
          {testimonials === null ? (
            <LoadingSpinner message="Chargement des avis…" size="md" />
          ) : testimonials.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun avis pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {testimonials.map((t) => <TestimonialCard key={t.id} t={t} onReact={reactTestimonial} />)}
            </div>
          )}
        </section>

        {/* Avis sur les établissements (post-séjour) */}
        <section>
          <h2 className="text-xl font-bold mb-5">Avis sur les établissements</h2>
          {loading ? (
            <LoadingSpinner message="Chargement des avis…" size="lg" />
          ) : !reviews || reviews.data.length === 0 ? (
            <div className="card text-center py-16">
              <MessageSquareText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucun avis pour le moment</h3>
              <p className="text-gray-600 dark:text-gray-400">Les avis laissés par les voyageurs après leur séjour apparaîtront ici.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {reviews.data.map((r) => <ReviewCard key={r.id} review={r} onReact={reactReview} />)}
              </div>
              <Pagination
                currentPage={reviews.current_page}
                totalPages={reviews.last_page}
                totalItems={reviews.total}
                itemsPerPage={10}
                onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              />
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
