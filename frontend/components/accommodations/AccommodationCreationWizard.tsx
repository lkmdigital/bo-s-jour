'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import Header from '@/components/common/Header';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { ArrowLeft, MapPin, Upload, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/stores/authStore';
import { compressImages } from '@/lib/utils';

interface AccommodationFormData {
  name: string;
  whatsapp?: string;
  type: 'hotel' | 'lodge' | 'guesthouse' | 'apartment' | 'other';
  subtype?: string;
  type_other_label?: string;
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
  // Nouveaux champs
  opening_year?: number;
  classification_mode?: 'standing' | 'stars' | 'unclassified';
  star_rating?: number;
  standing?: 'luxury' | 'standard' | 'economy';
  room_types?: string[];
  conference_rooms_count?: number;
  conference_capacity?: number;
  restaurant_capacity?: number;
  bar_capacity?: number;
  shuttle_service?: boolean;
  laundry?: boolean;
  breakfast_price?: number;
  reception_24h?: boolean;
  smoking_area?: boolean;
  pets_allowed?: boolean;
  other_amenities?: string;
  deposit_required?: boolean;
  deposit_amount?: 'first_night' | 'percentage' | 'fixed';
  cancellation_policy_hours?: number;
  payment_methods?: string[];
  special_conditions?: string;
  breakfast_included?: boolean;
  breakfast_included_persons?: number;
  check_in_time?: string;
  check_out_time?: string;
  invoice_paid_before_hours?: number;
  room_type_pricing?: RoomTypePricingEntry[];
}

interface RoomTypePricingEntry {
  type: string;
  price_per_night: number;
  rooms_available?: number;
}

const typeOptions = [
  { value: 'hotel', label: 'Hôtel' },
  { value: 'lodge', label: 'Écolodge' },
  { value: 'guesthouse', label: 'Maison d\'hôtes' },
  { value: 'apartment', label: 'Résidence' },
  { value: 'other', label: 'Autre' },
];

// Sous-catégories par famille — miroir de Accommodation::SUBTYPES (backend).
const subtypeOptionsByType: Record<string, { value: string; label: string }[]> = {
  hotel: [
    { value: '', label: 'Hôtel (standard)' },
    { value: 'apart_hotel', label: 'Appart-Hôtel' },
    { value: 'motel', label: 'Motel' },
    { value: 'auberge', label: 'Auberge' },
  ],
  apartment: [
    { value: '', label: 'Résidence (standard)' },
    { value: 'furnished', label: 'Résidence Meublée' },
    { value: 'luxury', label: 'Résidence luxueuse' },
  ],
};

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

const roomTypeOptions = [
  'Chambre simple',
  'Chambre double',
  'Chambre triple',
  'Suite',
  'Appartement',
  'Villa',
  'Bungalow',
  'Chalet',
];

const paymentMethodOptions = [
  'Mobile Money',
  'Carte bancaire',
  'Espèces',
  'Virement bancaire',
];

interface HostOption {
  id: number;
  name: string;
  email: string;
  establishment_name?: string;
}

interface AccommodationCreationWizardProps {
  mode: 'host' | 'admin';
  hosts?: HostOption[];
  backHref: string;
  cancelHref: string;
  successRedirectHref: string;
  title?: string;
  subtitle?: string;
}

const CANCELLATION_POLICIES = [
  { hours: 48, key: 'flexible', label: 'Flexible', desc: 'Annulation gratuite jusqu\'à 48h avant l\'arrivée.' },
  { hours: 24, key: 'moderate', label: 'Modérée', desc: 'Annulation gratuite jusqu\'à 24h avant. Au-delà : 50% conservé, 50% en avoir.' },
  { hours: 0, key: 'strict', label: 'Stricte', desc: 'Non remboursable. Intégralité conservée par l\'établissement en cas d\'annulation.' },
] as const;

const HOST_STEPS = [
  { id: 1, title: 'Informations de base', key: 'basic' },
  { id: 2, title: 'Localisation', key: 'location' },
  { id: 3, title: 'Établissement', key: 'establishment' },
  { id: 4, title: 'Tarifs', key: 'pricing' },
  { id: 5, title: 'Services', key: 'services' },
  { id: 6, title: 'Politique', key: 'policy' },
  { id: 7, title: 'Médias', key: 'media' },
];

