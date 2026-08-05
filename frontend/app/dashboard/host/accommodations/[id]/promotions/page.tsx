'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit, Trash2, Calendar, Percent, Tag, Power, PowerOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Promotion {
  id: number;
  accommodation_id: number;
  room_id: number | null;
  discount_percent: number;
  start_date: string;
  end_date: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  room?: {
    id: number;
    name: string;
    type: string;
  } | null;
}

interface Room {
  id: number;
  name: string;
  type: string;
}

export default function AccommodationPromotionsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [accommodation, setAccommodation] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const confirmAction = useConfirm();

  const [formData, setFormData] = useState({
    room_id: '',
    discount_percent: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'host' && params.id) {
      fetchData();
    }
  }, [isAuthenticated, user, params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [promotionsRes, roomsRes, accRes] = await Promise.all([
        api.get(`/accommodations/${params.id}/promotions`),
        api.get(`/accommodations/${params.id}/rooms/manage`),
        api.get(`/accommodations/${params.id}`),
      ]);

      setPromotions(promotionsRes.data || []);
      setRooms(roomsRes.data || []);
      setAccommodation({ id: accRes.data.id, name: accRes.data.name });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.discount_percent || !formData.start_date || !formData.end_date) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    if (parseFloat(formData.discount_percent) < 1 || parseFloat(formData.discount_percent) > 100) {
      setError('Le pourcentage de réduction doit être entre 1% et 100%');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        room_id: formData.room_id || null,
        discount_percent: parseFloat(formData.discount_percent),
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description || null,
      };

      if (editingPromotion) {
        await api.put(`/accommodations/${params.id}/promotions/${editingPromotion.id}`, payload);
      } else {
        await api.post(`/accommodations/${params.id}/promotions`, payload);
      }

      await fetchData();
      setShowForm(false);
      setEditingPromotion(null);
      setFormData({
        room_id: '',
        discount_percent: '',
        start_date: '',
        end_date: '',
        description: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde de la promotion');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      room_id: promotion.room_id?.toString() || '',
      discount_percent: promotion.discount_percent.toString(),
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      description: promotion.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (promotionId: number) => {
    const ok = await confirmAction({
      title: 'Supprimer la promotion',
      message: 'Êtes-vous sûr de vouloir supprimer cette promotion ?',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/accommodations/${params.id}/promotions/${promotionId}`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggle = async (promotionId: number) => {
    try {
      await api.post(`/accommodations/${params.id}/promotions/${promotionId}/toggle`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const isPromotionActive = (promotion: Promotion) => {
    if (!promotion.is_active) return false;
    const today = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);
    return today >= start && today <= end;
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'host') {
    return null;
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link
            href={`/dashboard/host/accommodations/${params.id}/edit`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'édition
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestion des promotions</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {accommodation?.name}
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingPromotion(null);
                setFormData({
                  room_id: '',
                  discount_percent: '',
                  start_date: '',
                  end_date: '',
                  description: '',
                });
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {showForm ? 'Annuler' : 'Nouvelle promotion'}
            </button>
          </div>
        </div>

        {error && (
          <ErrorDisplay error={error} onDismiss={() => setError(null)} />
        )}

        {/* Formulaire de création/édition */}
        {showForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingPromotion ? 'Modifier la promotion' : 'Créer une nouvelle promotion'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Chambre (optionnel)
                  </label>
                  <select
                    value={formData.room_id}
                    onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                  >
                    <option value="">Toutes les chambres</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} ({room.type})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Si aucune chambre n'est sélectionnée, la promotion s'applique à toutes les chambres
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Pourcentage de réduction *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.01"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                      placeholder="15"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                  placeholder="Ex: Promotion spéciale été, réduction exceptionnelle..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : editingPromotion ? 'Modifier' : 'Créer la promotion'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPromotion(null);
                    setFormData({
                      room_id: '',
                      discount_percent: '',
                      start_date: '',
                      end_date: '',
                      description: '',
                    });
                  }}
                  className="btn-outline"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des promotions */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Promotions actives et à venir</h2>
          {promotions.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Aucune promotion créée pour cet établissement
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Créer votre première promotion
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {promotions.map((promotion) => {
                const isActive = isPromotionActive(promotion);
                const isPast = new Date(promotion.end_date) < new Date();
                const isFuture = new Date(promotion.start_date) > new Date();

                return (
                  <div
                    key={promotion.id}
                    className={`p-4 border-2 rounded-lg ${
                      isActive
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : isPast
                        ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'
                        : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${
                            isActive
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                              : isPast
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                          }`}>
                            <Percent className="w-4 h-4" />
                            {promotion.discount_percent}% de réduction
                          </div>
                          {!promotion.is_active && (
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                              Désactivée
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {promotion.room ? (
                                <>Chambre: <strong>{promotion.room.name}</strong> ({promotion.room.type})</>
                              ) : (
                                <strong>Toutes les chambres</strong>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700 dark:text-gray-300">
                              Du <strong>{format(new Date(promotion.start_date), 'dd MMMM yyyy', { locale: fr })}</strong> au{' '}
                              <strong>{format(new Date(promotion.end_date), 'dd MMMM yyyy', { locale: fr })}</strong>
                            </span>
                          </div>

                          {promotion.description && (
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                              {promotion.description}
                            </p>
                          )}

                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            Créée le {format(new Date(promotion.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleToggle(promotion.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            promotion.is_active
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                          title={promotion.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {promotion.is_active ? (
                            <Power className="w-5 h-5" />
                          ) : (
                            <PowerOff className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(promotion)}
                          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(promotion.id)}
                          className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}







