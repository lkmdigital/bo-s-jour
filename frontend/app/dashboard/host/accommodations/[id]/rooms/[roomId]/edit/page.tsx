'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import api from '@/lib/api';
import Link from 'next/link';

interface RoomFormData {
  name?: string; // plus saisi : le type sert de nom
  type: string;
  type_other?: string; // Libellé libre si type === 'Autre' (remplace `type` à la soumission)
  description?: string;
  description_en?: string;
  capacity: number;
  price_per_night: number;
  amenities?: string;
  bedrooms: number;
  bathrooms: number;
  quantity?: number; // Nombre total de chambres de ce type
  is_active: boolean;
}

const ROOM_TYPES = [
  'Chambre simple',
  'Chambre double',
  'Suite',
  'Studio',
  'Appartement',
  'Chambre familiale',
  'Dortoir',
  'Autre',
];

export default function EditRoomPage() {
  const router = useRouter();
  const params = useParams();
  const accommodationId = params.id as string;
  const roomId = params.roomId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<any>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RoomFormData>();
  const selectedType = watch('type');

  useEffect(() => {
    fetchRoom();
  }, []);

  const fetchRoom = async () => {
    try {
      const response = await api.get(`/accommodations/${accommodationId}/rooms/manage/${roomId}`);
      const roomData = response.data;
      setRoom(roomData);

      // Pré-remplir le formulaire — si le type stocké est un libellé libre (non listé),
      // on affiche « Autre » sélectionné avec le texte d'origine dans le champ libre.
      if (roomData.type && !ROOM_TYPES.includes(roomData.type)) {
        setValue('type', 'Autre');
        setValue('type_other', roomData.type);
      } else {
        setValue('type', roomData.type);
      }
      setValue('description', roomData.description || '');
      setValue('description_en', roomData.description_en || '');
      setValue('capacity', roomData.capacity);
      setValue('price_per_night', roomData.price_per_night);
      setValue('bedrooms', roomData.bedrooms);
      setValue('bathrooms', roomData.bathrooms);
      setValue('quantity', roomData.quantity || 1);
      setValue('is_active', roomData.is_active);
      setValue('amenities', Array.isArray(roomData.amenities) ? roomData.amenities.join(', ') : '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RoomFormData) => {
    setSaving(true);
    setError(null);

    try {
      const amenities = data.amenities
        ? data.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : [];

      const { type_other, ...roomData } = data;
      await api.put(`/accommodations/${accommodationId}/rooms/${roomId}`, {
        ...roomData,
        type: data.type === 'Autre' ? (type_other?.trim() || 'Autre') : data.type,
        amenities,
      });

      router.push(`/dashboard/host/accommodations/${accommodationId}/rooms`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <main className="container mx-auto px-4 py-12">
          <LoadingSpinner />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/dashboard/host/accommodations/${accommodationId}/rooms`}
            className="text-primary hover:underline"
          >
            ← Retour aux chambres
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Modifier la chambre</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {room?.name}
          </p>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Type de chambre <span className="text-red-500">*</span>
              </label>
              <select
                {...register('type', { required: 'Type requis' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Sélectionner un type</option>
                {ROOM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
              )}
            </div>

            {selectedType === 'Autre' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Précisez le type de chambre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('type_other', { required: 'Veuillez préciser le type de chambre' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Ex : Case traditionnelle, Chambre mezzanine..."
                />
                {errors.type_other && (
                  <p className="text-red-500 text-sm mt-1">{errors.type_other.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Description (Français)</label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (English)</label>
              <textarea
                {...register('description_en')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacité <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('capacity', { required: 'Capacité requise', min: 1 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  min="1"
                />
                {errors.capacity && (
                  <p className="text-red-500 text-sm mt-1">{errors.capacity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Chambres <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('bedrooms', { required: 'Nombre de chambres requis', min: 1 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  min="1"
                />
                {errors.bedrooms && (
                  <p className="text-red-500 text-sm mt-1">{errors.bedrooms.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Salles de bain <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('bathrooms', { required: 'Nombre de salles de bain requis', min: 1 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  min="1"
                />
                {errors.bathrooms && (
                  <p className="text-red-500 text-sm mt-1">{errors.bathrooms.message}</p>
                )}
              </div>
            </div>

            {/* Quantité de chambres de ce type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre de chambres de ce type
              </label>
              <input
                type="number"
                {...register('quantity', { min: 1, max: 100 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                min="1"
                max="100"
                placeholder="1"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Indiquez combien de chambres identiques de ce type vous avez. 
                <br />
                <strong>Exemple :</strong> Si vous avez 3 chambres doubles identiques, indiquez 3.
                <br />
                <strong>Par défaut :</strong> 1 (chambre unique)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Prix par nuit (FCFA) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('price_per_night', { required: 'Prix requis', min: 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                step="1000"
                min="0"
              />
              {errors.price_per_night && (
                <p className="text-red-500 text-sm mt-1">{errors.price_per_night.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Équipements (séparés par des virgules)
              </label>
              <input
                type="text"
                {...register('amenities')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                placeholder="WiFi, Climatisation, TV, Minibar, Balcon"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('is_active')}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                  disabled={room && room.images && room.images.length < 3}
                />
                <span className="text-sm font-medium">Chambre active</span>
              </label>
              {room && room.images && room.images.length < 3 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                  La chambre doit avoir au moins 3 images pour être activée
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <Link
                href={`/dashboard/host/accommodations/${accommodationId}/rooms`}
                className="flex-1 btn-secondary text-center"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>

          {/* Lien vers gestion des images */}
          <div className="mt-6">
            <Link
              href={`/dashboard/host/accommodations/${accommodationId}/rooms/${roomId}/images`}
              className="btn-secondary w-full text-center block"
            >
              Gérer les images de cette chambre
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
