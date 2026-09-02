'use client';

import Image from 'next/image';
import { formatPrice, toDateInputValue, getRoomCategoryLabel } from '@/lib/utils';
import { Bed, Users, Expand, Image as ImageIcon, CheckCircle, XCircle, Calendar, Wifi, Coffee, Eye, Wind } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { differenceInDays } from 'date-fns';

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
  name: string;
  name_en?: string;
  type: string;
  description?: string;
  capacity: number;
  price_per_night: number;
  bedrooms: number;
  bathrooms: number;
  surface_area?: number;
  amenities?: string[];
  basic_amenities?: string[];
  is_active: boolean;
  is_available?: boolean; // Disponibilité pour les dates sélectionnées
  quantity?: number; // Nombre total de chambres de ce type
  available_quantity?: number; // Nombre de chambres disponibles pour les dates sélectionnées
  images?: RoomImage[];
  primary_image_url?: string;
  room_category?: string;
  room_subcategory?: string;
  view_type?: string;
}

interface RoomsListProps {
  rooms: Room[];
  onSelectRoom?: (room: Room) => void;
  checkIn?: Date | null;
  checkOut?: Date | null;
  guests?: number;
}

const AMENITY_ICON: Record<string, typeof Wifi> = {
  wifi: Wifi, 'wi-fi': Wifi, 'wifi gratuit': Wifi,
  climatisation: Wind, clim: Wind, climatiseur: Wind,
  breakfast: Coffee, 'petit-déjeuner': Coffee, 'petit déjeuner': Coffee,
};

export default function RoomsList({ rooms, onSelectRoom, checkIn: propCheckIn, checkOut: propCheckOut, guests }: RoomsListProps) {
  const searchParams = useSearchParams();
  const urlCheckIn = searchParams?.get('check_in');
  const urlCheckOut = searchParams?.get('check_out');
  const [bedroomFilter, setBedroomFilter] = useState<number | null>(null);

  // Utiliser les props en priorité, sinon les paramètres URL
  const checkInStr = propCheckIn ? toDateInputValue(propCheckIn) : urlCheckIn;
  const checkOutStr = propCheckOut ? toDateInputValue(propCheckOut) : urlCheckOut;
  const nights = propCheckIn && propCheckOut ? differenceInDays(propCheckOut, propCheckIn) : 0;

  const bedroomCounts = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.bedrooms))).filter((n) => n > 0).sort((a, b) => a - b),
    [rooms]
  );
  const filteredRooms = bedroomFilter ? rooms.filter((r) => r.bedrooms === bedroomFilter) : rooms;

  if (!rooms || rooms.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune chambre disponible pour le moment.
      </div>
    );
  }

  const handleRoomClick = (room: Room) => {
    if (onSelectRoom) {
      onSelectRoom(room);
    } else {
      const params = new URLSearchParams();
      if (checkInStr) params.set('check_in', checkInStr);
      if (checkOutStr) params.set('check_out', checkOutStr);
      if (guests != null && guests > 0) params.set('guests', String(guests));
      const queryString = params.toString();
      window.location.href = `/rooms/${room.id}${queryString ? `?${queryString}` : ''}`;
    }
  };

  const getCategoryLabel = getRoomCategoryLabel;

  const getViewLabel = (view?: string) => {
    const labels: Record<string, string> = {
      city: 'Vue ville', garden: 'Vue jardin', pool: 'Vue piscine',
      sea: 'Vue mer', mountain: 'Vue montagne', parking: 'Vue parking',
    };
    return view ? labels[view] || '' : '';
  };

  return (
    <div className="space-y-4">
      {checkInStr && checkOutStr && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              Disponibilité vérifiée pour : <strong>{new Date(checkInStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> - <strong>{new Date(checkOutStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </span>
          </p>
        </div>
      )}

      {!checkInStr && !checkOutStr && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 <strong>Astuce :</strong> Sélectionnez vos dates dans l&apos;encart de réservation pour vérifier la disponibilité et les prix exacts.
          </p>
        </div>
      )}

      {bedroomCounts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBedroomFilter(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              bedroomFilter === null
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
            }`}
          >
            Toutes les chambres
          </button>
          {bedroomCounts.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBedroomFilter(n)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                bedroomFilter === n
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
              }`}
            >
              {n} chambre{n > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {filteredRooms.map((room) => {
          const primaryImage = room.images?.find((img) => img.is_primary);
          const imageUrl = primaryImage?.full_url || room.primary_image_url || room.images?.[0]?.full_url;
          const isAvailable = checkInStr && checkOutStr ? room.is_available !== false : true;
          const total = nights > 0 ? room.price_per_night * nights : null;
          const amenityList = (room.basic_amenities || room.amenities || []).slice(0, 3);

          return (
            <div
              key={room.id}
              className={`flex flex-col sm:flex-row gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 transition-shadow hover:shadow-lg ${
                !isAvailable ? 'opacity-60' : ''
              }`}
            >
              {/* Image */}
              <button
                type="button"
                onClick={() => isAvailable && handleRoomClick(room)}
                className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700"
              >
                {imageUrl ? (
                  <>
                    <Image src={imageUrl} alt={room.name} fill className={`object-cover ${!isAvailable ? 'grayscale' : ''}`} />
                    {room.images && room.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {room.images.length}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bed className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </button>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {room.name}
                      {room.room_category && (
                        <span className="ml-2 text-xs font-normal text-primary">{getCategoryLabel(room.room_category)}</span>
                      )}
                    </h3>
                    {checkInStr && checkOutStr && room.is_available !== undefined && (
                      <span className={`inline-flex items-center gap-1 mt-1 text-xs font-medium ${isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                        {isAvailable ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {isAvailable
                          ? room.quantity && room.quantity > 1 && room.available_quantity !== undefined
                            ? `${room.available_quantity}/${room.quantity} disponibles`
                            : 'Disponible'
                          : 'Complet'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> {room.bedrooms}</span>
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {room.capacity} pers.</span>
                  {room.surface_area && (
                    <span className="flex items-center gap-1"><Expand className="w-4 h-4" /> {room.surface_area} m²</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {amenityList.map((a, i) => {
                    const Icon = AMENITY_ICON[a.toLowerCase().trim()] || CheckCircle;
                    return (
                      <span key={i} className="flex items-center gap-1 capitalize">
                        <Icon className="w-3.5 h-3.5" /> {a}
                      </span>
                    );
                  })}
                  {room.view_type && (
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {getViewLabel(room.view_type)}</span>
                  )}
                </div>
              </div>

              {/* Prix + CTA */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:w-44 flex-shrink-0 sm:border-l sm:border-gray-200 dark:sm:border-gray-700 sm:pl-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(room.price_per_night)} fcfa</p>
                  <p className="text-xs text-gray-500">par nuit</p>
                  {total != null && (
                    <p className="text-xs text-gray-500 mt-1">
                      x {nights} nuit{nights > 1 ? 's' : ''}<br />
                      <span className="text-gray-600 dark:text-gray-400">Prix total : </span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(total)} fcfa</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => isAvailable && handleRoomClick(room)}
                    disabled={!isAvailable}
                    className={isAvailable ? 'btn-primary text-sm py-2 px-5' : 'bg-gray-300 dark:bg-gray-600 text-gray-500 text-sm py-2 px-5 rounded-full cursor-not-allowed'}
                  >
                    {isAvailable ? 'Réserver' : 'Indisponible'}
                  </button>
                  {isAvailable && (
                    <button
                      type="button"
                      onClick={() => handleRoomClick(room)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Plus de détails
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
