'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { useSearchStore } from '@/stores/searchStore';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import { isAdmin } from '@/lib/userUtils';
import { MapPin, Star, Users, Bed, Bath, Clock, CheckCircle, XCircle, EyeOff, Wrench, Edit, Trash2, Calendar, ExternalLink } from 'lucide-react';
import MediaCarousel from '@/components/media/MediaCarousel';
import AccommodationCard from '@/components/accommodation/AccommodationCard';
import HorizontalScrollCarousel from '@/components/common/HorizontalScrollCarousel';
import { StaggerContainer, StaggerItem } from '@/components/common/animations';
import RoomsList from '@/components/accommodation/RoomsList';
import ReportReviewButton from '@/components/review/ReportReviewButton';
import DateSelector from '@/components/booking/DateSelector';
import Link from 'next/link';

interface RoomTypePricing {
  type: string;
  price_per_night: number;
  rooms_available?: number | null;
}

interface Room {
  id: number;
  name: string;
  name_en?: string;
  type: string;
  description?: string;
  capacity: number;
  price_per_night: number;
  bedrooms: number;
  bathrooms: number;
  surface_area?: number;
  is_active: boolean;
  is_available?: boolean; // Disponibilité pour les dates sélectionnées
  quantity?: number; // Nombre total de chambres de ce type
  available_quantity?: number; // Nombre de chambres disponibles pour les dates sélectionnées
  images?: any[];
  primary_image_url?: string;
  room_category?: string;
  view_type?: string;
}

/** Variantes tarifaires renvoyées par l’API price-preview (plans tarifaires) */
interface PricingVariantItem {
  label: string;
  price_per_night: number;
  adjustment?: number;
  adjustment_label?: string | null;
  min_nights?: number;
}
interface PricingVariantsData {
  enabled: boolean;
  base: PricingVariantItem;
  non_refundable?: PricingVariantItem;
  modifiable?: PricingVariantItem;
  long_stay?: PricingVariantItem;
}

interface Accommodation {
  id: number;
  name: string;
  host_id: number;
  type: string;
  description: string;
  description_en?: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
  room_type_pricing?: RoomTypePricing[];
  pricing_auto_enabled?: boolean;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  status?: 'pending' | 'published' | 'rejected' | 'unavailable' | 'renovation';
  rating?: number | null;
  total_reviews?: number | null;
  images: Array<{ url: string; is_primary: boolean }>;
  reviews: Array<{
    id: number;
    rating: number;
    comment: string;
    category_ratings?: {
      cleanliness?: number;
      equipment?: number;
      staff?: number;
      value_for_money?: number;
      location?: number;
      comfort?: number;
      wifi?: number;
      bed?: number;
      breakfast?: number;
    };
    user: { name: string };
    created_at: string;
    admin_reply?: string | null;
  }>;
  rooms?: Room[];
  // Optionnel : certains établissements peuvent être mis en avant comme promotion
  is_featured?: boolean;
}

