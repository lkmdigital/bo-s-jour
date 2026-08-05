'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit, Trash2, Mail, Phone, UserCog, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StaffMember {
  id: number;
  accommodation_id: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export default function AccommodationStaffPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [accommodation, setAccommodation] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);
  const confirmAction = useConfirm();

  const emptyForm = { name: '', role: '', email: '', phone: '', status: 'active' as 'active' | 'inactive' };
  const [formData, setFormData] = useState(emptyForm);

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

      const [staffRes, accRes] = await Promise.all([
        api.get(`/accommodations/${params.id}/staff`),
        api.get(`/accommodations/${params.id}`),
      ]);

      setStaff(staffRes.data || []);
      setAccommodation({ id: accRes.data.id, name: accRes.data.name });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.role) {
      setError('Veuillez remplir les champs obligatoires (nom et poste)');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        role: formData.role,
        email: formData.email || null,
        phone: formData.phone || null,
        status: formData.status,
      };

      if (editingStaff) {
        await api.put(`/accommodations/${params.id}/staff/${editingStaff.id}`, payload);
      } else {
        await api.post(`/accommodations/${params.id}/staff`, payload);
      }

      await fetchData();
      setShowForm(false);
      setEditingStaff(null);
      setFormData(emptyForm);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde du membre du personnel");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      role: member.role,
      email: member.email || '',
      phone: member.phone || '',
      status: member.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (staffId: number) => {
    const ok = await confirmAction({
      title: 'Retirer ce membre',
      message: 'Êtes-vous sûr de vouloir retirer ce membre du personnel ?',
      confirmLabel: 'Retirer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/accommodations/${params.id}/staff/${staffId}`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
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
              <h1 className="text-3xl font-bold">Personnel</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {accommodation?.name}
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingStaff(null);
                setFormData(emptyForm);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {showForm ? 'Annuler' : 'Ajouter un membre'}
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
              {editingStaff ? 'Modifier le membre' : 'Ajouter un membre du personnel'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                    placeholder="Kofi Mensah"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Poste *
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                    placeholder="Réceptionniste"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                    placeholder="kofi@hotel.ci"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                    placeholder="+225 27 20 30 40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Statut
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : editingStaff ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingStaff(null);
                    setFormData(emptyForm);
                  }}
                  className="btn-outline"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste du personnel */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Équipe</h2>
          {staff.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Aucun membre du personnel enregistré pour cet établissement
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ajouter votre premier membre
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                        {member.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            <XCircle className="w-3 h-3" />
                            Inactif
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{member.role}</p>

                      <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {member.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            {member.email}
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            {member.phone}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Ajouté le {format(new Date(member.created_at), 'dd MMMM yyyy', { locale: fr })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(member)}
                        className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                        title="Retirer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
