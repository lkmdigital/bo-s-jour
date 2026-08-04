'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Footer from '@/components/common/Footer';
import api from '@/lib/api';
import Link from 'next/link';
import { 
  Bed, Bath, Eye, Mountain, Waves, TreePine, Home, Car,
  Wifi, Wind, Tv, Lock, Coffee, Wine, Shirt, Footprints,
  Check, ChevronDown, ChevronUp
} from 'lucide-react';

interface RoomFormData {
  name: string; // Nom personnalisé de la chambre
  type: string;
  description?: string;
  description_en?: string;
  capacity: number;
  price_per_night: number;
  amenities?: string;
  bedrooms: number;
  bathrooms: number;
  quantity?: number; // Nombre total de chambres de ce type
  // Nouveaux champs
  surface_area?: number;
  bed_type?: string;
  bathroom_features?: string[];
  view_type?: string;
  has_balcony?: boolean;
  has_terrace?: boolean;
  has_air_conditioning?: boolean;
  has_wifi?: boolean;
  has_tv?: boolean;
  has_minibar?: boolean;
  has_safe?: boolean;
  has_coffee_machine?: boolean;
  has_bathrobe?: boolean;
  has_slippers?: boolean;
  has_welcome_products?: boolean;
  single_occupancy_price?: number;
  extra_bed_price?: number;
  max_extra_beds?: number;
}

const ROOM_TYPES = [
  { value: 'single', label: 'Chambre Single', capacity: 1 },
  { value: 'double', label: 'Chambre Double', capacity: 2 },
  { value: 'twin', label: 'Chambre Twin (2 lits)', capacity: 2 },
  { value: 'triple', label: 'Chambre Triple', capacity: 3 },
  { value: 'suite', label: 'Suite', capacity: 2 },
  { value: 'suite_junior', label: 'Suite Junior', capacity: 2 },
  { value: 'suite_familiale', label: 'Suite Familiale', capacity: 4 },
  { value: 'studio', label: 'Studio', capacity: 2 },
  { value: 'apartment', label: 'Appartement', capacity: 4 },
  { value: 'bungalow', label: 'Bungalow', capacity: 4 },
  { value: 'villa', label: 'Villa', capacity: 6 },
  { value: 'pmr', label: 'Chambre PMR (accessibilité)', capacity: 2 },
  { value: 'other', label: 'Autre', capacity: 2 },
];

const BED_TYPES = [
  { value: 'single_80', label: 'Lit Single 80×180 cm' },
  { value: 'single_90', label: 'Lit Single 90×180 cm' },
  { value: 'double_140', label: 'Lit Double 140×180 cm' },
  { value: 'queen_160', label: 'Lit Queen 160×200 cm' },
  { value: 'king_200', label: 'Lit King 200×200 cm' },
  { value: 'twin', label: '2 Lits Single séparés' },
  { value: 'sofa_bed', label: 'Canapé-lit' },
  { value: 'bunk', label: 'Lits superposés' },
];

const BATHROOM_FEATURES = [
  { value: 'shower', label: 'Douche' },
  { value: 'bathtub', label: 'Baignoire' },
  { value: 'italian_shower', label: 'Douche à l\'italienne' },
  { value: 'jacuzzi', label: 'Jacuzzi / Bain à remous' },
  { value: 'double_sink', label: 'Double vasque' },
  { value: 'bidet', label: 'Bidet' },
  { value: 'hairdryer', label: 'Sèche-cheveux' },
];

const VIEW_TYPES = [
  { value: 'city', label: 'Vue Ville', icon: Home },
  { value: 'garden', label: 'Vue Jardin', icon: TreePine },
  { value: 'pool', label: 'Vue Piscine', icon: Waves },
  { value: 'sea', label: 'Vue Mer', icon: Waves },
  { value: 'lagoon', label: 'Vue Lagune', icon: Waves },
  { value: 'mountain', label: 'Vue Montagne', icon: Mountain },
  { value: 'courtyard', label: 'Vue Cour intérieure', icon: Home },
  { value: 'parking', label: 'Vue Parking', icon: Car },
  { value: 'none', label: 'Sans vue particulière', icon: Eye },
];

