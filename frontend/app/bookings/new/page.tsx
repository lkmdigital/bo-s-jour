'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useSearchStore } from '@/stores/searchStore';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import EnhancedBookingForm from '@/components/booking/EnhancedBookingForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

interface Accommodation {
  id: number;
  name: string;
  price_per_night: number;
  room_type_pricing?: Array<{
    type: string;
    price_per_night: number;
    rooms_available?: number | null;
  }>;
}

interface Room {
  id: number;
  accommodation_id: number;
  name: string;
  price_per_night: number;
}

function NewBookingContent() {
  const searchParams = useSearchParams();
  const { session } = useSearchStore();
  const accommodationId = searchParams?.get('accommodation');
  const roomId = searchParams?.get('room');
  const initialCheckIn = searchParams?.get('check_in') || session?.checkIn || undefined;
  const initialCheckOut = searchParams?.get('check_out') || session?.checkOut || undefined;
  const initialGuests = searchParams?.get('guests') ? parseInt(searchParams.get('guests')!, 10) : (session?.guests ?? undefined);
  
  const [accommodation, setAccommodation] = useState<Accommodation | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoom, setLoadingRoom] = useState(!!roomId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accommodationId) {
      fetchAccommodation();
    }
    if (roomId) {
      fetchRoom();
    }
  }, [accommodationId, roomId]);

  const fetchAccommodation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/accommodations/${accommodationId}`);
      setAccommodation(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement de l\'hébergement');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoom = async () => {
    try {
      const response = await api.get(`/rooms/${roomId}`);
      setRoom(response.data);
      // Si la chambre est chargée, utiliser son accommodation_id
      if (response.data.accommodation_id && !accommodationId) {
        const accResponse = await api.get(`/accommodations/${response.data.accommodation_id}`);
        setAccommodation(accResponse.data);
      }
    } catch (err: any) {
      console.error('Error fetching room:', err);
    } finally {
      setLoadingRoom(false);
    }
  };

  if (loading || loadingRoom) {
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

  if (error || !accommodation) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow container mx-auto px-4 py-12">
          <ErrorDisplay error={error || 'Hébergement introuvable'} />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Nouvelle réservation</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {accommodation.name}
            {room && <span> • {room.name}</span>}
          </p>

          <div className="max-w-4xl mx-auto">
            <EnhancedBookingForm
              accommodationId={accommodation.id}
              pricePerNight={room?.price_per_night || accommodation.price_per_night}
              roomTypePricing={accommodation.room_type_pricing}
              preSelectedRoomId={room?.id}
              initialCheckIn={initialCheckIn}
              initialCheckOut={initialCheckOut}
              initialGuests={initialGuests}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function NewBookingPage() {
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
      <NewBookingContent />
    </Suspense>
  );
}
