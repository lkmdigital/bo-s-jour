'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Star } from 'lucide-react';
import api from '@/lib/api';

interface ReviewFormProps {
  accommodationId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ReviewFormData {
  rating: number;
  comment: string;
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

export default function ReviewForm({ accommodationId, onSuccess, onCancel }: ReviewFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReviewFormData>({
    defaultValues: {
      rating: 0,
      comment: '',
      category_ratings: {},
    },
  });

  const rating = watch('rating');
  const categoryRatings = watch('category_ratings');

  const handleRatingClick = (value: number) => {
    setValue('rating', value);
  };

  const handleCategoryRatingClick = (category: string, value: number) => {
    setValue(`category_ratings.${category}` as any, value);
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (data.rating === 0) {
      setError('Veuillez donner une note globale');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ne transmettre que les catégories effectivement notées (toutes facultatives).
      const cleanedCategoryRatings: Record<string, number> = {};
      CATEGORIES.forEach((cat) => {
        const value = data.category_ratings?.[cat.key];
        if (value && value > 0) {
          cleanedCategoryRatings[cat.key] = value;
        }
      });

      await api.post('/reviews', {
        accommodation_id: accommodationId,
        rating: data.rating,
        comment: data.comment,
        category_ratings: cleanedCategoryRatings,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi de l\'avis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3">
          Note globale <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleRatingClick(value)}
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  value <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              {rating}/5
            </span>
          )}
        </div>
        {errors.rating && (
          <p className="text-red-500 text-sm mt-1">{errors.rating.message}</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-1">Critères de notation</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Facultatif — notez les critères de votre choix.</p>
        <div className="space-y-4">
          {CATEGORIES.map((category) => {
            const categoryRating = categoryRatings?.[category.key] || 0;

            return (
              <div key={category.key}>
                <label className="block text-sm font-medium mb-2">
                  {category.label}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleCategoryRatingClick(category.key, value)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          value <= categoryRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  {categoryRating > 0 && (
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      {categoryRating}/5
                    </span>
                  )}
                </div>
                <input
                  type="hidden"
                  {...register(`category_ratings.${category.key}` as any)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Commentaire <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('comment', { required: 'Commentaire requis', maxLength: 1000 })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          placeholder="Partagez votre expérience..."
        />
        {errors.comment && (
          <p className="text-red-500 text-sm mt-1">{errors.comment.message}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={loading || rating === 0}
          className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Envoi...' : 'Publier l\'avis'}
        </button>
      </div>
    </form>
  );
}
