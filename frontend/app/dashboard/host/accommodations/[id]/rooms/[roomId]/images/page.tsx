'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import api from '@/lib/api';
import Link from 'next/link';
import { Upload, Trash2, Star, MoveUp, MoveDown, Check } from 'lucide-react';
import Image from 'next/image';
import { compressImages } from '@/lib/utils';

interface RoomImage {
  id: number;
  image_path: string;
  full_url: string;
  thumbnail_url: string;
  is_primary: boolean;
  sort_order: number;
  caption?: string;
}

export default function RoomImagesPage() {
  const router = useRouter();
  const params = useParams();
  const accommodationId = params.id as string;
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<any>(null);
  const [images, setImages] = useState<RoomImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmAction = useConfirm();
  const { showWarning, showError } = useToast();

  useEffect(() => {
    fetchRoom();
  }, []);

  const fetchRoom = async () => {
    try {
      const response = await api.get(`/accommodations/${accommodationId}/rooms/manage/${roomId}`);
      setRoom(response.data);
      setImages(response.data.images || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Compresser les images avant l'upload
      const imageFiles = Array.from(files);
      const compressedImages = await compressImages(imageFiles, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.75,
        maxSizeInMB: 2
      });

      for (const file of compressedImages) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('is_primary', images.length === 0 ? '1' : '0');

        await api.post(
          `/accommodations/${accommodationId}/rooms/${roomId}/images`,
          formData
        );
      }

      await fetchRoom();
      e.target.value = ''; // Reset input
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    const ok = await confirmAction({
      title: 'Supprimer l\'image',
      message: 'Êtes-vous sûr de vouloir supprimer cette image ?',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const response = await api.delete(
        `/accommodations/${accommodationId}/rooms/${roomId}/images/${imageId}`
      );
      
      // Afficher un avertissement si la chambre a été désactivée
      if (response.data.room_deactivated) {
        showWarning(`Image supprimée. La chambre a été désactivée car il reste moins de 3 images (${response.data.remaining_images}).`);
      }
      
      await fetchRoom();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      await api.post(
        `/accommodations/${accommodationId}/rooms/${roomId}/images/${imageId}/primary`
      );
      await fetchRoom();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const canActivate = images.length >= 3;

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

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Gérer les images</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {room?.name}
            </p>
          </div>

          {/* Message d'activation */}
          {room?.is_active ? (
            <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="text-green-800 dark:text-green-400 font-medium">
                  ✅ Chambre active
                </p>
                <p className="text-green-700 dark:text-green-500 text-sm mt-1">
                  {images.length} image(s) - La chambre est visible et réservable.
                </p>
              </div>
            </div>
          ) : canActivate ? (
            <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-blue-800 dark:text-blue-400 font-medium">
                  La chambre peut maintenant être activée !
                </p>
                <p className="text-blue-700 dark:text-blue-500 text-sm mt-1">
                  Vous avez {images.length} image(s). Retournez à la liste des chambres pour activer cette chambre.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 dark:text-yellow-400">
                <strong>Recommandation : 3 images minimum</strong> - Vous avez actuellement {images.length} image(s).
                {images.length < 3 && ` Ajoutez encore ${3 - images.length} image(s) pour activer cette chambre.`}
              </p>
              <p className="text-yellow-700 dark:text-yellow-500 text-sm mt-2">
                💡 Vous pouvez ajouter et supprimer des images à tout moment.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Upload */}
          <div className="card mb-8">
            <label className="cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  Cliquez pour ajouter des images
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Formats acceptés : JPEG, JPG, PNG, WebP (max 5 MB par image)
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            </label>
            {uploading && (
              <div className="mt-4 text-center">
                <LoadingSpinner />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Upload en cours...
                </p>
              </div>
            )}
          </div>

          {/* Liste des images */}
          {images.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image) => (
                <div key={image.id} className="card relative">
                  {image.is_primary && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="bg-primary text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Principale
                      </span>
                    </div>
                  )}

                  <div className="relative h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                    <Image
                      src={image.full_url}
                      alt={image.caption || `Image ${image.id}`}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <div className="flex gap-2">
                      {!image.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(image.id)}
                          className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1"
                          title="Définir comme image principale"
                        >
                          <Star className="w-3 h-3" />
                          Principale
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(image.id)}
                        className="btn-danger text-xs flex items-center justify-center gap-1 px-3"
                        title="Supprimer cette image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              Aucune image. Ajoutez vos premières images ci-dessus.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
