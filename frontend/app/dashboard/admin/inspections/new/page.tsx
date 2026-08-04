'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isAdminOrController } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeft, FileCheck, CheckCircle, Building2 } from 'lucide-react';
import Link from 'next/link';

interface Accommodation {
  id: number;
  name: string;
  city: string;
  address: string;
  type: string;
  status: string;
}

export default function NewInspectionPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    accommodation_id: '',
    scheduled_at: '',
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Rediriger les non-autorisés vers la page de login
      if (!isAdminOrController(user)) {
        router.push('/auth/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && isAdminOrController(user)) {
      fetchAccommodations();
    }
  }, [isAuthenticated, user]);

  const fetchAccommodations = async () => {
    try {
      // Utiliser l'endpoint spécifique pour les inspections qui permet aux contrôleurs d'accéder
      const response = await api.get('/admin/inspections/accommodations', { params: { per_page: 100 } });
      setAccommodations(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching accommodations:', err);
      setError('Erreur lors du chargement des établissements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        accommodation_id: parseInt(formData.accommodation_id),
      };

      if (formData.scheduled_at) {
        payload.scheduled_at = formData.scheduled_at;
      }

      const response = await api.post('/admin/inspections', payload);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/admin/inspections/${response.data.data.id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de l\'inspection');
      console.error('Error creating inspection:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isAdminOrController(user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/dashboard/admin/inspections"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <FileCheck className="w-8 h-8" />
              Créer une inspection
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Planifier une nouvelle inspection sur site
            </p>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-400">Inspection créée avec succès ! Redirection...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card max-w-2xl">
          <div className="space-y-6">
            {/* Établissement */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Établissement à inspecter *
              </h2>
              <select
                required
                value={formData.accommodation_id}
                onChange={(e) => setFormData({ ...formData, accommodation_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Sélectionner un établissement</option>
                {accommodations.map((accommodation) => (
                  <option key={accommodation.id} value={accommodation.id}>
                    {accommodation.name} - {accommodation.city} ({accommodation.type})
                  </option>
                ))}
              </select>
              {accommodations.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Aucun établissement disponible. Créez d'abord un établissement.
                </p>
              )}
            </div>

            {/* Date de planification */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Planification (optionnel)
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date et heure prévues
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Si non renseigné, l'inspection sera planifiée pour maintenant
                </p>
              </div>
            </div>

            {/* Informations */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                <strong>Note :</strong> Une fois créée, l'inspection sera en statut "Planifiée". 
                Vous pourrez la démarrer, ajouter des réponses aux critères de la checklist, 
                et la compléter avec vos observations.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/dashboard/admin/inspections" className="btn-secondary">
                Annuler
              </Link>
              <button
                type="submit"
                disabled={submitting || accommodations.length === 0}
                className="btn-primary"
              >
                {submitting ? 'Création...' : 'Créer l\'inspection'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

