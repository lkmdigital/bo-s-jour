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
import { MapPin, Star, Users, Bed, Bath, Clock, CheckCircle, XCircle, EyeOff, Wrench, Edit, Trash2, Calendar, ExternalLink, Wifi, Car, Waves, Snowflake, Coffee, Utensils, Dumbbell, PawPrint, CreditCard, ShieldCheck, Lock, CigaretteOff, LogIn as LogInIcon, LogOut as LogOutIcon, ArrowLeft } from 'lucide-react';
import AccommodationGallery from '@/components/accommodation/AccommodationGallery';
import { PromoBadge, VerifiedBadge } from '@/components/ui';
import PropertyCard, { PropertyCardData } from '@/components/home/PropertyCard';
import ResultsMap, { MapItem } from '@/components/accommodations/ResultsMap';
import HorizontalScrollCarousel from '@/components/common/HorizontalScrollCarousel';
import { StaggerContainer, StaggerItem } from '@/components/common/animations';
import RoomsList from '@/components/accommodation/RoomsList';
import BookingSidebar, { PriceQuote } from '@/components/accommodation/BookingSidebar';
import ReviewsSection from '@/components/accommodation/ReviewsSection';
import AccommodationTabs from '@/components/accommodation/AccommodationTabs';
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
      staff?: number;
      cleanliness?: number;
      comfort?: number;
      breakfast?: number;
      wifi?: number;
      accessibility?: number;
      shuttle?: number;
      activities?: number;
      value_for_money?: number;
      restaurant?: number;
    };
    user: { name: string; avatar?: string | null };
    created_at: string;
    admin_reply?: string | null;
  }>;
  rooms?: Room[];
  // Optionnel : certains établissements peuvent être mis en avant comme promotion
  is_featured?: boolean;
  // Politiques & paiement (brief voyageur)
  cancellation_policy_hours?: number | null;
  deposit_required?: boolean;
  deposit_amount?: 'first_night' | 'percentage' | 'fixed' | null;
  deposit_percentage?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  smoking_area?: boolean | null;
  pets_allowed?: boolean | null;
}