export default function AccommodationCreationWizard({
  mode,
  hosts = [],
  backHref,
  cancelHref,
  successRedirectHref,
  title,
  subtitle,
}: AccommodationCreationWizardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Étape 18 (facultative) : proposée juste après la création plutôt qu'insérée dans ce
  // formulaire en une seule soumission — l'établissement (et son id) n'existe qu'une fois
  // la création terminée.
  const [createdAccommodationId, setCreatedAccommodationId] = useState<number | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const steps = useMemo(() => {
    if (mode === 'admin') {
      return [
        { id: 1, title: 'Sélection de l\'hôte', key: 'host' },
        ...HOST_STEPS.map(step => ({ ...step, id: step.id + 1 })),
      ];
    }
    return HOST_STEPS;
  }, [mode]);
  const initialStepId = steps[0].id;
  const lastStepId = steps[steps.length - 1].id;
  const [currentStep, setCurrentStep] = useState(initialStepId);
  const totalSteps = steps.length;
  const pageTitle = title ?? (mode === 'admin' ? 'Créer un établissement' : 'Ajouter un hébergement');
  const pageSubtitle = subtitle ?? (mode === 'admin'
    ? 'Ajoutez un établissement au nom d\'un hôte. Toutes les informations seront soumises à validation.'
    : 'Remplissez le formulaire ci-dessous pour ajouter votre hébergement. Il sera soumis à validation par l\'administrateur.'
  );
  const successTitle = mode === 'admin'
    ? 'Établissement créé avec succès !'
    : 'Hébergement créé avec succès !';
  const successDescription = mode === 'admin'
    ? 'L\'établissement a été enregistré pour l\'hôte sélectionné. Redirection en cours...'
    : 'Votre hébergement a été enregistré et sera soumis à validation par l\'administrateur. Redirection en cours...';
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [roomTypePricing, setRoomTypePricing] = useState<Record<string, { price?: string; rooms?: string }>>({});
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationInfo, setLocationInfo] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [translatingDescription, setTranslatingDescription] = useState(false);

  const getStepNumberByKey = (key: string) => {
    const found = steps.find(step => step.key === key);
    return found ? found.id : steps[0].id;
  };
  const hostStepNumber = mode === 'admin' ? getStepNumberByKey('host') : null;
  const currentStepIndex = Math.max(0, steps.findIndex(step => step.id === currentStep));
  const displayedStepNumber = currentStepIndex + 1;

  // Mapper le type d'hébergement de l'inscription vers le type du formulaire
  const mapAccommodationType = (type?: string): 'hotel' | 'lodge' | 'guesthouse' | 'apartment' => {
    const typeMapping: Record<string, 'hotel' | 'lodge' | 'guesthouse' | 'apartment'> = {
      'hotel': 'hotel',
      'motel': 'hotel',
      'apartment_hotel': 'hotel',
      'guesthouse': 'guesthouse',
      'apartment': 'apartment',
      'residence': 'apartment',
      'lodge': 'lodge',
    };
    return typeMapping[type || ''] || 'hotel';
  };

  // Sous-catégorie déduite de l'inscription, quand elle est identifiable sans ambiguïté.
  const mapAccommodationSubtype = (type?: string): string => {
    const subtypeMapping: Record<string, string> = {
      'motel': 'motel',
      'apartment_hotel': 'apart_hotel',
    };
    return subtypeMapping[type || ''] || '';
  };

  // Pré-remplir les données du formulaire avec les informations d'inscription de l'hôte
  const getDefaultValues = (): Partial<AccommodationFormData> => {
    if (mode === 'host' && user) {
      return {
        name: user.establishment_name || '',
        whatsapp: user.whatsapp || '',
        type: mapAccommodationType(user.accommodation_type),
        subtype: mapAccommodationSubtype(user.accommodation_type),
        classification_mode: 'unclassified',
        address: user.address_line1 || '',
        city: user.city || '',
        amenities: [],
        cancellation_policy_hours: 48,
      };
    }
    return {
      type: 'hotel',
      classification_mode: 'unclassified',
      amenities: [],
      cancellation_policy_hours: 48,
    };
  };

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm<AccommodationFormData>({
    defaultValues: getDefaultValues(),
  });
  const basePriceValue = watch('price_per_night');
  const classificationMode = watch('classification_mode');
  const starRatingValue = watch('star_rating');
  const latitudeValue = watch('latitude');
  const longitudeValue = watch('longitude');

  const hasValidCoordinates = (lat?: number, lng?: number) =>
    typeof lat === 'number' && !Number.isNaN(lat) &&
    typeof lng === 'number' && !Number.isNaN(lng);

  const manualCoordinatesAvailable = hasValidCoordinates(latitudeValue, longitudeValue);

  const onSubmit = async (data: AccommodationFormData) => {
    if (loading) return; // Empêcher les soumissions multiples
    if (mode === 'admin' && !selectedHostId) {
      setError('Veuillez sélectionner un hôte avant de continuer.');
      setCurrentStep(getStepNumberByKey('host'));
      return;
    }

    // Validation métier : classification
    const currentClassificationMode = data.classification_mode || 'unclassified';
    if (currentClassificationMode === 'stars' && !data.star_rating) {
      setError('Veuillez sélectionner le nombre d\'étoiles de l\'établissement ou choisir "Non classé".');
      setCurrentStep(getStepNumberByKey('establishment'));
      return;
    }

    const formattedRoomPricing: RoomTypePricingEntry[] = [];
    let invalidRoomPricingType: string | null = null;

    selectedRoomTypes.forEach((type) => {
      if (invalidRoomPricingType) {
        return;
      }

      const entry = roomTypePricing[type];
      if (!entry || entry.price === undefined || entry.price === '') {
        invalidRoomPricingType = type;
        return;
      }

      const priceValue = Number(entry.price);
      if (Number.isNaN(priceValue) || priceValue < 0) {
        invalidRoomPricingType = type;
        return;
      }

      let roomsValue: number | undefined;
      if (entry.rooms !== undefined && entry.rooms !== '') {
        const parsedRooms = Number(entry.rooms);
        if (!Number.isNaN(parsedRooms) && parsedRooms >= 0) {
          roomsValue = parsedRooms;
        }
      }

      const payload: RoomTypePricingEntry = {
        type,
        price_per_night: priceValue,
      };

      if (typeof roomsValue === 'number') {
        payload.rooms_available = roomsValue;
      }

      formattedRoomPricing.push(payload);
    });

    if (invalidRoomPricingType) {
      setError(`Veuillez renseigner un tarif par nuit valide pour le type de chambre « ${invalidRoomPricingType} ».`);
      setCurrentStep(getStepNumberByKey('pricing'));
      return;
    }

    // Vérifier qu'au moins 6 images sont uploadées
    if (mediaFiles.length < 6) {
      setError('Veuillez ajouter au moins 6 photos de votre hébergement avant de soumettre.');
      setCurrentStep(getStepNumberByKey('media'));
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      let latitudeValue = typeof data.latitude === 'number' ? data.latitude : undefined;
      let longitudeValue = typeof data.longitude === 'number' ? data.longitude : undefined;

      if (!hasValidCoordinates(latitudeValue, longitudeValue)) {
        // Fallback sur la géolocalisation approximative basée sur l'adresse
        const coordinates = await geocodeAddress(data.address, data.city);
        latitudeValue = coordinates.lat;
        longitudeValue = coordinates.lng;
      }

      const normalizedLatitude = Number((latitudeValue as number).toFixed(6));
      const normalizedLongitude = Number((longitudeValue as number).toFixed(6));

      const formData = {
        ...data,
        subtype: data.type === 'other' ? null : (data.subtype?.trim() || null),
        type_other_label: data.type === 'other' ? (data.type_other_label?.trim() || null) : null,
        latitude: normalizedLatitude,
        longitude: normalizedLongitude,
        amenities: selectedAmenities,
        room_types: selectedRoomTypes,
        room_type_pricing: formattedRoomPricing,
      };
      if (mode === 'admin') {
        (formData as any).host_id = Number(selectedHostId);
      }

      const endpoint = mode === 'admin' ? '/admin/accommodations' : '/accommodations';
      const response = await api.post(endpoint, formData);
      const accommodationId = mode === 'admin'
        ? (response.data?.data?.id ?? response.data?.id)
        : response.data?.id;

      if (!accommodationId) {
        throw new Error('Impossible de déterminer l\'identifiant de l\'hébergement créé.');
      }
      
      // Upload media - obligatoire maintenant
      let mediaUploadSuccess = false;
      if (mediaFiles.length > 0) {
        try {
          const fd = new FormData();
          // media[] pour que PHP reçoive tous les fichiers en tableau (évite qu'un seul soit gardé)
          mediaFiles.slice(0, 10).forEach((file) => {
            fd.append('media[]', file);
          });
          
          const mediaEndpoint = mode === 'admin'
            ? `/admin/accommodations/${accommodationId}/media`
            : `/accommodations/${accommodationId}/media`;

          // Ne pas définir Content-Type : axios/lib/api supprime déjà le header pour FormData,
          // ce qui permet au navigateur d'envoyer multipart/form-data avec le boundary correct.
          const mediaResponse = await api.post(mediaEndpoint, fd);
          
          console.log('Media uploaded successfully:', mediaResponse.data);
          mediaUploadSuccess = true;
        } catch (mediaError: any) {
          console.error('Error uploading media:', mediaError);
          const errorMsg = mediaError.response?.data?.message || 'Erreur lors de l\'upload des images';
          const errorDetails = mediaError.response?.data?.errors || [];
          
          // Afficher une erreur détaillée
          let fullErrorMsg = `Erreur lors de l'upload des images : ${errorMsg}`;
          if (errorDetails.length > 0) {
            fullErrorMsg += `\n${errorDetails.join('\n')}`;
          }
          
          setError(fullErrorMsg);
          setLoading(false);
          // Ne pas rediriger si l'upload échoue
          return;
        }
      }

      // Afficher le succès seulement si tout s'est bien passé (upload réussi)
      if (mediaUploadSuccess) {
        setSuccess(true);
        setCreatedAccommodationId(accommodationId);
        // Afficher le message de succès pendant 3 secondes avant la redirection (sauf si
        // l'hôte clique sur "Configurer la synchronisation" entre-temps, cf. bannière ci-dessous).
        redirectTimeoutRef.current = setTimeout(() => {
          router.push(successRedirectHref);
        }, 3000);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la création de l\'hébergement';
      const errorDetails = err.response?.data?.errors;
      
      if (errorDetails) {
        const detailsArray = Object.values(errorDetails).flat();
        setError(`${errorMsg}\n${detailsArray.join('\n')}`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];

    // Valider les fichiers
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Vérifier le type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
      if (!validTypes.includes(file.type)) {
        errors.push(`${file.name} : Format non supporté`);
        return;
      }

      validFiles.push(file);
    });

    // Limiter à 10 fichiers au total
    const currentCount = mediaFiles.length;
    const remainingSlots = 10 - currentCount;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (validFiles.length > remainingSlots) {
      errors.push(`Maximum 10 fichiers autorisés. ${validFiles.length - remainingSlots} fichier(s) ignoré(s).`);
    }

    // Afficher les erreurs si nécessaire
    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
    }

    // Compresser les images et ajouter les fichiers valides
    if (filesToAdd.length > 0) {
      try {
        // Séparer les images des vidéos
        const imageFiles = filesToAdd.filter(f => f.type.startsWith('image/'));
        const videoFiles = filesToAdd.filter(f => f.type.startsWith('video/'));

        // Compresser uniquement les images
        const compressedImages = imageFiles.length > 0
          ? await compressImages(imageFiles, { maxWidth: 1920, maxHeight: 1920, quality: 0.75, maxSizeInMB: 2 })
          : [];

        // Combiner les images compressées et les vidéos (non compressées)
        const processedFiles = [...compressedImages, ...videoFiles];

        const newFiles = [...mediaFiles, ...processedFiles];
        const newPreviews = [...previews, ...processedFiles.map(file => URL.createObjectURL(file))];
        setMediaFiles(newFiles);
        setPreviews(newPreviews);
      } catch (compressionError) {
        setError('Erreur lors de la compression des images. Veuillez réessayer.');
      }
    }

    // Réinitialiser l'input pour permettre de sélectionner les mêmes fichiers à nouveau
    e.target.value = '';
  };

  const geocodeAddress = async (address: string, city: string): Promise<{ lat: number; lng: number }> => {
    // Default coordinates for Côte d'Ivoire (Abidjan)
    // In production, integrate with Google Maps Geocoding API
    return {
      lat: 5.3600,
      lng: -4.0083,
    };
  };

  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationInfo({
        type: 'error',
        message: 'La géolocalisation n’est pas disponible sur ce navigateur. Renseignez vos coordonnées manuellement.',
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
          message: 'Coordonnées détectées. Vous pouvez les ajuster si nécessaire.',
        });
        setDetectingLocation(false);
      },
      (geoError) => {
        let message = 'Impossible de récupérer votre position.';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          message = 'Vous avez refusé l’accès à la localisation.';
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = 'Votre position est indisponible pour le moment.';
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

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const toggleRoomType = (type: string) => {
    setSelectedRoomTypes(prev => {
      if (prev.includes(type)) {
        setRoomTypePricing(current => {
          const updated = { ...current };
          delete updated[type];
          return updated;
        });
        return prev.filter(t => t !== type);
      }

      setRoomTypePricing(current => ({
        ...current,
        [type]: current[type] ?? {},
      }));

      return [...prev, type];
    });
  };

  const handleRoomTypePricingChange = (type: string, field: 'price' | 'rooms', value: string) => {
    setRoomTypePricing(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const nextStep = () => {
    if (mode === 'admin' && hostStepNumber === currentStep && !selectedHostId) {
      setError('Veuillez sélectionner un hôte avant de continuer.');
      return;
    }
    if (currentStep < lastStepId) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > initialStepId) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (step: number) => {
    if (step >= initialStepId && step <= lastStepId) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const translateDescriptionToEnglish = async () => {
    const frenchText = getValues('description');
    if (!frenchText?.trim()) {
      setError('Veuillez remplir la description en français avant de lancer la traduction.');
      return;
    }

    try {
      setError(null);
      setTranslatingDescription(true);

      // Traduction côté front via l’API publique MyMemory (pas de backend requis)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        frenchText,
      )}&langpair=fr|en`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Impossible de contacter le service de traduction pour le moment.");
      }

      const data = await response.json();
      const translated =
        data?.responseData?.translatedText ||
        (Array.isArray(data?.matches) && data.matches[0]?.translation);

      if (!translated || typeof translated !== 'string') {
        throw new Error("Réponse de traduction invalide. Veuillez traduire manuellement.");
      }

      setValue('description_en', translated, { shouldValidate: true });
    } catch (translateError: any) {
      console.error('Translation error:', translateError);
      setError(
        translateError.message ||
          "Erreur lors de la traduction automatique. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setTranslatingDescription(false);
    }
  };

  // Pré-remplir le formulaire avec les données d'inscription de l'hôte
  useEffect(() => {
    if (mode === 'host' && user) {
      // Pré-remplir les champs si les valeurs actuelles sont vides
      const currentName = getValues('name');
      const currentAddress = getValues('address');
      const currentCity = getValues('city');
      
      if (!currentName && user.establishment_name) {
        setValue('name', user.establishment_name);
      }
      if (!currentAddress && user.address_line1) {
        setValue('address', user.address_line1);
      }
      if (!currentCity && user.city) {
        setValue('city', user.city);
      }
      if (user.accommodation_type) {
        setValue('type', mapAccommodationType(user.accommodation_type));
        setValue('subtype', mapAccommodationSubtype(user.accommodation_type));
      }
    }
  }, [mode, user, setValue, getValues]);

  useEffect(() => {
    setRoomTypePricing((current) => {
      const updated = { ...current };
      let changed = false;

      Object.keys(updated).forEach((key) => {
        if (!selectedRoomTypes.includes(key)) {
          delete updated[key];
          changed = true;
        }
      });

      selectedRoomTypes.forEach((type) => {
        if (!updated[type]) {
          updated[type] = {};
          changed = true;
        }
      });

      return changed ? updated : current;
    });
  }, [selectedRoomTypes]);

  useEffect(() => {
    const prices = selectedRoomTypes
      .map((type) => Number(roomTypePricing[type]?.price))
      .filter((price) => !Number.isNaN(price) && price >= 0);

    if (prices.length === 0) {
      return;
    }

    const minPrice = Math.min(...prices);
    const currentBasePrice = Number(basePriceValue);

    if (Number.isNaN(currentBasePrice) || currentBasePrice !== minPrice) {
      setValue('price_per_night', minPrice, { shouldValidate: true });
    }
  }, [roomTypePricing, selectedRoomTypes, basePriceValue, setValue]);

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link 
          href={backHref}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
          <p className="text-gray-600 dark:text-gray-400">{pageSubtitle}</p>
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
                <p className="font-semibold text-lg">{successTitle}</p>
                <p className="text-sm mt-1">{successDescription}</p>
                {mode === 'host' && createdAccommodationId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
                      setSuccess(false);
                      router.push(`/dashboard/host/accommodations/${createdAccommodationId}/edit#synchronisation`);
                    }}
                    className="text-sm font-medium underline hover:no-underline mt-2 inline-block"
                  >
                    Configurer la synchronisation (facultatif) →
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
                setSuccess(false);
                router.push(successRedirectHref);
              }}
              className="text-green-800 dark:text-green-300 hover:text-green-600 dark:hover:text-green-200 ml-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Indicateur de progression */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className={`flex flex-col items-center flex-1 relative ${
                    currentStep === step.id
                      ? 'text-primary'
                      : currentStep > step.id
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep === step.id
                        ? 'border-primary bg-primary text-white'
                        : currentStep > step.id
                        ? 'border-green-600 dark:border-green-400 bg-green-600 dark:bg-green-400 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <span className="text-xs sm:text-base font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-xs mt-2 text-center hidden sm:block">{step.title}</span>
                </button>
                {index < totalSteps - 1 && (
                  <div
                    className={`h-1 flex-1 mx-1 sm:mx-2 transition-all ${
                      currentStep > step.id
                        ? 'bg-green-600 dark:bg-green-400'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Étape {displayedStepNumber} sur {totalSteps} : {steps[currentStepIndex]?.title}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Étape 0 : Sélection de l'hôte (admin) */}
          {mode === 'admin' && hostStepNumber !== null && currentStep === hostStepNumber && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Sélection de l'hôte propriétaire</h2>
              {hosts.length === 0 ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Aucun hôte n'est disponible pour le moment. Veuillez créer un hôte avant d'ajouter un établissement.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Choisir un hôte <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedHostId}
                      onChange={(e) => setSelectedHostId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="">Sélectionner un hôte</option>
                      {hosts.map((host) => (
                        <option key={host.id} value={host.id}>
                          {host.establishment_name || host.name} ({host.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    L'établissement sera créé et rattaché à l'hôte sélectionné. Vous pourrez gérer ses informations ultérieurement.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Étape 1: Informations de base */}
          {currentStep === getStepNumberByKey('basic') && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Informations de base</h2>
            
            {/* Message d'information si les données sont pré-remplies */}
            {mode === 'host' && user?.establishment_name && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  <strong>💡 Information :</strong> Les données de votre établissement ont été pré-remplies à partir de votre inscription. 
                  Vous pouvez les modifier si nécessaire.
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom de l'hébergement <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name', { required: 'Le nom est requis' })}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Ex: Hôtel Ivoire"
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

              {subtypeOptionsByType[watch('type')] && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sous-catégorie <span className="text-gray-500">(optionnel)</span>
                  </label>
                  <select
                    {...register('subtype')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    {subtypeOptionsByType[watch('type')].map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {watch('type') === 'other' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Précisez le type d'hébergement <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('type_other_label', { required: "Veuillez préciser le type d'hébergement" })}
                    type="text"
                    placeholder="Ex : Camp de brousse, Chambre chez l'habitant..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                  {errors.type_other_label && (
                    <p className="text-red-500 text-sm mt-1">{errors.type_other_label.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  WhatsApp de l'établissement <span className="text-gray-500">(recommandé)</span>
                </label>
                <input
                  {...register('whatsapp')}
                  type="text"
                  placeholder="+225 07 00 00 00 00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Utilisé pour envoyer à vos clients la confirmation de leur réservation. Laissez vide pour reprendre le numéro de votre inscription.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (FR) <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('description', { required: 'La description est requise' })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Décrivez votre hébergement..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (EN) <span className="text-gray-500">(optionnel)</span>
                </label>
                <div className="flex flex-col gap-2">
                  <textarea
                    {...register('description_en')}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="Describe your accommodation..."
                  />
                  <button
                    type="button"
                    onClick={translateDescriptionToEnglish}
                    disabled={translatingDescription}
                    className="btn-secondary w-full sm:w-auto text-sm disabled:opacity-50"
                  >
                    {translatingDescription ? 'Traduction en cours...' : 'Traduire automatiquement depuis le français'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Étape 2: Localisation */}
          {currentStep === getStepNumberByKey('location') && (
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
                  placeholder="Ex: Boulevard de la République, Cocody"
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
                  placeholder="Ex: Abidjan"
                />
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Utilisez votre position actuelle ou renseignez des coordonnées approximatives. Seule une localisation estimée est enregistrée pour orienter les voyageurs.
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
                  Vous pouvez ajuster les coordonnées manuellement si nécessaire.
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
          )}

          {/* Étape 3: Informations sur l'établissement */}
          {currentStep === getStepNumberByKey('establishment') && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Informations sur l'établissement</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Année d'ouverture
                </label>
                <input
                  {...register('opening_year', { 
                    min: { value: 1900, message: 'Année invalide' },
                    max: { value: new Date().getFullYear(), message: 'Année invalide' }
                  })}
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="2020"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Classification de l'établissement
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      value="stars"
                      {...register('classification_mode')}
                      defaultChecked={classificationMode === 'stars'}
                      className="rounded"
                    />
                    <span>Établissement classé par <strong>étoiles</strong></span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      value="standing"
                      {...register('classification_mode')}
                      defaultChecked={classificationMode === 'standing'}
                      className="rounded"
                    />
                    <span>Établissement classé par <strong>standing</strong> (luxe / standard / économique)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      value="unclassified"
                      {...register('classification_mode')}
                      defaultChecked={!classificationMode || classificationMode === 'unclassified'}
                      className="rounded"
                    />
                    <span><strong>Non classé</strong></span>
                  </label>
                </div>
              </div>

              {classificationMode === 'stars' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre d'étoiles <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('star_rating')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="">Sélectionner</option>
                    <option value="1">1 étoile</option>
                    <option value="2">2 étoiles</option>
                    <option value="3">3 étoiles</option>
                    <option value="4">4 étoiles</option>
                    <option value="5">5 étoiles</option>
                  </select>
                </div>
              )}

              {classificationMode === 'standing' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Standing
                  </label>
                  <select
                    {...register('standing')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="">Sélectionner</option>
                    <option value="luxury">Luxe</option>
                    <option value="standard">Standard</option>
                    <option value="economy">Économique</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre total de chambres dans l'établissement <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('bedrooms', { 
                    required: 'Le nombre de chambres est requis',
                    min: { value: 0, message: 'Minimum 0' }
                  })}
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="2"
                />
                {errors.bedrooms && (
                  <p className="text-red-500 text-sm mt-1">{errors.bedrooms.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Type de chambre
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {roomTypeOptions.map(type => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedRoomTypes.includes(type)}
                        onChange={() => toggleRoomType(type)}
                        className="rounded"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacité d'accueil (max personnes) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('max_guests', { 
                    required: 'La capacité est requise',
                    min: { value: 1, message: 'Minimum 1 personne' }
                  })}
                  type="number"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="4"
                />
                {errors.max_guests && (
                  <p className="text-red-500 text-sm mt-1">{errors.max_guests.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Salles de bain dans l'établissement <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('bathrooms', { 
                    required: 'Le nombre de salles de bain est requis',
                    min: { value: 0, message: 'Minimum 0' }
                  })}
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="2"
                />
                {errors.bathrooms && (
                  <p className="text-red-500 text-sm mt-1">{errors.bathrooms.message}</p>
                )}
              </div>
            </div>

            {/* Salle de conférence */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-3">Salle de conférence</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre de salles
                  </label>
                  <input
                    {...register('conference_rooms_count', { min: 0 })}
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Capacité totale
                  </label>
                  <input
                    {...register('conference_capacity', { min: 0 })}
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Restaurant et Bar */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Capacité restaurant
                  </label>
                  <input
                    {...register('restaurant_capacity', { min: 0 })}
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Capacité bar
                  </label>
                  <input
                    {...register('bar_capacity', { min: 0 })}
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Étape 4: Tarifs et capacité */}
          {currentStep === getStepNumberByKey('pricing') && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Tarifs et capacité</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              Saisissez le <strong>tarif de base</strong> par catégorie. Vous pourrez activer la tarification automatique (variantes non remboursable, modifiable, long séjour) dans les paramètres de l&apos;hébergement après création.
            </p>
            
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
                  step="1000"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900/40"
                  placeholder="50000"
                  disabled={selectedRoomTypes.length > 0}
                  readOnly={selectedRoomTypes.length > 0}
                />
                {errors.price_per_night && (
                  <p className="text-red-500 text-sm mt-1">{errors.price_per_night.message}</p>
                )}
                {selectedRoomTypes.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ce montant est calculé automatiquement à partir du tarif le plus bas renseigné ci-dessous.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Tarifs par type de chambre</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Montant / chambre / nuit
                </span>
              </div>
              
              {selectedRoomTypes.length === 0 ? (
                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/30 text-sm text-gray-600 dark:text-gray-300">
                  Sélectionnez d'abord vos types de chambres (étape « Établissement ») pour définir des tarifs spécifiques.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedRoomTypes.map((type) => {
                    const pricing = roomTypePricing[type] || {};
                    return (
                      <div key={type} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900 dark:text-white">{type}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Obligatoire</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Nombre de chambres pour ce type
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={pricing.rooms ?? ''}
                              onChange={(e) => handleRoomTypePricingChange(type, 'rooms', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                              placeholder="Ex: 5"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Tarif par nuit (FCFA) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={pricing.price ?? ''}
                              onChange={(e) => handleRoomTypePricingChange(type, 'price', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                              placeholder="Ex: 75000"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Étape 5: Services et équipements */}
          {currentStep === getStepNumberByKey('services') && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Services et équipements</h2>
            
            <div className="space-y-4">
              {/* Équipements de base */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Équipements de base</h3>
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

              {/* Services supplémentaires */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-3">Services supplémentaires</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      {...register('shuttle_service')}
                      className="rounded"
                    />
                    <span className="text-sm">Navette</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      {...register('laundry')}
                      className="rounded"
                    />
                    <span className="text-sm">Buanderie</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      {...register('reception_24h')}
                      className="rounded"
                    />
                    <span className="text-sm">Réception 24H/24</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      {...register('smoking_area')}
                      className="rounded"
                    />
                    <span className="text-sm">Espace fumeur</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      {...register('pets_allowed')}
                      className="rounded"
                    />
                    <span className="text-sm">Animaux acceptés</span>
                  </label>
                </div>
              </div>

              {/* Tarif petit déjeuner */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tarif petit déjeuner (FCFA)
                    </label>
                    <input
                      {...register('breakfast_price', { min: 0 })}
                      type="number"
                      step="100"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      placeholder="5000"
                    />
                  </div>
                </div>
              </div>

              {/* Autres équipements */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium mb-2">
                  Autres équipements
                </label>
                <textarea
                  {...register('other_amenities')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Précisez d'autres équipements ou services..."
                />
              </div>
            </div>
          </div>
          )}

          {/* Étape 6: Tarifs et politique */}
          {currentStep === getStepNumberByKey('policy') && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Tarifs et politique</h2>
            
            <div className="space-y-4">
              {/* Garantie de réservation */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Garantie de réservation</h3>
                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Les modalités de garantie sont gérées par l'équipe Mon Beau Pays selon le type d'hébergement et
                    s'affichent automatiquement aux voyageurs. Aucun paramétrage n'est requis dans ce formulaire.
                    Contactez le support si vous avez besoin d'une configuration spécifique.
                  </p>
                </div>
              </div>

              {/* Politique d'annulation */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-3">Politique d'annulation</h3>
                <p className="text-sm text-gray-500 mb-3">Affichée au voyageur avant paiement. Il devra l'accepter pour réserver.</p>
                <input type="hidden" {...register('cancellation_policy_hours', { valueAsNumber: true })} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CANCELLATION_POLICIES.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setValue('cancellation_policy_hours', p.hours, { shouldDirty: true })}
                      className={`text-left p-4 rounded-xl border-2 transition-colors ${
                        (watch('cancellation_policy_hours') ?? 48) === p.hours
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

              {/* Type de paiement */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-3">Type de paiement accepté</h3>
                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/30 space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Les moyens de paiement ci-dessous sont proposés automatiquement aux voyageurs.
                    L'équipe Mon Beau Pays se charge de leur activation.
                  </p>
                  <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300">
                    {paymentMethodOptions.map(method => (
                      <li key={method}>{method}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Besoin d'activer ou de désactiver un moyen ? Informez simplement le support.
                  </p>
                </div>
              </div>

              {/* Petit déjeuner inclus */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-3">Petit déjeuner inclus</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('breakfast_included')}
                      className="rounded"
                    />
                    <span className="text-sm">Petit déjeuner inclus</span>
                  </label>
                  
                  {watch('breakfast_included') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Pour combien de personnes ?
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            {...register('breakfast_included_persons')}
                            value="1"
                            className="rounded"
                          />
                          <span className="text-sm">1 personne</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            {...register('breakfast_included_persons')}
                            value="2"
                            className="rounded"
                          />
                          <span className="text-sm">2 personnes</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Horaires */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-3">Horaires</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Check-in
                    </label>
                    <input
                      {...register('check_in_time')}
                      type="time"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Check-out
                    </label>
                    <input
                      {...register('check_out_time')}
                      type="time"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Facture soldée */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                  <h3 className="text-lg font-semibold mb-2">Facture soldée</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Les factures sont automatiquement soldées 48 heures avant l'arrivée des voyageurs.
                    Des rappels sont envoyés par la plateforme dès qu'un paiement est attendu.
                  </p>
                </div>
              </div>

              {/* Conditions particulières */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/30 space-y-2">
                  <h3 className="text-lg font-semibold">Conditions particulières</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Les conditions particulières (caution, règles spécifiques, etc.) sont intégrées par l'équipe Mon Beau Pays
                    et communiquées automatiquement aux voyageurs. Si vous devez ajouter une précision, merci de la transmettre au support.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Note : Commission de 10% pour la plateforme (déjà incluse dans le système).
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Étape 7: Médias */}
          {currentStep === getStepNumberByKey('media') && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Photos / Vidéos</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <span className="font-semibold text-red-500">Minimum 6 photos requises.</span> 
              {' '}Jusqu'à 10 fichiers. Formats acceptés: JPG, PNG, WEBP, MP4, MOV (max 10 Mo chacun).
            </p>
            
            {mediaFiles.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {mediaFiles.length} fichier{mediaFiles.length > 1 ? 's' : ''} sélectionné{mediaFiles.length > 1 ? 's' : ''}
                  {mediaFiles.length < 6 && (
                    <span className="block mt-1 text-red-600 dark:text-red-400 font-semibold">
                      ⚠️ Il manque {6 - mediaFiles.length} photo{6 - mediaFiles.length > 1 ? 's' : ''} (minimum 6 requis)
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label className="block">
                <span className="sr-only">Choisir des fichiers</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaChange}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </label>
              
              {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
                      {/* Simple preview (image or video) */}
                      {src.match(/\\.mp4$|\\.mov$/i) ? (
                        <video src={src} className="w-full h-full object-cover" muted />
                      ) : (
                        <Image src={src} alt={`media-${i}`} fill className="object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = [...mediaFiles];
                          const newPreviews = [...previews];
                          newFiles.splice(i, 1);
                          newPreviews.splice(i, 1);
                          // Libérer l'URL de l'objet
                          URL.revokeObjectURL(src);
                          setMediaFiles(newFiles);
                          setPreviews(newPreviews);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {previews.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">
                    Aucune image sélectionnée. Cliquez sur "Choisir des fichiers" ci-dessus pour ajouter vos photos.
                  </p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Navigation entre les étapes */}
          <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            {currentStep > initialStepId ? (
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Précédent
              </button>
            ) : (
              <Link
                href={cancelHref}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Annuler
              </Link>
            )}
            
            <div className="flex-1" />
            
            {currentStep < lastStepId ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary flex items-center gap-2"
              >
                Suivant
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || success}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Création en cours...
                  </>
                ) : success ? (
                  'Hébergement créé !'
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Créer l'hébergement
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

