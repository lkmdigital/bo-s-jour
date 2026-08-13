'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import SuccessDisplay from '@/components/common/SuccessDisplay';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeft, MapPin, Trash2, Star, Tag, Bed, Clock, MessageCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { compressImages } from '@/lib/utils';

interface AccommodationFormData {
  name: string;
  whatsapp?: string;
  type: 'hotel' | 'lodge' | 'guesthouse' | 'apartment';
  description: string;
  description_en?: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  star_rating?: number;
  check_in_time?: string;
  check_out_time?: string;
  cancellation_policy_hours?: number;
}

const CANCELLATION_POLICIES = [
  { hours: 48, key: 'flexible', label: 'Flexible', desc: 'Annulation gratuite jusqu\'à 48h avant l\'arrivée.' },
  { hours: 24, key: 'moderate', label: 'Modérée', desc: 'Annulation gratuite jusqu\'à 24h avant. Au-delà : 50% conservé, 50% en avoir.' },
  { hours: 0, key: 'strict', label: 'Stricte', desc: 'Non remboursable. Intégralité conservée par l\'établissement en cas d\'annulation.' },
] as const;

const typeOptions = [
  { value: 'hotel', label: 'Hôtel' },
  { value: 'lodge', label: 'Lodge' },
  { value: 'guesthouse', label: 'Maison d\'hôtes' },
  { value: 'apartment', label: 'Appartement' },
];

const commonAmenities = [
  'Wi-Fi',
  'Climatisation',
  'Piscine',
  'Parking',
  'Petit-déjeuner',
  'Service de chambre',
  'Bar',
  'Restaurant',
  'Salle de sport',
  'Spa',
  'Plage privée',
  'Vue sur mer',
  'Terrasse',
  'Jardin',
  'Cuisine équipée',
  'Lave-linge',
  'Télévision',
  'Salle de bain privée',
];