export default function AccommodationDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const { session, setSearchSession } = useSearchStore();
  const [accommodation, setAccommodation] = useState<Accommodation | null>(null);
  const [similarAccommodations, setSimilarAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]); // Toutes les chambres (sans filtre)
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'capacity' | 'name'>('price');
  const [pricingVariants, setPricingVariants] = useState<PricingVariantsData | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const urlCheckIn = searchParams?.get('check_in');
  const urlCheckOut = searchParams?.get('check_out');
  const urlGuests = searchParams?.get('guests');
  const storedOrUrlCheckIn = urlCheckIn || session?.checkIn;
  const storedOrUrlCheckOut = urlCheckOut || session?.checkOut;
  const storedOrUrlGuests = urlGuests ? parseInt(urlGuests, 10) : (session?.guests ?? 1);

  const [selectedDates, setSelectedDates] = useState<{ checkIn: Date | null; checkOut: Date | null; guests: number }>({
    checkIn: storedOrUrlCheckIn ? new Date(storedOrUrlCheckIn) : null,
    checkOut: storedOrUrlCheckOut ? new Date(storedOrUrlCheckOut) : null,
    guests: Number.isFinite(storedOrUrlGuests) ? storedOrUrlGuests : 1,
  });
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<'pending' | 'published' | 'rejected' | 'unavailable' | 'renovation' | ''>('');
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const confirmAction = useConfirm();
  const { showSuccess } = useToast();

  // Fonction de tri (définie avant son utilisation)
  const sortRooms = (roomsToSort: Room[], sort: 'price' | 'capacity' | 'name') => {
    const sorted = [...roomsToSort];
    switch (sort) {
      case 'price':
        return sorted.sort((a, b) => a.price_per_night - b.price_per_night);
      case 'capacity':
        return sorted.sort((a, b) => b.capacity - a.capacity);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  };

  useEffect(() => {
    fetchAccommodation();
  }, [params.id]);

  useEffect(() => {
    if (session?.checkIn && session?.checkOut && !selectedDates.checkIn) {
      setSelectedDates({
        checkIn: new Date(session.checkIn),
        checkOut: new Date(session.checkOut),
        guests: session.guests ?? 1,
      });
    }
  }, [session]);

  useEffect(() => {
    if (accommodation && selectedDates.checkIn && selectedDates.checkOut) {
      filterRoomsByDates(selectedDates.checkIn, selectedDates.checkOut, selectedDates.guests);
    }
  }, [accommodation?.id, selectedDates.checkIn?.getTime(), selectedDates.checkOut?.getTime(), selectedDates.guests]);

  useEffect(() => {
    // Charger toutes les chambres dès que l'établissement est chargé
    if (accommodation) {
      // Utiliser d'abord les chambres déjà incluses dans la réponse (si le backend les inclut)
      if (accommodation.rooms && Array.isArray(accommodation.rooms) && accommodation.rooms.length > 0) {
        const roomsData = accommodation.rooms;
        setAllRooms(roomsData);
        setRooms(sortRooms(roomsData, sortBy));
        setLoadingRooms(false);
      } else {
        // Sinon, charger depuis l'API séparément
        fetchAllRooms();
      }
    }
  }, [accommodation]);
  
  // Réappliquer le tri quand sortBy change
  useEffect(() => {
    if (rooms.length > 0) {
      setRooms(sortRooms([...rooms], sortBy));
    }
  }, [sortBy]);

  const fetchAllRooms = async () => {
    if (!accommodation) return;
    
    try {
      setLoadingRooms(true);
      // Utiliser la route publique sans authentification
      const response = await api.get(`/accommodations/${accommodation.id}/rooms`);
      const roomsData = response.data || [];
      setAllRooms(roomsData);
      // Trier et afficher toutes les chambres par défaut
      setRooms(sortRooms(roomsData, sortBy));
    } catch (err: any) {
      console.error('Error fetching all rooms:', err);
      // En cas d'erreur, utiliser accommodation.rooms si disponible
      if (accommodation.rooms && accommodation.rooms.length > 0) {
        setAllRooms(accommodation.rooms);
        setRooms(sortRooms(accommodation.rooms, sortBy));
      } else {
        setAllRooms([]);
        setRooms([]);
      }
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleDatesSelected = async (checkIn: Date, checkOut: Date, guests: number) => {
    setSelectedDates({ checkIn, checkOut, guests });
    setSearchSession({
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      guests,
    });
    await filterRoomsByDates(checkIn, checkOut, guests);
  };

  const filterRoomsByDates = async (checkIn: Date, checkOut: Date, guests: number) => {
    if (!accommodation) return;
    
    try {
      setLoadingRooms(true);
      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];
      
      const response = await api.get(
        `/accommodations/${accommodation.id}/rooms?check_in=${checkInStr}&check_out=${checkOutStr}&guests=${guests}`
      );
      const filteredRooms = response.data;
      setRooms(sortRooms(filteredRooms, sortBy));
    } catch (err: any) {
      console.error('Error filtering rooms:', err);
      // En cas d'erreur, afficher toutes les chambres
      setRooms(sortRooms(allRooms, sortBy));
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSortChange = (newSort: 'price' | 'capacity' | 'name') => {
    setSortBy(newSort);
    setRooms(sortRooms(rooms, newSort));
  };

  useEffect(() => {
    // Charger les établissements similaires une fois que l'établissement principal est chargé
    if (accommodation) {
      fetchSimilarAccommodations();
    }
  }, [accommodation]);

  // Charger les plans tarifaires (variantes) pour affichage dans la fiche établissement
  useEffect(() => {
    if (!accommodation?.id) return;
    let cancelled = false;
    setLoadingPricing(true);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const checkIn = tomorrow.toISOString().split('T')[0];
    const checkOut = dayAfter.toISOString().split('T')[0];
    api
      .get(`/accommodations/${accommodation.id}/price-preview?check_in=${checkIn}&check_out=${checkOut}`)
      .then((res) => {
        if (!cancelled && res.data?.variants) setPricingVariants(res.data.variants);
      })
      .catch(() => {
        if (!cancelled) setPricingVariants(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPricing(false);
      });
    return () => { cancelled = true; };
  }, [accommodation?.id]);

  const fetchAccommodation = async () => {
    try {
      setError(null);
      const response = await api.get(`/accommodations/${params.id}`);
      const accommodationData = response.data;
      setAccommodation(accommodationData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Erreur lors du chargement de l\'hébergement';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilarAccommodations = async () => {
    if (!accommodation) return;
    
    try {
      setLoadingSimilar(true);
      const response = await api.get(`/accommodations/${params.id}/similar`);
      setSimilarAccommodations(response.data || []);
    } catch (err: any) {
      console.error('Error fetching similar accommodations:', err);
      // Ne pas afficher d'erreur si les suggestions échouent, ce n'est pas critique
    } finally {
      setLoadingSimilar(false);
    }
  };

  const changeStatus = async () => {
    if (!accommodation || !newStatus) return;
    try {
      setUpdating(true);
      await api.put(`/accommodations/${accommodation.id}`, { status: newStatus });
      await fetchAccommodation();
      setNewStatus('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setUpdating(false);
    }
  };

  const deleteAccommodation = async () => {
    if (!accommodation) return;
    const ok = await confirmAction({
      title: 'Supprimer l\'hébergement',
      message: 'Supprimer définitivement cet hébergement ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      setUpdating(true);
      await api.delete(`/accommodations/${accommodation.id}`);
      window.location.href = '/dashboard/host';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setUpdating(false);
    }
  };

  const submitAppointment = async () => {
    if (!accommodation || !appointmentDate) return;
    try {
      setUpdating(true);
      await api.post(`/accommodations/${accommodation.id}/appointments`, {
        requested_at: appointmentDate,
        notes: appointmentNotes,
      });
      setAppointmentOpen(false);
      setAppointmentDate('');
      setAppointmentNotes('');
      showSuccess('Demande de visite envoyée');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la demande de visite');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement de l'hébergement..." size="lg" />
        </div>
      </div>
    );
  }

  if (error || !accommodation) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <ErrorDisplay 
            error={error || 'Hébergement non trouvé'} 
            onRetry={fetchAccommodation}
            type="error"
          />
          <div className="text-center mt-8">
            <a href="/accommodations" className="btn-primary">
              Voir tous les hébergements
            </a>
          </div>
        </div>
      </div>
    );
  }

  const primaryImage = accommodation.images?.find(img => img.is_primary)?.url || 
                     accommodation.images?.[0]?.url || 
                     'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';

  // Normaliser les coordonnées en nombres (l'API peut renvoyer des strings)
  // et définir une localisation par défaut (Abidjan) si aucune coordonnée n'est fournie
  const DEFAULT_LAT = 5.3600;
  const DEFAULT_LNG = -4.0083;

  const numericLat = Number(accommodation.latitude);
  const numericLng = Number(accommodation.longitude);
  const hasValidCoordinates = !Number.isNaN(numericLat) && !Number.isNaN(numericLng);

  const finalLat = hasValidCoordinates ? numericLat : DEFAULT_LAT;
  const finalLng = hasValidCoordinates ? numericLng : DEFAULT_LNG;

  const hasCoordinates = true; // on affiche toujours une carte (avec fallback Abidjan)

  const mapEmbedUrl = `https://www.google.com/maps?q=${finalLat},${finalLng}&z=15&output=embed`;
  const mapLink = `https://www.google.com/maps?q=${finalLat},${finalLng}`;

  const statusLabels = {
    pending: { label: 'En attente', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400', icon: Clock },
    published: { label: 'Publié', color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400', icon: CheckCircle },
    rejected: { label: 'Rejeté', color: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400', icon: XCircle },
    unavailable: { label: 'Indisponible', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', icon: EyeOff },
    renovation: { label: 'En rénovation', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400', icon: Wrench },
    disabled: { label: 'Désactivé', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', icon: EyeOff },
    removed: { label: 'Retiré', color: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400', icon: XCircle },
  };

  const isHost = isAuthenticated && user?.role === 'host' && user?.id === accommodation.host_id;
  const userIsAdmin = isAuthenticated && isAdmin(user);
  const currentStatus = accommodation.status || 'pending';
  const StatusIcon = statusLabels[currentStatus]?.icon || Clock;

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {error && (
            <ErrorDisplay error={error} onDismiss={() => setError(null)} />
          )}

          {/* Actions hôte : Modifier + Supprimer (uniquement si établissement non actif) */}
          {isHost && (
            <div className="card flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/dashboard/host/accommodations/${accommodation.id}/edit`}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Modifier l&apos;établissement
                </Link>
                {currentStatus !== 'published' ? (
                  <button
                    type="button"
                    onClick={deleteAccommodation}
                    disabled={updating}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 font-medium disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {updating ? 'Suppression...' : 'Supprimer l\'établissement'}
                  </button>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pour supprimer cet établissement, passez-le d&apos;abord en « Indisponible » depuis la page Modifier.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bandeau festif de promotion si l'établissement est mis en avant */}
          {accommodation.is_featured && (
              <div className="relative overflow-hidden rounded-2xl border-2 border-primary/70 bg-gradient-to-r from-primary via-red-500 to-orange-400 text-white px-6 py-4 shadow-xl mb-4">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-black/20 rounded-full blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest opacity-80">
                      Offre spéciale Bosejour
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 flex items-center gap-2">
                      ✨ Promotion exceptionnelle sur cet établissement
                    </h2>
                    <p className="text-sm sm:text-base mt-1 opacity-90">
                      Profitez d&apos;une ambiance festive et de conditions avantageuses pour votre prochain séjour.
                      Les meilleurs tarifs sont actuellement proposés par cet hôte.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="px-3 py-1 rounded-full bg-black/30 text-xs font-semibold uppercase tracking-wide">
                      Établissement en promotion
                    </div>
                    <div className="px-4 py-2 rounded-full bg-white text-primary font-bold text-sm shadow-sm">
                      🎁 Offre spéciale voyageur
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold">{accommodation.name}</h1>
                {isHost && accommodation.status && (
                  <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${statusLabels[currentStatus as keyof typeof statusLabels]?.color || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusLabels[currentStatus as keyof typeof statusLabels]?.label || currentStatus}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {accommodation.city}, {accommodation.address}
                </div>
                {accommodation.rating && typeof accommodation.rating === 'number' && accommodation.rating > 0 && (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 fill-accent text-accent mr-1" />
                    <span className="font-semibold">{Number(accommodation.rating).toFixed(1)}</span>
                    <span className="ml-1">({accommodation.total_reviews || 0} avis)</span>
                  </div>
                )}
              </div>
            </div>

            <MediaCarousel items={(accommodation.images || []).map(i => ({ url: i.url }))} />

            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {accommodation.description}
              </p>
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Équipements</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {accommodation.amenities?.map((amenity, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-primary">✓</span>
                    <span className="capitalize">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Détails</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span>{accommodation.max_guests} voyageurs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Bed className="w-5 h-5 text-primary" />
                  <span>{accommodation.bedrooms} chambres</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Bath className="w-5 h-5 text-primary" />
                  <span>{accommodation.bathrooms} salles de bain</span>
                </div>
              </div>
            </div>

            {/* Plans tarifaires (variantes selon politique d'annulation et durée) */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Plans tarifaires</h2>
              {loadingPricing ? (
                <p className="text-gray-600 dark:text-gray-400">Chargement des tarifs...</p>
              ) : pricingVariants ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <span className="font-medium text-gray-900 dark:text-white">{pricingVariants.base.label}</span>
                    <span className="text-primary font-semibold">{formatPrice(pricingVariants.base.price_per_night)} FCFA / nuit</span>
                  </div>
                  {pricingVariants.enabled && (
                    <>
                      {pricingVariants.non_refundable && (
                        <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-gray-700 dark:text-gray-300">{pricingVariants.non_refundable.label}</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatPrice(pricingVariants.non_refundable.price_per_night)} FCFA / nuit
                            {pricingVariants.non_refundable.adjustment_label && (
                              <span className="text-sm text-green-600 dark:text-green-400 ml-1">({pricingVariants.non_refundable.adjustment_label})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {pricingVariants.modifiable && (
                        <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-gray-700 dark:text-gray-300">{pricingVariants.modifiable.label}</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatPrice(pricingVariants.modifiable.price_per_night)} FCFA / nuit
                            {pricingVariants.modifiable.adjustment_label && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">({pricingVariants.modifiable.adjustment_label})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {pricingVariants.long_stay && (
                        <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-gray-700 dark:text-gray-300">{pricingVariants.long_stay.label}</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatPrice(pricingVariants.long_stay.price_per_night)} FCFA / nuit
                            {pricingVariants.long_stay.adjustment_label && (
                              <span className="text-sm text-green-600 dark:text-green-400 ml-1">({pricingVariants.long_stay.adjustment_label})</span>
                            )}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {!pricingVariants.enabled && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tarif unique appliqué à toutes les réservations.</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">À partir de {formatPrice(accommodation.price_per_night)} FCFA / nuit</p>
              )}
            </div>

            {/* Sélecteur de dates et chambres */}
            <div className="space-y-6">
              <DateSelector
                onDatesSelected={handleDatesSelected}
                initialCheckIn={selectedDates.checkIn || undefined}
                initialCheckOut={selectedDates.checkOut || undefined}
                initialGuests={selectedDates.guests}
              />
              
              {/* Tri et filtres */}
              {(rooms.length > 0 || loadingRooms) && (
                <div className="card">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">Toutes les chambres</h2>
                      {!loadingRooms && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {rooms.length} chambre{rooms.length > 1 ? 's' : ''} disponible{rooms.length > 1 ? 's' : ''}
                          {selectedDates.checkIn && selectedDates.checkOut && (
                            <span className="ml-2">
                              • {rooms.filter(r => r.is_available !== false).length} disponible{rooms.filter(r => r.is_available !== false).length > 1 ? 's' : ''} pour vos dates
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    {rooms.length > 0 && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Trier par :</label>
                        <select
                          value={sortBy}
                          onChange={(e) => handleSortChange(e.target.value as 'price' | 'capacity' | 'name')}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="price">Prix (croissant)</option>
                          <option value="capacity">Capacité (décroissant)</option>
                          <option value="name">Nom (A-Z)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {loadingRooms && (
                <div className="card text-center py-8">
                  <LoadingSpinner size="md" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    {selectedDates.checkIn && selectedDates.checkOut 
                      ? 'Recherche des chambres disponibles...' 
                      : 'Chargement des chambres...'}
                  </p>
                </div>
              )}
              
              {!loadingRooms && rooms.length > 0 && (
                <div className="card">
                  <RoomsList 
                    rooms={rooms}
                    checkIn={selectedDates.checkIn}
                    checkOut={selectedDates.checkOut}
                    guests={selectedDates.guests}
                  />
                </div>
              )}
              
              {!loadingRooms && selectedDates.checkIn && selectedDates.checkOut && rooms.length > 0 && rooms.filter(r => r.is_available !== false).length === 0 && (
                <div className="card text-center py-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-yellow-800 dark:text-yellow-300 font-medium">
                    Aucune chambre disponible pour ces dates.
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                    Veuillez essayer d'autres dates. {rooms.length} chambre{rooms.length > 1 ? 's' : ''} disponible{rooms.length > 1 ? 's' : ''} pour d'autres dates.
                  </p>
                </div>
              )}
              
              {!loadingRooms && rooms.length === 0 && allRooms.length === 0 && (
                <div className="card text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Aucune chambre disponible pour le moment.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Cet établissement n'a pas encore de chambres configurées.
                  </p>
                </div>
              )}
            </div>

            {hasCoordinates && mapEmbedUrl && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Localisation</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {hasValidCoordinates ? 'Coordonnées approximatives' : 'Localisation par défaut (Abidjan)'}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <MapPin className="w-5 h-5 text-primary mr-2" />
                      <span>{accommodation.address}, {accommodation.city}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Latitude :{' '}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {finalLat.toFixed(5)}
                      </span>
                      <br />
                      Longitude :{' '}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {finalLng.toFixed(5)}
                      </span>
                    </p>
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ouvrir dans Google Maps
                    </a>
                  </div>
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <iframe
                      title="Carte de localisation"
                      src={mapEmbedUrl}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                  Les coordonnées affichées sont approximatives et servent uniquement à guider les voyageurs.
                </p>
              </div>
            )}

            {/* Autres établissements de la même ville */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Autres établissements à {accommodation.city}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Découvrez d'autres hébergements dans la même ville
                  </p>
                </div>
              </div>
              
              {loadingSimilar ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">Chargement des suggestions...</p>
                </div>
              ) : similarAccommodations.length > 0 ? (
                <HorizontalScrollCarousel 
                  autoScroll={false}
                  showControls={similarAccommodations.length > 3}
                >
                  {similarAccommodations.map((similarAcc) => (
                    <AccommodationCard 
                      key={similarAcc.id} 
                      accommodation={{
                        id: similarAcc.id,
                        name: similarAcc.name,
                        slug: '',
                        type: similarAcc.type,
                        city: similarAcc.city,
                        price_per_night: similarAcc.price_per_night,
                        rating: similarAcc.rating,
                        total_reviews: similarAcc.total_reviews,
                        images: similarAcc.images || [],
                      }}
                    />
                  ))}
                </HorizontalScrollCarousel>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    Aucun autre établissement disponible dans cette ville pour le moment.
                  </p>
                </div>
              )}
            </div>

            {accommodation.reviews && accommodation.reviews.length > 0 && (
              <div className="card">
                <h2 className="text-2xl font-bold mb-4">Avis ({accommodation.total_reviews})</h2>
                <div className="space-y-6">
                  {accommodation.reviews.map((review) => {
                    const categoryLabels: { [key: string]: string } = {
                      cleanliness: 'Propreté',
                      equipment: 'Equipements',
                      staff: 'Personnel',
                      value_for_money: 'Rapport qualité/prix',
                      location: 'Situation géographique',
                      comfort: 'Confort',
                      wifi: 'Wi-Fi',
                      bed: 'Evaluation du lit',
                      breakfast: 'Petit déjeuner',
                    };

                    return (
                      <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold">{review.user.name}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>

                        {review.category_ratings && Object.keys(review.category_ratings).length > 0 && (
                          <div className="mb-3 space-y-2">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Détails de l'évaluation :
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {Object.entries(review.category_ratings).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {categoryLabels[key] || key}:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-3 h-3 ${
                                          i < (value as number)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300 dark:text-gray-600'
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-1 text-xs text-gray-500">
                                      {value}/5
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-gray-700 dark:text-gray-300 mb-2">{review.comment}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {isAuthenticated && (
                          <ReportReviewButton reviewId={review.id} />
                        )}
                        {review.admin_reply && (
                          <div className="mt-3 pl-4 border-l-2 border-primary/30 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg py-2 pr-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Réponse de l&#39;établissement</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{review.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>
      </main>

      {/* Modal RDV */}
      {appointmentOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Demander une visite de validation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Choisissez une date pour la visite physique avec l'équipe d'administration.
            </p>
            <div className="space-y-3">
              <input
                type="datetime-local"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
              <textarea
                value={appointmentNotes}
                onChange={(e) => setAppointmentNotes(e.target.value)}
                placeholder="Notes (optionnel)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setAppointmentOpen(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={submitAppointment}
                className="btn-primary"
                disabled={!appointmentDate || updating}
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

