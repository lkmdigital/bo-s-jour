'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { useSearchStore } from '@/stores/searchStore';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { 
  MapPin, Users, Bed, Bath, Expand, ArrowLeft, 
  CheckCircle, Wifi, Tv, Wind, Coffee, Car, Eye,
  Star, Calendar, X, Edit
} from 'lucide-react';
import ImageLightbox from '@/components/common/ImageLightbox';
import Link from 'next/link';

interface RoomImage {
  id: number;
  image_path: string;
  full_url: string;
  thumbnail_url: string;
  is_primary: boolean;
  caption?: string;
}

interface Room {
  id: number;
  accommodation_id: number;
  name: string;
  name_en?: string;
  type: string;
  description?: string;
  description_en?: string;
  capacity: number;
  price_per_night: number;
  bedrooms: number;
  bathrooms: number;
  surface_area?: number;
  amenities?: string[];
  basic_amenities?: string[];
  premium_amenities?: string[];
  is_active: boolean;
  quantity?: number; // Nombre total de chambres de ce type
  available_quantity?: number; // Nombre de chambres disponibles pour les dates sélectionnées
  images?: RoomImage[];
  primary_image_url?: string;
  room_category?: string;
  room_subcategory?: string;
  view_type?: string;
  bedding?: any;
  bathroom_features?: string[];
  has_balcony?: boolean;
  has_terrace?: boolean;
  has_kitchen?: boolean;
  accommodation?: {
    id: number;
    name: string;
    city: string;
    address: string;
    host_id: number;
  };
}

const amenityIcons: Record<string, any> = {
  wifi: Wifi,
  tv: Tv,
  climatisation: Wind,
  'air conditioning': Wind,
  coffee: Coffee,
  parking: Car,
};

function RoomDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const { session } = useSearchStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const checkIn = searchParams?.get('check_in') || session?.checkIn || undefined;
  const checkOut = searchParams?.get('check_out') || session?.checkOut || undefined;
  const urlGuests = searchParams?.get('guests');
  const guests = urlGuests || (session?.guests ? String(session.guests) : undefined);
  // `children` ne doit venir de la session mémorisée QUE si `guests` en vient aussi —
  // sinon un lien qui fixe `guests` sans `children` (ex. liste des chambres) hériterait
  // d'un nombre d'enfants périmé d'une recherche précédente, sans rapport avec le
  // nombre de voyageurs réellement affiché (bug réel : "children doit être inférieur à 1").
  const childrenParam = searchParams?.get('children');
  const children = urlGuests
    ? (childrenParam || undefined)
    : (childrenParam || (session?.children ? String(session.children) : undefined));
  
  // Vérifier si l'utilisateur est le propriétaire de l'établissement
  const isHost = isAuthenticated && user?.role === 'host' && room?.accommodation?.host_id === user?.id;

  useEffect(() => {
    fetchRoom();
  }, [params.id, checkIn, checkOut]);

  const fetchRoom = async () => {
    try {
      setError(null);
      setLoading(true);
      let url = `/rooms/${params.id}`;
      if (checkIn && checkOut) {
        url += `?check_in=${checkIn}&check_out=${checkOut}`;
      }
      const response = await api.get(url);
      setRoom(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement de la chambre');
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      single: 'Chambre Single',
      double: 'Chambre Double',
      twin: 'Chambre Twin',
      triple: 'Chambre Triple',
      pmr: 'Chambre PMR',
      suite: 'Suite',
      other: 'Autre',
    };
    return category ? labels[category] || category : 'Chambre';
  };

  const getSubcategoryLabel = (subcategory?: string) => {
    const labels: Record<string, string> = {
      standard: 'Standard',
      confort: 'Confort',
      superieure: 'Supérieure',
      deluxe: 'Deluxe',
      premium: 'Premium',
      junior: 'Junior',
      familiale: 'Familiale',
    };
    return subcategory ? labels[subcategory] || subcategory : '';
  };

  const getViewLabel = (view?: string) => {
    const labels: Record<string, string> = {
      city: 'Vue ville',
      garden: 'Vue jardin',
      pool: 'Vue piscine',
      sea: 'Vue mer',
      mountain: 'Vue montagne',
      parking: 'Vue parking',
    };
    return view ? labels[view] || '' : '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow container mx-auto px-4 py-12">
          <ErrorDisplay error={error || 'Chambre introuvable'} />
        </div>
        <Footer />
      </div>
    );
  }

  const images = room.images || [];
  const primaryImage = images.find(img => img.is_primary) || images[0];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
            {room.accommodation && (
              <div className="mt-2 text-sm text-gray-500">
                <Link href={`/accommodations/${room.accommodation.id}`} className="hover:text-primary">
                  {room.accommodation.name}
                </Link>
                <span className="mx-2">/</span>
                <span>{room.name}</span>
              </div>
            )}
          </div>

          {/* Galerie d'images */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-8 rounded-lg overflow-hidden">
            {/* Image principale */}
            {primaryImage && (
              <div 
                className="md:col-span-2 md:row-span-2 relative h-96 cursor-pointer group"
                onClick={() => openLightbox(0)}
              >
                <Image
                  src={primaryImage.full_url}
                  alt={room.name}
                  fill
                  className="object-cover group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            )}
            
            {/* Images secondaires */}
            {images.slice(1, 5).map((image, index) => (
              <div 
                key={image.id}
                className="relative h-48 cursor-pointer group"
                onClick={() => openLightbox(index + 1)}
              >
                <Image
                  src={image.full_url}
                  alt={`${room.name} - ${index + 2}`}
                  fill
                  className="object-cover group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}

            {/* Bouton "Voir toutes les photos" */}
            {images.length > 5 && (
              <button
                onClick={() => openLightbox(0)}
                className="relative h-48 bg-gray-900/70 flex items-center justify-center text-white hover:bg-gray-900/80 transition-colors"
              >
                <div className="text-center">
                  <Eye className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">Voir toutes les photos</p>
                  <p className="text-sm">({images.length} photos)</p>
                </div>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* En-tête */}
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{room.name}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                        {getCategoryLabel(room.room_category)}
                      </span>
                      {room.room_subcategory && (
                        <span className="text-gray-600 dark:text-gray-400">
                          {getSubcategoryLabel(room.room_subcategory)}
                        </span>
                      )}
                      {room.view_type && (
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Eye className="w-4 h-4" />
                          {getViewLabel(room.view_type)}
                        </span>
                      )}
                    </div>
                  </div>
                  {!room.is_active && (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                      Non disponible
                    </span>
                  )}
                </div>

                {/* Caractéristiques principales */}
                <div className="flex flex-wrap gap-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>{room.capacity} personne{room.capacity > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="w-5 h-5 text-primary" />
                    <span>{room.bedrooms} chambre{room.bedrooms > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="w-5 h-5 text-primary" />
                    <span>{room.bathrooms} salle{room.bathrooms > 1 ? 's' : ''} de bain</span>
                  </div>
                  {room.surface_area && (
                    <div className="flex items-center gap-2">
                      <Expand className="w-5 h-5 text-primary" />
                      <span>{room.surface_area} m²</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {room.description && (
                  <div className="pt-6">
                    <h2 className="text-xl font-semibold mb-3">Description</h2>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {room.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Équipements */}
              {(room.basic_amenities?.length || room.premium_amenities?.length || room.amenities?.length) && (
                <div className="card">
                  <h2 className="text-2xl font-bold mb-4">Équipements</h2>
                  
                  {room.basic_amenities && room.basic_amenities.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Équipements de base
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {room.basic_amenities.map((amenity, index) => {
                          const Icon = amenityIcons[amenity.toLowerCase()] || CheckCircle;
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-primary" />
                              <span className="capitalize">{amenity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {room.premium_amenities && room.premium_amenities.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Équipements premium
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {room.premium_amenities.map((amenity, index) => {
                          const Icon = amenityIcons[amenity.toLowerCase()] || Star;
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-yellow-500" />
                              <span className="capitalize">{amenity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {room.amenities && room.amenities.length > 0 && !room.basic_amenities && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {room.amenities.map((amenity, index) => {
                        const Icon = amenityIcons[amenity.toLowerCase()] || CheckCircle;
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="capitalize">{amenity}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Salle de bain */}
              {room.bathroom_features && room.bathroom_features.length > 0 && (
                <div className="card">
                  <h2 className="text-2xl font-bold mb-4">Salle de bain</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {room.bathroom_features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="capitalize">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Colonne latérale - Réservation */}
            <div className="lg:col-span-1">
              <div className="card sticky top-24">
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-primary">
                      {formatPrice(room.price_per_night)} FCFA
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">par nuit</p>
                  {room.quantity && room.quantity > 1 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {room.available_quantity !== undefined && checkIn && checkOut
                        ? `${room.available_quantity} disponible${room.available_quantity > 1 ? 's' : ''} sur ${room.quantity}`
                        : `${room.quantity} chambres de ce type`}
                    </p>
                  )}
                </div>

                {!isHost && room.is_active ? (
                  <Link
                    href={(() => {
                      const params = new URLSearchParams();
                      params.set('accommodation', String(room.accommodation_id));
                      params.set('room', String(room.id));
                      if (checkIn) params.set('check_in', checkIn);
                      if (checkOut) params.set('check_out', checkOut);
                      if (guests) params.set('guests', guests);
                      if (children) params.set('children', children);
                      return `/bookings/new?${params.toString()}`;
                    })()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-5 h-5" />
                    Réserver cette chambre
                  </Link>
                ) : !isHost && !room.is_active ? (
                  <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
                    Chambre non disponible
                  </button>
                ) : isHost ? (
                  <Link
                    href={`/dashboard/host/accommodations/${room.accommodation_id}/rooms/${room.id}/edit`}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Gérer cette chambre
                  </Link>
                ) : null}

                {room.accommodation && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">Établissement</h3>
                    <Link 
                      href={`/accommodations/${room.accommodation.id}`}
                      className="text-primary hover:underline"
                    >
                      {room.accommodation.name}
                    </Link>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {room.accommodation.city}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {images.length > 0 && (
        <ImageLightbox
          images={images.map(img => ({ url: img.full_url, is_primary: img.is_primary }))}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNext={() => setLightboxIndex((prev) => (prev + 1) % images.length)}
          onPrevious={() => setLightboxIndex((prev) => (prev - 1 + images.length) % images.length)}
        />
      )}

      <Footer />
    </div>
  );
}

export default function RoomDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
        <Footer />
      </div>
    }>
      <RoomDetailContent />
    </Suspense>
  );
}