/* ---- Helpers d'affichage (services / politiques / paiement) ---- */
const AMENITY_ICONS: Record<string, typeof Wifi> = {
  wifi: Wifi, 'wi-fi': Wifi, parking: Car, piscine: Waves, pool: Waves,
  climatisation: Snowflake, clim: Snowflake, 'petit-déjeuner': Coffee, 'petit déjeuner': Coffee,
  breakfast: Coffee, restaurant: Utensils, 'salle de sport': Dumbbell, sport: Dumbbell, gym: Dumbbell,
  'animaux acceptés': PawPrint, animaux: PawPrint,
};
function amenityIcon(name: string) {
  return AMENITY_ICONS[name.toLowerCase().trim()] || CheckCircle;
}
function cancellationPolicy(hours?: number | null) {
  const h = typeof hours === 'number' ? hours : 48;
  if (h === 0) return { label: 'Stricte', color: 'text-[#EE233C]', bg: 'bg-red-50 dark:bg-red-900/20', desc: "Réservation non remboursable. Aucune annulation gratuite." };
  if (h <= 24) return { label: 'Modérée', color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20', desc: `Annulation gratuite jusqu'à ${h}h avant l'arrivée. Passé ce délai : 50 % conservé, 50 % en avoir.` };
  return { label: 'Flexible', color: 'text-green-700', bg: 'bg-green-50 dark:bg-green-900/20', desc: `Annulation gratuite jusqu'à ${h}h avant l'arrivée. Ensuite, l'acompte est transformé en avoir.` };
}
function paymentMode(acc: Accommodation) {
  if (acc.deposit_required === false) {
    return { title: 'Paiement intégral', desc: 'Le montant total du séjour est réglé en ligne au moment de la réservation.' };
  }
  const amt = acc.deposit_amount;
  const desc =
    amt === 'percentage'
      ? `Un acompte de ${acc.deposit_percentage ?? ''} % est réglé en ligne ; le solde directement à l'établissement.`
      : amt === 'fixed'
      ? "Un acompte fixe est réglé en ligne ; le solde directement à l'établissement."
      : "Un acompte correspondant à la première nuitée est réglé en ligne ; le solde à l'arrivée.";
  return { title: 'Réservation garantie par acompte', desc };
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
  const [priceQuote, setPriceQuote] = useState<(PriceQuote & { variants: PricingVariantsData }) | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [mapCfg, setMapCfg] = useState<{ provider: string; token: string }>({ provider: 'osm', token: '' });
  const [descExpanded, setDescExpanded] = useState(false);
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);
  const urlCheckIn = searchParams?.get('check_in');
  const urlCheckOut = searchParams?.get('check_out');
  const urlGuests = searchParams?.get('guests');
  const storedOrUrlCheckIn = urlCheckIn || session?.checkIn;
  const storedOrUrlCheckOut = urlCheckOut || session?.checkOut;
  const storedOrUrlGuests = urlGuests ? parseInt(urlGuests, 10) : (session?.guests ?? 1);

  // Retour à la recherche : on reconstruit les filtres depuis la session mémorisée
  // (SearchInputWithAutocomplete/HeroSection) pour retomber sur les mêmes résultats.
  const backToResultsHref = (() => {
    const qs = new URLSearchParams();
    if (session?.search) qs.set('search', session.search);
    if (session?.city) qs.set('city', session.city);
    if (session?.checkIn) qs.set('checkIn', session.checkIn);
    if (session?.checkOut) qs.set('checkOut', session.checkOut);
    if (session?.guests) qs.set('guests', String(session.guests));
    if (session?.type) qs.set('type', session.type);
    const query = qs.toString();
    return query ? `/accommodations?${query}` : '/accommodations';
  })();

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
    api.get('/settings/public')
      .then((r) => setMapCfg({ provider: r.data?.maps_provider || 'osm', token: r.data?.mapbox_token || '' }))
      .catch(() => {});
  }, []);

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

  // Aperçu tarifaire (plans tarifaires + encart réservation) : utilise les dates
  // sélectionnées par le voyageur si disponibles, sinon une fenêtre indicative (J+1/J+2)
  useEffect(() => {
    if (!accommodation?.id) return;
    let cancelled = false;
    setLoadingPricing(true);
    let checkIn: string;
    let checkOut: string;
    if (selectedDates.checkIn && selectedDates.checkOut) {
      checkIn = selectedDates.checkIn.toISOString().split('T')[0];
      checkOut = selectedDates.checkOut.toISOString().split('T')[0];
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      checkIn = tomorrow.toISOString().split('T')[0];
      checkOut = dayAfter.toISOString().split('T')[0];
    }
    api
      .get(`/accommodations/${accommodation.id}/price-preview?check_in=${checkIn}&check_out=${checkOut}`)
      .then((res) => {
        if (!cancelled) setPriceQuote(res.data);
      })
      .catch(() => {
        if (!cancelled) setPriceQuote(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPricing(false);
      });
    return () => { cancelled = true; };
  }, [accommodation?.id, selectedDates.checkIn?.getTime(), selectedDates.checkOut?.getTime()]);

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
        <div className="max-w-6xl mx-auto space-y-6">
          <Link
            href={backToResultsHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux résultats
          </Link>

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

            {/* En-tête */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <VerifiedBadge />
                {accommodation.is_featured && <PromoBadge>Promo</PromoBadge>}
                {isHost && accommodation.status && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${statusLabels[currentStatus as keyof typeof statusLabels]?.color || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusLabels[currentStatus as keyof typeof statusLabels]?.label || currentStatus}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{accommodation.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  {accommodation.city}{accommodation.address ? `, ${accommodation.address}` : ''}
                </span>
                {accommodation.rating && typeof accommodation.rating === 'number' && accommodation.rating > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#F7C948] text-[#F7C948]" />
                    <span className="font-semibold text-gray-900 dark:text-white">{Number(accommodation.rating).toFixed(1)}</span>
                    <span className="text-gray-400">({accommodation.total_reviews || 0} avis)</span>
                  </span>
                )}
              </div>
            </div>

            <AccommodationTabs
              tabs={[
                { id: 'apercu', label: 'Aperçu' },
                { id: 'commodites', label: 'Commodités' },
                { id: 'emplacement', label: 'Emplacement' },
                { id: 'chambres', label: 'Chambres' },
                { id: 'avis', label: 'Avis' },
              ]}
            />

            {/* Galerie */}
            <AccommodationGallery images={accommodation.images || []} name={accommodation.name} accommodationId={accommodation.id} />

            {/* Bandeau confiance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300">Confirmation instantanée par <strong>E-mail + WhatsApp</strong></p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <Lock className="w-6 h-6 text-primary flex-shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300">Paiement sécurisé — <strong>remboursement 24h</strong> si l'établissement refuse</p>
              </div>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

            <div id="apercu" className="card scroll-mt-40">
              <h2 className="text-2xl font-bold mb-4">Descriptif</h2>
              {(accommodation.bedrooms > 0 || accommodation.max_guests > 0) && (
                <p className="font-semibold text-gray-900 dark:text-white mb-3">
                  {accommodation.bedrooms > 0 && `${accommodation.bedrooms} chambre${accommodation.bedrooms > 1 ? 's' : ''}`}
                  {accommodation.max_guests > 0 && `${accommodation.bedrooms > 0 ? ' · ' : ''}jusqu'à ${accommodation.max_guests} voyageur${accommodation.max_guests > 1 ? 's' : ''}`}
                </p>
              )}
              <p className={`text-gray-700 dark:text-gray-300 whitespace-pre-line ${!descExpanded ? 'line-clamp-4' : ''}`}>
                {accommodation.description}
              </p>
              {accommodation.description && accommodation.description.length > 220 && (
                <button onClick={() => setDescExpanded((v) => !v)} className="btn-outline mt-4 text-sm">
                  {descExpanded ? 'Afficher moins' : 'Afficher plus'}
                </button>
              )}
            </div>

            <div id="commodites" className="card scroll-mt-40">
              <h2 className="text-2xl font-bold mb-4">Commodités</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(amenitiesExpanded ? accommodation.amenities : accommodation.amenities?.slice(0, 6))?.map((amenity, index) => {
                  const Icon = amenityIcon(amenity);
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                      </span>
                      <span className="capitalize text-gray-800 dark:text-gray-200">{amenity}</span>
                    </div>
                  );
                })}
              </div>
              {accommodation.amenities && accommodation.amenities.length > 6 && (
                <button onClick={() => setAmenitiesExpanded((v) => !v)} className="btn-outline mt-4 text-sm">
                  {amenitiesExpanded ? 'Afficher moins' : `Afficher les ${accommodation.amenities.length} équipements`}
                </button>
              )}
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

            {/* Politiques, paiement & horaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Politique d'annulation */}
              {(() => { const p = cancellationPolicy(accommodation.cancellation_policy_hours); return (
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className={`w-5 h-5 ${p.color}`} />
                    <h3 className="font-bold text-gray-900 dark:text-white">Politique d'annulation</h3>
                    <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${p.bg} ${p.color}`}>{p.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{p.desc}</p>
                </div>
              ); })()}

              {/* Mode de paiement */}
              {(() => { const m = paymentMode(accommodation); return (
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-gray-900 dark:text-white">Mode de paiement</h3>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{m.desc}</p>
                  <p className="text-xs text-gray-500 mt-2">Visa · Mastercard · Djamo · Wave · Orange Money · MTN · Moov</p>
                </div>
              ); })()}

              {/* Horaires */}
              <div className="card md:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Horaires</h3>
                </div>
                <div className="flex flex-wrap gap-8 text-sm">
                  <div className="flex items-center gap-2">
                    <LogInIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Arrivée</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{(accommodation.check_in_time || '14:00').slice(0, 5)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LogOutIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Départ</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{(accommodation.check_out_time || '12:00').slice(0, 5)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Plans tarifaires (variantes selon politique d'annulation et durée) */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Plans tarifaires</h2>
              {loadingPricing ? (
                <p className="text-gray-600 dark:text-gray-400">Chargement des tarifs...</p>
              ) : priceQuote?.variants ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <span className="font-medium text-gray-900 dark:text-white">{priceQuote.variants.base.label}</span>
                    <span className="text-primary font-semibold">{formatPrice(priceQuote.variants.base.price_per_night)} FCFA / nuit</span>
                  </div>
                  {priceQuote.variants.enabled && (
                    <>
                      {priceQuote.variants.non_refundable && (
                        <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-gray-700 dark:text-gray-300">{priceQuote.variants.non_refundable.label}</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatPrice(priceQuote.variants.non_refundable.price_per_night)} FCFA / nuit
                            {priceQuote.variants.non_refundable.adjustment_label && (
                              <span className="text-sm text-green-600 dark:text-green-400 ml-1">({priceQuote.variants.non_refundable.adjustment_label})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {priceQuote.variants.modifiable && (
                        <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-gray-700 dark:text-gray-300">{priceQuote.variants.modifiable.label}</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatPrice(priceQuote.variants.modifiable.price_per_night)} FCFA / nuit
                            {priceQuote.variants.modifiable.adjustment_label && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">({priceQuote.variants.modifiable.adjustment_label})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {priceQuote.variants.long_stay && (
                        <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-gray-700 dark:text-gray-300">{priceQuote.variants.long_stay.label}</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatPrice(priceQuote.variants.long_stay.price_per_night)} FCFA / nuit
                            {priceQuote.variants.long_stay.adjustment_label && (
                              <span className="text-sm text-green-600 dark:text-green-400 ml-1">({priceQuote.variants.long_stay.adjustment_label})</span>
                            )}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {!priceQuote.variants.enabled && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tarif unique appliqué à toutes les réservations.</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">À partir de {formatPrice(accommodation.price_per_night)} FCFA / nuit</p>
              )}
            </div>

            {/* Chambres (dates sélectionnées depuis l'encart de réservation) */}
            <div id="chambres" className="space-y-6 scroll-mt-40">
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
              <div id="emplacement" className="card scroll-mt-40">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-4">
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
                  <ResultsMap
                    items={[{
                      id: accommodation.id,
                      title: accommodation.name,
                      price: accommodation.price_per_night,
                      lat: finalLat,
                      lng: finalLng,
                    } satisfies MapItem]}
                    provider={mapCfg.provider}
                    mapboxToken={mapCfg.token}
                    className="!h-64 lg:!h-full"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                  Les coordonnées affichées sont approximatives et servent uniquement à guider les voyageurs.
                </p>
              </div>
            )}

            <ReviewsSection
              id="avis"
              reviews={accommodation.reviews}
              averageRating={accommodation.rating}
              totalReviews={accommodation.total_reviews}
              isAuthenticated={isAuthenticated}
            />

            {/* Politiques */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Politiques</h2>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
                  <div className="flex items-center gap-3 font-semibold text-gray-900 dark:text-white">
                    <LogInIcon className="w-5 h-5 text-primary" />
                    Enregistrement
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
                    À partir de {(accommodation.check_in_time || '14:00').slice(0, 5)}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 font-semibold text-gray-900 dark:text-white">
                    <LogOutIcon className="w-5 h-5 text-primary" />
                    Départ
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
                    Avant {(accommodation.check_out_time || '12:00').slice(0, 5)}
                  </p>
                </div>
                {(() => { const p = cancellationPolicy(accommodation.cancellation_policy_hours); return (
                  <div className="flex items-start justify-between gap-4 py-4">
                    <div className="flex items-center gap-3 font-semibold text-gray-900 dark:text-white">
                      <XCircle className="w-5 h-5 text-primary" />
                      Annulation/paiement anticipé
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-right max-w-sm">{p.desc}</p>
                  </div>
                ); })()}
                {accommodation.smoking_area != null && (
                  <div className="flex items-start justify-between gap-4 py-4">
                    <div className="flex items-center gap-3 font-semibold text-gray-900 dark:text-white">
                      <CigaretteOff className="w-5 h-5 text-primary" />
                      Fumer
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
                      {accommodation.smoking_area ? 'Un espace fumeur est disponible.' : "Il est interdit de fumer."}
                    </p>
                  </div>
                )}
                {accommodation.pets_allowed != null && (
                  <div className="flex items-start justify-between gap-4 py-4 last:pb-0">
                    <div className="flex items-center gap-3 font-semibold text-gray-900 dark:text-white">
                      <PawPrint className="w-5 h-5 text-primary" />
                      Animaux de compagnie
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
                      {accommodation.pets_allowed ? 'Les animaux sont autorisés.' : 'Les animaux ne sont pas autorisés.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

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
                  {similarAccommodations.map((similarAcc) => {
                    const primary = similarAcc.images?.find((img) => img.is_primary)?.url || similarAcc.images?.[0]?.url || '';
                    // rating/total_reviews arrivent parfois en string depuis l'API (cast decimal Laravel)
                    const numericRating = similarAcc.rating != null ? Number(similarAcc.rating) : undefined;
                    const cardData: PropertyCardData = {
                      id: similarAcc.id,
                      title: similarAcc.name,
                      location: similarAcc.city,
                      image: primary,
                      rating: numericRating && numericRating > 0 ? numericRating : undefined,
                      reviews: similarAcc.total_reviews != null ? Number(similarAcc.total_reviews) : undefined,
                      price: similarAcc.price_per_night,
                    };
                    return <PropertyCard key={similarAcc.id} data={cardData} />;
                  })}
                </HorizontalScrollCarousel>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    Aucun autre établissement disponible dans cette ville pour le moment.
                  </p>
                </div>
              )}
            </div>
            </div>

            <div className="lg:col-span-1">
              <BookingSidebar
                accommodationId={accommodation.id}
                priceRangeMin={allRooms.length > 0 ? Math.min(...allRooms.map((r) => r.price_per_night)) : accommodation.price_per_night}
                priceRangeMax={allRooms.length > 0 ? Math.max(...allRooms.map((r) => r.price_per_night)) : accommodation.price_per_night}
                selectedDates={selectedDates}
                onDatesSelected={handleDatesSelected}
                priceQuote={priceQuote}
                loadingQuote={loadingPricing}
              />
            </div>
          </div>
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

