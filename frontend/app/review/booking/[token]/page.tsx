'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Star, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface BookingInfo {
  booking_id: number;
  accommodation_id: number;
  accommodation_name: string | null;
  accommodation_city: string | null;
  room_name: string | null;
  check_in: string | null;
  check_out: string | null;
}

interface ReviewFormData {
  rating: number;
  comment: string;
  comment_en?: string;
  category_ratings: Record<string, number>;
}

// Critères de notation (1 à 5 étoiles), tous facultatifs — cf. Review::CATEGORIES (backend).
const CATEGORIES = [
  { key: 'staff', label: 'Personnel' },
  { key: 'cleanliness', label: 'Propreté' },
  { key: 'comfort', label: 'Confort' },
  { key: 'breakfast', label: 'Petits déjeuners' },
  { key: 'wifi', label: 'Wifi' },
  { key: 'accessibility', label: 'Accessibilité' },
  { key: 'shuttle', label: 'Navette' },
  { key: 'activities', label: 'Autres activités' },
  { key: 'value_for_money', label: 'Rapport qualité-prix' },
  { key: 'restaurant', label: 'Restaurant' },
];

export default function ReviewByTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchBooking = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/reviews/booking-by-token/${token}`);
        if (res.data.already_reviewed) {
          setAlreadyReviewed(true);
          setError(res.data.message || 'Vous avez déjà laissé un avis pour ce séjour.');
        } else {
          setBookingInfo({
            booking_id: res.data.booking_id,
            accommodation_id: res.data.accommodation_id,
            accommodation_name: res.data.accommodation_name ?? null,
            accommodation_city: res.data.accommodation_city ?? null,
            room_name: res.data.room_name ?? null,
            check_in: res.data.check_in ?? null,
            check_out: res.data.check_out ?? null,
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Lien invalide ou expiré.');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [token]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReviewFormData>({
    defaultValues: {
      rating: 0,
      comment: '',
      category_ratings: {},
    },
  });

  const rating = watch('rating');
  const categoryRatings = watch('category_ratings');

  const onSubmit = async (data: ReviewFormData) => {
    if (data.rating === 0) {
      setSubmitError('Veuillez donner une note globale.');
      return;
    }
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const cleaned: Record<string, number> = {};
      CATEGORIES.forEach((c) => {
        const value = data.category_ratings?.[c.key];
        if (value && value > 0) cleaned[c.key] = value;
      });
      await api.post('/reviews/submit-by-token', {
        token,
        rating: data.rating,
        comment: data.comment,
        comment_en: data.comment_en || undefined,
        category_ratings: cleaned,
      });
      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Erreur lors de l\'envoi.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <LoadingSpinner />
        </main>
        <Footer />
      </div>
    );
  }

  if (error && !bookingInfo) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-lg">
          <div className="card text-center">
            <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-lg">
          <div className="card text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Merci pour votre avis !
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Votre retour a bien été enregistré et aidera les futurs voyageurs.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Accueil
        </Link>
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Comment s&apos;est passé votre séjour ?
          </h1>
          {bookingInfo && (
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {bookingInfo.accommodation_name}
              {bookingInfo.accommodation_city && ` — ${bookingInfo.accommodation_city}`}
              {bookingInfo.check_in && bookingInfo.check_out && (
                <span className="block text-sm mt-1">
                  Du {bookingInfo.check_in} au {bookingInfo.check_out}
                </span>
              )}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Note globale <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('rating', value)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{rating}/5</span>}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-1">Critères de notation</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Facultatif — notez les critères de votre choix.</p>
              <div className="space-y-3">
                {CATEGORIES.map((cat) => {
                  const val = categoryRatings?.[cat.key as keyof typeof categoryRatings] ?? 0;
                  return (
                    <div key={cat.key} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{cat.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setValue(`category_ratings.${cat.key}` as any, v)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                v <= val ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Votre avis <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('comment', { required: 'Le commentaire est requis', maxLength: 1000 })}
                rows={4}
                className="input w-full"
                placeholder="Décrivez votre expérience..."
              />
              {errors.comment && (
                <p className="text-red-500 text-sm mt-1">{errors.comment.message}</p>
              )}
            </div>

            {submitError && (
              <p className="text-red-500 text-sm">{submitError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitLoading}
                className="btn-primary flex-1"
              >
                {submitLoading ? 'Envoi...' : 'Envoyer mon avis'}
              </button>
              <Link href="/" className="btn-secondary">
                Plus tard
              </Link>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