export default function EditAccommodationPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingMedia, setExistingMedia] = useState<Array<{ id: number; url: string; is_primary: boolean }>>([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationInfo, setLocationInfo] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [pricingPlans, setPricingPlans] = useState({
    nonRefundableEnabled: false,
    nonRefundableDiscount: 10,
    modifiableEnabled: false,
    modifiableSurcharge: 10,
    longStayEnabled: false,
    longStayDiscount: 15,
    longStayNights: 7,
  });
  const confirmAction = useConfirm();

  const { register, handleSubmit, formState: { errors }, setValue, reset, watch } = useForm<AccommodationFormData>();
  const latitudeValue = watch('latitude');
  const longitudeValue = watch('longitude');

  const hasValidCoordinates = (lat?: number, lng?: number) =>
    typeof lat === 'number' && !Number.isNaN(lat) &&
    typeof lng === 'number' && !Number.isNaN(lng);

  const manualCoordinatesAvailable = hasValidCoordinates(latitudeValue, longitudeValue);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }
    fetchAccommodation();
  }, [params.id, authLoading, isAuthenticated, user]);

  const fetchAccommodation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/accommodations/${params.id}`);
      const acc = response.data;

      // Vérifier que l'utilisateur est bien propriétaire ou admin (user déjà chargé via effet ci-dessus)
      if (acc.host_id !== user?.id && user?.role !== 'admin') {
        router.push('/dashboard/host');
        return;
      }

      reset({
        name: acc.name,
        whatsapp: acc.whatsapp || '',
        type: acc.type,
        description: acc.description,
        description_en: acc.description_en || '',
        address: acc.address,
        city: acc.city,
        latitude: acc.latitude,
        longitude: acc.longitude,
        price_per_night: acc.price_per_night,
        max_guests: acc.max_guests,
        bedrooms: acc.bedrooms,
        bathrooms: acc.bathrooms,
        star_rating: acc.star_rating || undefined,
        check_in_time: acc.check_in_time ? String(acc.check_in_time).slice(0, 5) : '',
        check_out_time: acc.check_out_time ? String(acc.check_out_time).slice(0, 5) : '',
        cancellation_policy_hours: acc.cancellation_policy_hours ?? 48,
      });

      setSelectedAmenities(acc.amenities || []);
      setExistingMedia(acc.images || []);
      setPricingPlans({
        nonRefundableEnabled: acc.pricing_non_refundable_enabled ?? false,
        nonRefundableDiscount: acc.pricing_non_refundable_discount ?? 10,
        modifiableEnabled: acc.pricing_modifiable_enabled ?? false,
        modifiableSurcharge: acc.pricing_modifiable_surcharge ?? 10,
        longStayEnabled: acc.pricing_long_stay_enabled ?? false,
        longStayDiscount: acc.pricing_long_stay_discount ?? 15,
        longStayNights: acc.pricing_long_stay_nights ?? 7,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement de l\'hébergement');
    } finally {
      setLoading(false);
    }
  };

  const geocodeAddress = async (address: string, city: string): Promise<{ lat: number; lng: number }> => {
    return {
      lat: 5.3600,
      lng: -4.0083,
    };
  };

  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationInfo({
        type: 'error',
        message: 'La géolocalisation n’est pas disponible sur ce navigateur.',
      });
      return;
    }

    setDetectingLocation(true);
    setLocationInfo({
      type: 'info',
      message: 'Recherche de votre position approximative...',
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setValue('latitude', lat, { shouldValidate: true });
        setValue('longitude', lng, { shouldValidate: true });
        setLocationInfo({
          type: 'success',
          message: 'Coordonnées détectées. N’hésitez pas à les ajuster.',
        });
        setDetectingLocation(false);
      },
      (geoError) => {
        let message = 'Impossible de récupérer votre position.';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          message = 'Vous avez refusé l’accès à la localisation.';
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = 'La position est indisponible.';
        } else if (geoError.code === geoError.TIMEOUT) {
          message = 'La recherche de localisation a expiré.';
        }
        setLocationInfo({ type: 'error', message });
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const onSubmit = async (data: AccommodationFormData) => {
    try {
      setSaving(true);
      setError(null);

      let latitudeValue = typeof data.latitude === 'number' ? data.latitude : undefined;
      let longitudeValue = typeof data.longitude === 'number' ? data.longitude : undefined;

      if (!hasValidCoordinates(latitudeValue, longitudeValue)) {
        const coordinates = await geocodeAddress(data.address, data.city);
        latitudeValue = coordinates.lat;
        longitudeValue = coordinates.lng;
      }

      const normalizedLatitude = Number((latitudeValue as number).toFixed(6));
      const normalizedLongitude = Number((longitudeValue as number).toFixed(6));

      const formData = {
        ...data,
        latitude: normalizedLatitude,
        longitude: normalizedLongitude,
        amenities: selectedAmenities,
        pricing_auto_enabled: pricingPlans.nonRefundableEnabled || pricingPlans.modifiableEnabled || pricingPlans.longStayEnabled,
        pricing_non_refundable_enabled: pricingPlans.nonRefundableEnabled,
        pricing_non_refundable_discount: pricingPlans.nonRefundableEnabled ? pricingPlans.nonRefundableDiscount : null,
        pricing_modifiable_enabled: pricingPlans.modifiableEnabled,
        pricing_modifiable_surcharge: pricingPlans.modifiableEnabled ? pricingPlans.modifiableSurcharge : null,
        pricing_long_stay_enabled: pricingPlans.longStayEnabled,
        pricing_long_stay_discount: pricingPlans.longStayEnabled ? pricingPlans.longStayDiscount : null,
        pricing_long_stay_nights: pricingPlans.longStayEnabled ? pricingPlans.longStayNights : null,
      };

      await api.put(`/accommodations/${params.id}`, formData);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/host');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour de l\'hébergement');
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const limited = files.slice(0, 10);

    // Calculer le nombre de fichiers existants + nouveaux
    const totalFiles = existingMedia.length + limited.length;
    if (totalFiles > 10) {
      setError(`Vous ne pouvez pas avoir plus de 10 fichiers. Vous avez ${existingMedia.length} fichier(s) existant(s). Vous pouvez ajouter ${10 - existingMedia.length} fichier(s) maximum.`);
      return;
    }

    try {
      // Compresser les images
      const compressedFiles = await compressImages(limited, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.75,
        maxSizeInMB: 2
      });

      setMediaFiles(compressedFiles);
      setPreviews(compressedFiles.map(file => URL.createObjectURL(file)));
      setError(null); // Réinitialiser l'erreur si des fichiers valides sont sélectionnés
    } catch (compressionError) {
      setError('Erreur lors de la compression des images. Veuillez réessayer.');
    }
  };

  const handleUploadMedia = async () => {
    if (mediaFiles.length === 0) {
      setError('Veuillez sélectionner au moins un fichier à uploader');
      return;
    }

    try {
      setUploadingMedia(true);
      setError(null);

      const fd = new FormData();
      // Clé "media[]" pour envoi multiple (PHP/Laravel reçoit en tableau sous "media")
      mediaFiles.forEach((file) => {
        fd.append('media[]', file);
      });
      
      console.log('Uploading media files:', mediaFiles.length);
      console.log('FormData entries:', Array.from(fd.entries()));
      console.log('API URL:', `/accommodations/${params.id}/media`);
      
      // Ne pas définir Content-Type pour FormData (le navigateur envoie multipart avec le boundary)
      const mediaResponse = await api.post(`/accommodations/${params.id}/media`, fd);
      
      console.log('Media uploaded successfully:', mediaResponse.data);
      
      // Rafraîchir la liste des médias existants
      const uploadedImages = mediaResponse.data?.data || mediaResponse.data;
      if (uploadedImages && Array.isArray(uploadedImages) && uploadedImages.length > 0) {
        setExistingMedia(prev => [...prev, ...uploadedImages]);
        // Réinitialiser les fichiers et previews
        setMediaFiles([]);
        setPreviews([]);
        // Réinitialiser l'input file
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else if (mediaResponse.data?.errors && mediaResponse.data.errors.length > 0) {
        setError(mediaResponse.data.message || 'Erreur lors de l\'upload des images');
      } else {
        setError('Aucune image n\'a été uploadée');
      }
    } catch (mediaError: any) {
      console.error('Error uploading media:', mediaError);
      console.error('Error response:', mediaError.response);
      console.error('Error response data:', mediaError.response?.data);
      console.error('Error status:', mediaError.response?.status);
      
      let errorMsg = 'Erreur lors de l\'upload des images';
      
      if (mediaError.response) {
        // Erreur du serveur
        if (mediaError.response.data) {
          if (mediaError.response.data.message) {
            errorMsg = mediaError.response.data.message;
          } else if (mediaError.response.data.errors) {
            errorMsg = Array.isArray(mediaError.response.data.errors) 
              ? mediaError.response.data.errors.join(', ')
              : JSON.stringify(mediaError.response.data.errors);
          } else if (typeof mediaError.response.data === 'string') {
            errorMsg = mediaError.response.data;
          }
          // Ajouter le détail des erreurs par fichier si présent
          if (mediaError.response.data.errors && Array.isArray(mediaError.response.data.errors) && mediaError.response.data.errors.length > 1) {
            errorMsg += ' — ' + mediaError.response.data.errors.slice(0, 3).join(' ; ');
          }
        }
        
        if (mediaError.response.status === 422 && !errorMsg) {
          errorMsg = 'Erreur de validation';
        }
        if (mediaError.response.status === 403) {
          errorMsg = 'Vous n\'avez pas la permission d\'uploader des images pour cet hébergement';
        } else if (mediaError.response.status === 404) {
          errorMsg = 'Hébergement non trouvé';
        }
      } else if (mediaError.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        errorMsg = 'Aucune réponse du serveur. Vérifiez votre connexion.';
      } else {
        // Erreur lors de la configuration de la requête
        errorMsg = `Erreur: ${mediaError.message}`;
      }
      
      setError(errorMsg);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDeleteMedia = async (imageId: number) => {
    const ok = await confirmAction({
      title: 'Supprimer l\'image',
      message: 'Supprimer cette image ? Cette action est définitive.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      setError(null);
      await api.delete(`/accommodations/${params.id}/media/${imageId}`);
      setExistingMedia(prev => prev.filter(m => m.id !== imageId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression de l\'image');
    }
  };

  const handleSetPrimaryMedia = async (imageId: number) => {
    try {
      setError(null);
      await api.post(`/accommodations/${params.id}/media/${imageId}/primary`);
      setExistingMedia(prev =>
        prev.map(m => ({
          ...m,
          is_primary: m.id === imageId,
        })),
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour de l\'image principale');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link 
          href="/dashboard/host"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au tableau de bord
        </Link>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Modifier l'hébergement</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Modifiez les informations de votre hébergement.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/dashboard/host/accommodations/${params.id}/rooms`}
                className="btn-secondary flex items-center gap-2"
              >
                <Bed className="w-5 h-5" />
                Gérer les chambres
              </Link>
              <Link
                href={`/dashboard/host/accommodations/${params.id}/promotions`}
                className="btn-primary flex items-center gap-2"
              >
                <Tag className="w-5 h-5" />
                Gérer les promotions
              </Link>
            </div>
          </div>
        </div>

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-700 text-green-800 dark:text-green-300 rounded-lg flex items-center justify-between animate-in slide-in-from-top-5 duration-300">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-lg">Hébergement mis à jour avec succès !</p>
                <p className="text-sm mt-1">Vos modifications ont été enregistrées. Redirection en cours...</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setSuccess(false);
                router.push('/dashboard/host');
              }} 
              className="text-green-800 dark:text-green-300 hover:text-green-600 dark:hover:text-green-200 ml-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations de base */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Informations de base</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom de l'hébergement <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name', { required: 'Le nom est requis' })}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Type d'hébergement <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('type', { required: 'Le type est requis' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre d'étoiles <span className="text-gray-500">(optionnel)</span>
                  </label>
                  <select
                    {...register('star_rating', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="">Non classé</option>
                    <option value="1">1 étoile</option>
                    <option value="2">2 étoiles</option>
                    <option value="3">3 étoiles</option>
                    <option value="4">4 étoiles</option>
                    <option value="5">5 étoiles</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-green-600" /> WhatsApp de l'établissement
                  </label>
                  <input
                    {...register('whatsapp')}
                    type="text"
                    placeholder="+225 07 00 00 00 00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 mt-1">Utilisé pour l'envoi des confirmations de réservation à vos clients.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (FR) <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('description', { required: 'La description est requise' })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (EN) <span className="text-gray-500">(optionnel)</span>
                </label>
                <textarea
                  {...register('description_en')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Localisation */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Localisation</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Adresse <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('address', { required: 'L\'adresse est requise' })}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Ville <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('city', { required: 'La ville est requise' })}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                )}
              </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                <MapPin className="w-4 h-4 inline mr-1" />
                Enregistrez des coordonnées approximatives pour afficher une carte sur la fiche du bien.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Latitude (approx.)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="Ex: 5.348901"
                  {...register('latitude', {
                    valueAsNumber: true,
                    min: { value: -90, message: 'La latitude doit être supérieure à -90' },
                    max: { value: 90, message: 'La latitude doit être inférieure à 90' },
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                {errors.latitude && (
                  <p className="text-red-500 text-sm mt-1">{errors.latitude.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Longitude (approx.)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="Ex: -4.012345"
                  {...register('longitude', {
                    valueAsNumber: true,
                    min: { value: -180, message: 'La longitude doit être supérieure à -180' },
                    max: { value: 180, message: 'La longitude doit être inférieure à 180' },
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                {errors.longitude && (
                  <p className="text-red-500 text-sm mt-1">{errors.longitude.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="btn-secondary w-full sm:w-auto"
              >
                {detectingLocation ? 'Détection en cours...' : 'Utiliser ma position actuelle'}
              </button>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ajustez manuellement si la position détectée n’est pas exacte.
              </p>
            </div>

            {locationInfo && (
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p
                  className={`text-sm ${
                    locationInfo.type === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : locationInfo.type === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {locationInfo.message}
                </p>
                {locationInfo.type === 'error' && (
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    className="self-start text-sm text-primary hover:underline"
                  >
                    Réessayer
                  </button>
                )}
              </div>
            )}

            {manualCoordinatesAvailable && (
              <div className="space-y-2">
                <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <iframe
                    title="Aperçu de la localisation"
                    src={`https://www.google.com/maps?q=${latitudeValue},${longitudeValue}&z=15&output=embed`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    Coordonnées estimées :{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {latitudeValue?.toFixed(5)}, {longitudeValue?.toFixed(5)}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${latitudeValue},${longitudeValue}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium"
                  >
                    Ouvrir dans Google Maps
                  </a>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Tarifs et capacité */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Tarifs et capacité</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Prix par nuit (FCFA) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('price_per_night', { 
                    required: 'Le prix est requis',
                    min: { value: 0, message: 'Le prix doit être positif' }
                  })}
                  type="number"
                  step="100"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                {errors.price_per_night && (
                  <p className="text-red-500 text-sm mt-1">{errors.price_per_night.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacité maximale <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('max_guests', { 
                    required: 'La capacité est requise',
                    min: { value: 1, message: 'Minimum 1 personne' }
                  })}
                  type="number"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                {errors.max_guests && (
                  <p className="text-red-500 text-sm mt-1">{errors.max_guests.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Chambres <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('bedrooms', { 
                    required: 'Le nombre de chambres est requis',
                    min: { value: 0, message: 'Minimum 0' }
                  })}
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
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
                  {...register('bathrooms', { 
                    required: 'Le nombre de salles de bain est requis',
                    min: { value: 0, message: 'Minimum 0' }
                  })}
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                {errors.bathrooms && (
                  <p className="text-red-500 text-sm mt-1">{errors.bathrooms.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Horaires & politique d'annulation */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Horaires & politique d'annulation</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Heure d'arrivée (check-in)</label>
                <input
                  {...register('check_in_time')}
                  type="time"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Heure de départ (check-out)</label>
                <input
                  {...register('check_out_time')}
                  type="time"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" /> Politique d'annulation
              </label>
              <p className="text-xs text-gray-500 mb-3">Affichée au voyageur avant paiement. Il devra l'accepter pour réserver.</p>
              <input type="hidden" {...register('cancellation_policy_hours', { valueAsNumber: true })} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CANCELLATION_POLICIES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setValue('cancellation_policy_hours', p.hours, { shouldDirty: true })}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${
                      watch('cancellation_policy_hours') === p.hours
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">{p.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plans tarifaires : options à cocher par l'hôte, affichées à la réservation */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Plans tarifaires</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Cochez les options que vous souhaitez proposer aux voyageurs. Seuls les plans activés s&apos;appliqueront et seront affichés au moment de la réservation.
            </p>
            <div className="space-y-6">
              {/* Plan Non remboursable */}
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pricingPlans.nonRefundableEnabled}
                    onChange={(e) => setPricingPlans(prev => ({ ...prev, nonRefundableEnabled: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="font-medium">Tarif non remboursable</span>
                </label>
                {pricingPlans.nonRefundableEnabled && (
                  <div className="pl-6">
                    <label className="block text-sm font-medium mb-1">Réduction (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pricingPlans.nonRefundableDiscount}
                      onChange={(e) => setPricingPlans(prev => ({ ...prev, nonRefundableDiscount: Number(e.target.value) || 0 }))}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    />
                    <p className="text-xs text-gray-500 mt-1">Ex: 10 = tarif de base − 10 %</p>
                  </div>
                )}
              </div>
              {/* Plan Modifiable */}
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pricingPlans.modifiableEnabled}
                    onChange={(e) => setPricingPlans(prev => ({ ...prev, modifiableEnabled: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="font-medium">Tarif modifiable (annulation possible)</span>
                </label>
                {pricingPlans.modifiableEnabled && (
                  <div className="pl-6">
                    <label className="block text-sm font-medium mb-1">Surcoût (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pricingPlans.modifiableSurcharge}
                      onChange={(e) => setPricingPlans(prev => ({ ...prev, modifiableSurcharge: Number(e.target.value) || 0 }))}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    />
                    <p className="text-xs text-gray-500 mt-1">Ex: 10 = tarif de base + 10 %</p>
                  </div>
                )}
              </div>
              {/* Plan Long séjour */}
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pricingPlans.longStayEnabled}
                    onChange={(e) => setPricingPlans(prev => ({ ...prev, longStayEnabled: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="font-medium">Tarif long séjour</span>
                </label>
                {pricingPlans.longStayEnabled && (
                  <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Réduction (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pricingPlans.longStayDiscount}
                        onChange={(e) => setPricingPlans(prev => ({ ...prev, longStayDiscount: Number(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      />
                      <p className="text-xs text-gray-500 mt-1">Ex: 15 = base − 15 %</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">À partir de (nuits)</label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={pricingPlans.longStayNights}
                        onChange={(e) => setPricingPlans(prev => ({ ...prev, longStayNights: Number(e.target.value) || 7 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      />
                      <p className="text-xs text-gray-500 mt-1">Ex: 7 = à partir de 7 nuits</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Équipements */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Équipements et services</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {commonAmenities.map(amenity => (
                <label
                  key={amenity}
                  className="flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="rounded"
                  />
                  <span className="text-sm">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Médias */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Photos / Vidéos</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Jusqu'à 10 fichiers. Formats acceptés: JPG, PNG, WEBP, MP4, MOV (max 10 Mo chacun).</p>
            
            {/* Médias existants */}
            {existingMedia.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Médias existants</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {existingMedia.map((m) => (
                    <div key={m.id} className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 group">
                      <Image src={m.url} alt="media" fill className="object-cover" />
                      {m.is_primary && (
                        <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Principal
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-1">
                        {!m.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryMedia(m.id)}
                            className="w-full text-xs bg-white text-gray-900 rounded px-2 py-1 flex items-center justify-center gap-1"
                          >
                            <Star className="w-3 h-3 text-primary" />
                            Définir comme principale
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(m.id)}
                          className="w-full text-xs bg-red-600 text-white rounded px-2 py-1 flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="block">
                <span className="sr-only">Choisir des fichiers</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime"
                  multiple
                  onChange={handleMediaChange}
                  disabled={uploadingMedia}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50"
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Taille max 10 Mo par fichier. Formats : JPEG, PNG, WebP, MP4.
              </p>
              {previews.length > 0 && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {previews.map((src, i) => (
                      <div key={i} className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                        {src.match(/\.mp4$|\.mov$/i) ? (
                          <video src={src} className="w-full h-full object-cover" muted />
                        ) : (
                          <Image src={src} alt={`media-${i}`} fill className="object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadMedia}
                    disabled={uploadingMedia || mediaFiles.length === 0}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingMedia ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Upload en cours...
                      </span>
                    ) : (
                      `Uploader ${mediaFiles.length} fichier(s)`
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Link
              href="/dashboard/host"
              className="btn-secondary flex-1 text-center"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

