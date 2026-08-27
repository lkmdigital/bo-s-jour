'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Link from 'next/link';
import { ArrowLeft, Star, MessageSquare, Send, Building2, Sparkles, Loader2 } from 'lucide-react';

interface Review {
  id: number;
  rating: number;
  comment: string;
  comment_en?: string | null;
  host_reply?: string | null;
  host_replied_at?: string | null;
  created_at: string;
  user: { id: number; name: string };
  accommodation: { id: number; name: string; city: string };
}

export default function HostReviewsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'host') {
      router.push('/auth/login');
      return;
    }
    fetchReviews();
  }, [authLoading, isAuthenticated, user]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/host/reviews', { params: { per_page: 50 } });
      setReviews(Array.isArray(res.data?.data) ? res.data.data : res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des avis.');
    } finally {
      setLoading(false);
    }
  };

  const generateReply = async (reviewId: number) => {
    setGeneratingId(reviewId);
    try {
      const res = await api.post('/host/ai/content/review-reply', { review_id: reviewId });
      setReplyText(res.data?.data?.text || '');
    } catch (err: any) {
      setError(err.response?.data?.message || "L'assistant IA n'a pas pu générer de brouillon.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleReply = async (reviewId: number) => {
    const text = replyText.trim();
    if (!text) return;
    try {
      setSaving(true);
      await api.patch(`/host/reviews/${reviewId}/reply`, { host_reply: text });
      setReplyText('');
      setReplyingId(null);
      await fetchReviews();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi de la réponse.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (loading && reviews.length === 0)) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement des commentaires..." size="lg" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard/host"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au tableau de bord
          </Link>

          <h1 className="text-3xl font-bold mb-2">Commentaires clients</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Consultez les avis laissés par les voyageurs sur vos établissements et répondez-leur.
          </p>

          <ErrorDisplay error={error} onDismiss={() => setError(null)} type="error" />

          {reviews.length === 0 ? (
            <div className="card text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Aucun commentaire pour le moment.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Les avis des voyageurs apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{review.user?.name ?? 'Voyageur'}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          sur {review.accommodation?.name ?? 'Établissement'}
                          {review.accommodation?.city && `, ${review.accommodation.city}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                          />
                        ))}
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          {new Date(review.created_at).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{review.comment}</p>

                      {review.host_reply && (
                        <div className="mt-4 pl-4 border-l-2 border-primary/30 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg p-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Votre réponse</p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">{review.host_reply}</p>
                          {review.host_replied_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              {new Date(review.host_replied_at).toLocaleDateString('fr-FR', { dateStyle: 'short' })}
                            </p>
                          )}
                        </div>
                      )}

                      {!review.host_reply && replyingId !== review.id && (
                        <button
                          type="button"
                          onClick={() => setReplyingId(review.id)}
                          className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Répondre
                        </button>
                      )}

                      {replyingId === review.id && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Votre réponse</label>
                            <button
                              type="button"
                              onClick={() => generateReply(review.id)}
                              disabled={generatingId === review.id}
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
                            >
                              {generatingId === review.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              {generatingId === review.id ? 'Génération…' : 'Générer avec l’IA'}
                            </button>
                          </div>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                            placeholder="Écrivez votre réponse au voyageur..."
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => handleReply(review.id)}
                              disabled={saving || !replyText.trim()}
                              className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                              {saving ? 'Envoi...' : 'Envoyer'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReplyingId(null); setReplyText(''); }}
                              className="btn-secondary text-sm"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