export default function NewRoomPage() {
  const router = useRouter();
  const params = useParams();
  const accommodationId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBathroomFeatures, setSelectedBathroomFeatures] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<RoomFormData>({
    defaultValues: {
      capacity: 2,
      bedrooms: 1,
      bathrooms: 1,
      quantity: 1,
      has_wifi: true,
      has_air_conditioning: true,
    },
  });

  const selectedType = watch('type');
  const pricePerNight = watch('price_per_night');

  // Auto-update capacity when room type changes
  const handleTypeChange = (typeValue: string) => {
    const roomType = ROOM_TYPES.find(t => t.value === typeValue);
    if (roomType) {
      setValue('capacity', roomType.capacity);
    }
  };

  const toggleBathroomFeature = (feature: string) => {
    setSelectedBathroomFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const onSubmit = async (data: RoomFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Convertir les équipements en tableau
      const amenities = data.amenities
        ? data.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : [];

      // Construire les équipements depuis les checkboxes
      const equipmentList: string[] = [...amenities];
      if (data.has_wifi) equipmentList.push('Wi-Fi');
      if (data.has_air_conditioning) equipmentList.push('Climatisation');
      if (data.has_tv) equipmentList.push('Télévision');
      if (data.has_minibar) equipmentList.push('Mini-bar');
      if (data.has_safe) equipmentList.push('Coffre-fort');
      if (data.has_coffee_machine) equipmentList.push('Machine à café');
      if (data.has_bathrobe) equipmentList.push('Peignoir');
      if (data.has_slippers) equipmentList.push('Chaussons');
      if (data.has_welcome_products) equipmentList.push('Produits d\'accueil');
      if (data.has_balcony) equipmentList.push('Balcon');
      if (data.has_terrace) equipmentList.push('Terrasse');

      const response = await api.post(`/accommodations/${accommodationId}/rooms`, {
        ...data,
        amenities: equipmentList,
        bathroom_features: selectedBathroomFeatures,
      });

      // Rediriger vers la page de gestion des images
      router.push(`/dashboard/host/accommodations/${accommodationId}/rooms/${response.data.id}/images`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de la chambre');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold mb-2">Ajouter une chambre</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Créez une nouvelle chambre. Vous pourrez ajouter des images après la création.
          </p>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Informations de base */}
            <div className="card space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bed className="w-5 h-5 text-primary" />
                Informations de base
              </h2>

              {/* Nom de la chambre */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom de la chambre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Nom requis' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Ex: Chambre Deluxe avec vue mer, Suite Présidentielle..."
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Type de chambre */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Type de chambre <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('type', { required: 'Type requis' })}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="">Sélectionner un type</option>
                  {ROOM_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.capacity} pers.)
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description (Français)</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Décrivez la chambre, ses équipements, son ambiance..."
                />
              </div>

              {/* Description EN */}
              <div>
                <label className="block text-sm font-medium mb-2">Description (English)</label>
                <textarea
                  {...register('description_en')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Describe the room, its amenities, its atmosphere..."
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Capacité */}
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
                </div>

                {/* Chambres */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Chambres <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('bedrooms', { required: 'Requis', min: 1 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    min="1"
                  />
                </div>

                {/* Salles de bain */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Salles de bain <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('bathrooms', { required: 'Requis', min: 1 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    min="1"
                  />
                </div>

                {/* Superficie */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Superficie (m²)
                  </label>
                  <input
                    type="number"
                    {...register('surface_area', { min: 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="25"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>

              {/* Quantité */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre de chambres identiques de ce type
                </label>
                <input
                  type="number"
                  {...register('quantity', { min: 1, max: 100 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  min="1"
                  max="100"
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ex: Si vous avez 5 chambres doubles identiques, indiquez 5
                </p>
              </div>
            </div>

            {/* Section 2: Literie et Salle de bain */}
            <div className="card space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bath className="w-5 h-5 text-primary" />
                Literie et Salle de bain
              </h2>

              {/* Type de lit */}
              <div>
                <label className="block text-sm font-medium mb-2">Type de lit</label>
                <select
                  {...register('bed_type')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="">Sélectionner un type de lit</option>
                  {BED_TYPES.map((bed) => (
                    <option key={bed.value} value={bed.value}>
                      {bed.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Équipements salle de bain */}
              <div>
                <label className="block text-sm font-medium mb-3">Équipements salle de bain</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BATHROOM_FEATURES.map((feature) => (
                    <button
                      key={feature.value}
                      type="button"
                      onClick={() => toggleBathroomFeature(feature.value)}
                      className={`p-3 border-2 rounded-lg text-left transition-all text-sm ${
                        selectedBathroomFeatures.includes(feature.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {feature.label}
                        {selectedBathroomFeatures.includes(feature.value) && (
                          <Check className="w-4 h-4 text-primary ml-auto" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Vue et Extérieur */}
            <div className="card space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Vue et Espaces extérieurs
              </h2>

              {/* Type de vue */}
              <div>
                <label className="block text-sm font-medium mb-3">Type de vue</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {VIEW_TYPES.map((view) => {
                    const Icon = view.icon;
                    return (
                      <label
                        key={view.value}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all text-sm ${
                          watch('view_type') === view.value
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                        }`}
                      >
                        <input
                          type="radio"
                          {...register('view_type')}
                          value={view.value}
                          className="sr-only"
                        />
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {view.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Espaces extérieurs */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    {...register('has_balcony')}
                    className="w-5 h-5 text-primary"
                  />
                  <span>Balcon</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    {...register('has_terrace')}
                    className="w-5 h-5 text-primary"
                  />
                  <span>Terrasse</span>
                </label>
              </div>
            </div>

            {/* Section 4: Équipements */}
            <div className="card space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Wifi className="w-5 h-5 text-primary" />
                Équipements de la chambre
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input type="checkbox" {...register('has_wifi')} className="w-5 h-5 text-primary" />
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm">Wi-Fi</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input type="checkbox" {...register('has_air_conditioning')} className="w-5 h-5 text-primary" />
                  <Wind className="w-4 h-4" />
                  <span className="text-sm">Climatisation</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input type="checkbox" {...register('has_tv')} className="w-5 h-5 text-primary" />
                  <Tv className="w-4 h-4" />
                  <span className="text-sm">Télévision</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input type="checkbox" {...register('has_minibar')} className="w-5 h-5 text-primary" />
                  <Wine className="w-4 h-4" />
                  <span className="text-sm">Mini-bar</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input type="checkbox" {...register('has_safe')} className="w-5 h-5 text-primary" />
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Coffre-fort</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input type="checkbox" {...register('has_coffee_machine')} className="w-5 h-5 text-primary" />
                  <Coffee className="w-4 h-4" />
                  <span className="text-sm">Machine à café</span>
                </label>
              </div>

              {/* Options Premium */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Options Premium</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input type="checkbox" {...register('has_bathrobe')} className="w-5 h-5 text-primary" />
                    <Shirt className="w-4 h-4" />
                    <span className="text-sm">Peignoir</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input type="checkbox" {...register('has_slippers')} className="w-5 h-5 text-primary" />
                    <Footprints className="w-4 h-4" />
                    <span className="text-sm">Chaussons</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input type="checkbox" {...register('has_welcome_products')} className="w-5 h-5 text-primary" />
                    <span className="text-sm">🎁 Produits d'accueil</span>
                  </label>
                </div>
              </div>

              {/* Autres équipements (texte libre) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Autres équipements (séparés par des virgules)
                </label>
                <input
                  type="text"
                  {...register('amenities')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Bureau, Fer à repasser, Miroir..."
                />
              </div>
            </div>

            {/* Section 5: Tarification */}
            <div className="card space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                💰 Tarification
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prix */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Prix par nuit (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('price_per_night', { required: 'Prix requis', min: 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="25000"
                    step="1000"
                    min="0"
                  />
                  {errors.price_per_night && (
                    <p className="text-red-500 text-sm mt-1">{errors.price_per_night.message}</p>
                  )}
                </div>

                {/* Prix occupation simple */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Prix occupation simple (FCFA)
                  </label>
                  <input
                    type="number"
                    {...register('single_occupancy_price', { min: 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder={pricePerNight ? String(Math.round(Number(pricePerNight) * 0.85)) : ''}
                    step="1000"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Prix réduit pour 1 personne seule (suggestion: -15%)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Supplément lit d&apos;appoint (FCFA/nuit)</label>
                  <input
                    type="number"
                    {...register('extra_bed_price', { min: 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="Ex: 10000"
                    step="1000"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre max. de lits d&apos;appoint</label>
                  <input
                    type="number"
                    {...register('max_extra_beds', { min: 0, max: 10 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="0"
                    min="0"
                    max="10"
                  />
                </div>
              </div>
            </div>

            {/* Note importante */}
            <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                <strong>📷 Note importante :</strong> Après la création, vous devrez ajouter au moins 3 images
                pour que la chambre puisse être activée et visible aux clients.
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-4">
              <Link
                href={`/dashboard/host/accommodations/${accommodationId}/rooms`}
                className="flex-1 btn-secondary text-center"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer la chambre'}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
