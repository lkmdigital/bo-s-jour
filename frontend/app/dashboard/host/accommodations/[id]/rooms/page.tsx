'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import api from '@/lib/api';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, CalendarDays } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface Room {
  id: number;
  name: string;
  type: string;
  description?: string;
  capacity: number;
  price_per_night: number;
  bedrooms: number;
  bathrooms: number;
  is_active: boolean;
  images?: any[];
  primaryImage?: any;
}

export default function AccommodationRoomsPage() {
  const router = useRouter();
  const params = useParams();
  const accommodationId = params.id as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [accommodation, setAccommodation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const confirmAction = useConfirm();
  const { showError, showWarning } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user || user.role !== 'host') {
      router.push('/auth/login');
      return;
    }
    fetchData();
  }, [authLoading, isAuthenticated, user, accommodationId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, accomRes] = await Promise.all([
        api.get(`/accommodations/${accommodationId}/rooms/manage`),
        api.get(`/accommodations/${accommodationId}`),
      ]);
      
      setRooms(roomsRes.data);
      setAccommodation(accomRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (roomId: number) => {
    const ok = await confirmAction({
      title: 'Supprimer la chambre',
      message: 'Êtes-vous sûr de vouloir supprimer cette chambre ?',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/accommodations/${accommodationId}/rooms/${roomId}`);
      setRooms(rooms.filter((r) => r.id !== roomId));
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const toggleActive = async (room: Room) => {
    if (!room.images || room.images.length < 3) {
      showWarning('La chambre doit avoir au moins 3 images pour être activée');
      return;
    }

    try {
      await api.put(`/accommodations/${accommodationId}/rooms/${room.id}`, {
        is_active: !room.is_active,
      });
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la mise à jour');
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
            href={`/dashboard/host/accommodations/${accommodationId}/edit`}
            className="text-primary hover:underline"
          >
            ← Retour à l'établissement
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Gestion des chambres</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {accommodation?.name}
            </p>
          </div>
          <Link
            href={`/dashboard/host/accommodations/${accommodationId}/rooms/new`}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter une chambre
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Aucune chambre n'a été ajoutée pour le moment
            </p>
            <Link
              href={`/dashboard/host/accommodations/${accommodationId}/rooms/new`}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter votre première chambre
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="card">
                {/* Image */}
                <div className="relative h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                  {room.primaryImage ? (
                    <img
                      src={room.primaryImage.full_url}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Statut */}
                  <div className="absolute top-2 right-2">
                    {room.is_active ? (
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                        Active
                      </span>
                    ) : (
                      <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  {/* Nombre d'images */}
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {room.images?.length || 0} / 3 min
                    </span>
                  </div>
                </div>

                {/* Infos */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1">{room.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {room.type}
                  </p>
                  <p className="text-xl font-bold text-primary mb-4">
                    {formatPrice(room.price_per_night)} FCFA/nuit
                  </p>

                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <p>Capacité: {room.capacity} personnes</p>
                    <p>Chambres: {room.bedrooms} | Salles de bain: {room.bathrooms}</p>
                  </div>

                  {!room.is_active && room.images && room.images.length < 3 && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 p-2 rounded text-xs mb-4">
                      Ajoutez au moins 3 images pour activer cette chambre
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Link
                      href={`/dashboard/host/accommodations/${accommodationId}/rooms/${room.id}/calendar`}
                      className="flex-1 btn-secondary text-center flex items-center justify-center gap-1 text-sm"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Calendrier
                    </Link>
                    <Link
                      href={`/dashboard/host/accommodations/${accommodationId}/rooms/${room.id}/images`}
                      className="flex-1 btn-secondary text-center flex items-center justify-center gap-1 text-sm"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Images
                    </Link>
                    <Link
                      href={`/dashboard/host/accommodations/${accommodationId}/rooms/${room.id}/edit`}
                      className="flex-1 btn-secondary text-center flex items-center justify-center gap-1 text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </Link>
                    <button
                      onClick={() => toggleActive(room)}
                      className="btn-secondary flex items-center justify-center text-sm px-3"
                      disabled={!room.is_active && (!room.images || room.images.length < 3)}
                      title={room.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {room.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="btn-danger flex items-center justify-center text-sm px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
