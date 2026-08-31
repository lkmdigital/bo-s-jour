'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useValidation } from '@/components/common/ValidationContext';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { User, Phone, Calendar, MapPin, FileText, Upload, CheckCircle, AlertCircle, Save, Edit, Camera, X } from 'lucide-react';
import Image from 'next/image';

interface HostProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  phone_fixed?: string;
  whatsapp?: string;
  rccm?: string;
  tax_account_number?: string;
  avatar?: string;
  date_of_birth?: string;
  bio?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  id_type?: string;
  id_number?: string;
  id_document_path?: string;
  id_document_recto_path?: string;
  id_document_verso_path?: string;
  proof_of_address_path?: string;
  business_license_path?: string;
  rccm_document_path?: string;
  tax_document_path?: string;
  profile_completed: boolean;
  profile_verified: boolean;
  compliance_status?: 'conforme' | 'non_conforme';
  compliance_requirements?: Array<{
    key: string;
    label: string;
    ok?: boolean;
    info?: string;
  }>;
}

export default function HostProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completion, setCompletion] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [complianceData, setComplianceData] = useState<{
    status: 'conforme' | 'non_conforme' | null;
    requirements: HostProfile['compliance_requirements'];
  }>({ status: null, requirements: [] });
  const showValidation = useValidation();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    phone_fixed: '',
    whatsapp: '',
    date_of_birth: '',
    bio: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'Côte d\'Ivoire',
    id_type: '',
    id_number: '',
    rccm: '',
    tax_account_number: '',
  });

  const [files, setFiles] = useState({
    avatar: null as File | null,
    id_document: null as File | null,
    id_document_recto: null as File | null,
    id_document_verso: null as File | null,
    proof_of_address: null as File | null,
    business_license: null as File | null,
    rccm_document: null as File | null,
    tax_document: null as File | null,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'host') {
      fetchProfile();
    }
  }, [isAuthenticated, user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/host/profile');
      const profileData = {
        ...response.data.user,
        compliance_status: response.data.compliance_status ?? response.data.user?.compliance_status,
      };
      setProfile(profileData);
      setCompletion(response.data.completion_percentage);
      setIsComplete(response.data.is_complete);
      setComplianceData({
        status: response.data.compliance_status ?? profileData.compliance_status ?? null,
        requirements: response.data.compliance_requirements ?? [],
      });

      setFormData({
        name: profileData.name || '',
        phone: profileData.phone || '',
        phone_fixed: profileData.phone_fixed || '',
        whatsapp: profileData.whatsapp || '',
        date_of_birth: profileData.date_of_birth || '',
        bio: profileData.bio || '',
        address_line1: profileData.address_line1 || '',
        address_line2: profileData.address_line2 || '',
        city: profileData.city || '',
        postal_code: profileData.postal_code || '',
        country: profileData.country || 'Côte d\'Ivoire',
        id_type: profileData.id_type || '',
        id_number: profileData.id_number || '',
        rccm: profileData.rccm || '',
        tax_account_number: profileData.tax_account_number || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formDataToSend = new FormData();
      
      // Ajouter les champs texte
      // Important: envoyer tous les champs même s'ils sont vides pour permettre la mise à jour
      formDataToSend.append('name', formData.name || '');
      formDataToSend.append('phone', formData.phone || '');
      formDataToSend.append('phone_fixed', formData.phone_fixed || '');
      formDataToSend.append('whatsapp', formData.whatsapp || '');
      formDataToSend.append('date_of_birth', formData.date_of_birth || '');
      formDataToSend.append('bio', formData.bio || '');
      formDataToSend.append('address_line1', formData.address_line1 || '');
      formDataToSend.append('address_line2', formData.address_line2 || '');
      formDataToSend.append('city', formData.city || '');
      formDataToSend.append('postal_code', formData.postal_code || '');
      formDataToSend.append('country', formData.country || 'Côte d\'Ivoire');
      formDataToSend.append('id_type', formData.id_type || '');
      formDataToSend.append('id_number', formData.id_number || '');
      formDataToSend.append('rccm', formData.rccm || '');
      formDataToSend.append('tax_account_number', formData.tax_account_number || '');

      // Ajouter l'avatar
      if (files.avatar) {
        formDataToSend.append('avatar', files.avatar);
      }

      // Ajouter les fichiers
      if (files.id_document) {
        formDataToSend.append('id_document', files.id_document);
      }
      if (files.id_document_recto) {
        formDataToSend.append('id_document_recto', files.id_document_recto);
      }
      if (files.id_document_verso) {
        formDataToSend.append('id_document_verso', files.id_document_verso);
      }
      if (files.proof_of_address) {
        formDataToSend.append('proof_of_address', files.proof_of_address);
      }
      if (files.business_license) {
        formDataToSend.append('business_license', files.business_license);
      }
      if (files.rccm_document) {
        formDataToSend.append('rccm_document', files.rccm_document);
      }
      if (files.tax_document) {
        formDataToSend.append('tax_document', files.tax_document);
      }

      // Utiliser POST au lieu de PUT car Laravel a des problèmes avec PUT et FormData
      const response = await api.post('/host/profile', formDataToSend);

      if (!response.data || !response.data.user) {
        throw new Error('Réponse invalide du serveur');
      }

      // Mettre à jour le profil avec les nouvelles données
      const updatedUser = response.data.user;
      setProfile({
        ...updatedUser,
        compliance_status: response.data.compliance_status ?? updatedUser.compliance_status,
      });
      setCompletion(response.data.completion_percentage || 0);
      setIsComplete(response.data.is_complete || false);
      
      // Mettre à jour les données du formulaire avec les valeurs sauvegardées
      setFormData({
        name: updatedUser.name || '',
        phone: updatedUser.phone || '',
        phone_fixed: updatedUser.phone_fixed || '',
        whatsapp: updatedUser.whatsapp || '',
        date_of_birth: updatedUser.date_of_birth || '',
        bio: updatedUser.bio || '',
        address_line1: updatedUser.address_line1 || '',
        address_line2: updatedUser.address_line2 || '',
        city: updatedUser.city || '',
        postal_code: updatedUser.postal_code || '',
        country: updatedUser.country || 'Côte d\'Ivoire',
        id_type: updatedUser.id_type || '',
        id_number: updatedUser.id_number || '',
        rccm: updatedUser.rccm || '',
        tax_account_number: updatedUser.tax_account_number || '',
      });
      
      setFiles({ 
        avatar: null,
        id_document: null, 
        id_document_recto: null, 
        id_document_verso: null, 
        proof_of_address: null, 
        business_license: null,
        rccm_document: null,
        tax_document: null,
      });
      
      setSuccess('Profil mis à jour avec succès !');
      
      // Recharger les données depuis le serveur pour être sûr
      setTimeout(() => {
        fetchProfile();
      }, 1000);
      
      // Masquer le message de succès après 5 secondes
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || err.message 
        || 'Erreur lors de la mise à jour du profil. Veuillez réessayer.';
      
      // Afficher les erreurs de validation si disponibles
      if (err.response?.data?.errors) {
        const validationErrors = Object.entries(err.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        setError(`${errorMessage}\n${validationErrors}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (field: keyof typeof files, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement du profil..." size="lg" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'host' || !profile) {
    return null;
  }

  // Construire l'URL de l'avatar
  const getAvatarUrl = () => {
    if (files.avatar) {
      return URL.createObjectURL(files.avatar);
    }
    
    if (profile.avatar) {
      // Le backend retourne maintenant l'URL complète
      if (profile.avatar.startsWith('http://') || profile.avatar.startsWith('https://')) {
        return profile.avatar;
      }
      
      // Fallback: construire l'URL si le backend retourne encore un chemin relatif
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';
      const baseUrl = apiUrl.replace('/api', '');
      return `${baseUrl}${profile.avatar.startsWith('/') ? '' : '/'}${profile.avatar}`;
    }
    
    // Avatar par défaut
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=6366f1&color=fff&size=200`;
  };

  const avatarUrl = getAvatarUrl();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Messages de succès/erreur */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-800 dark:text-green-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-800 dark:text-green-300 hover:text-green-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        {/* En-tête avec avatar et infos principales */}
        <div className="card mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-accent p-8 text-white">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {avatarUrl.startsWith('http://localhost') ? (
                    // Pour les images locales, utiliser img standard pour éviter l'optimisation Next.js
                    <img
                      src={avatarUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={avatarUrl}
                      alt={profile.name}
                      fill
                      priority
                      className="object-cover"
                    />
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <Camera className="w-5 h-5 text-primary" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('avatar', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Infos principales */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
                <p className="text-white/80 mb-4">{profile.email}</p>
                
                {/* Statut de vérification */}
                <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                    profile.profile_verified 
                      ? 'bg-green-500/20 text-white border border-green-300' 
                      : isComplete
                      ? 'bg-yellow-500/20 text-white border border-yellow-300'
                      : 'bg-white/20 text-white border border-white/30'
                  }`}>
                    {profile.profile_verified ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Profil vérifié
                      </span>
                    ) : isComplete ? (
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        En attente de vérification
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Profil incomplet
                      </span>
                    )}
                  </span>

                  {/* Badge de conformité */}
                  {complianceData.status && (
                    <button
                      onClick={() => showValidation({
                        title: 'État de conformité du profil',
                        message: complianceData.status === 'conforme'
                          ? 'Votre profil est conforme. Vous pouvez créer des établissements et recevoir des réservations.'
                          : 'Votre profil n\'est pas conforme. Veuillez compléter les informations manquantes pour débloquer toutes les fonctionnalités.',
                        requirements: complianceData.requirements,
                        complianceStatus: complianceData.status,
                        variant: complianceData.status === 'conforme' ? 'success' : 'warning',
                        actionLabel: 'Compléter mon profil',
                        actionHref: isEditing ? undefined : '#edit',
                        onAction: isEditing ? undefined : () => setIsEditing(true),
                      })}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 ${
                        complianceData.status === 'conforme'
                          ? 'bg-green-500/20 text-white border border-green-300'
                          : 'bg-red-500/20 text-white border border-red-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {complianceData.status === 'conforme' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {complianceData.status === 'conforme' ? 'Conforme' : 'Non conforme'}
                      </span>
                    </button>
                  )}
                  
                  {/* Barre de progression */}
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                    <span className="text-sm font-medium">{completion}%</span>
                    <div className="w-24 bg-white/30 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isComplete ? 'bg-green-400' : 'bg-yellow-400'
                        }`}
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton Modifier */}
              <div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary flex items-center gap-2 bg-white text-primary hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      fetchProfile(); // Recharger les données
                    }}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informations personnelles */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Informations personnelles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom complet *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Numéro établissement *</label>
                    <input
                      type="tel"
                      value={formData.phone_fixed}
                      onChange={(e) => setFormData({ ...formData, phone_fixed: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">WhatsApp établissement</label>
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Téléphone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date de naissance *</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Biographie</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                      placeholder="Parlez-nous de vous..."
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Adresse
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Adresse ligne 1 *</label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Adresse ligne 2</label>
                    <input
                      type="text"
                      value={formData.address_line2}
                      onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Ville *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Code postal</label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pays *</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Identification */}
              {isEditing && (
                <div className="card">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Pièce d'identité
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Type de pièce *</label>
                      <select
                        value={formData.id_type}
                        onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      >
                        <option value="">Sélectionner...</option>
                        <option value="CNI">CNI</option>
                        <option value="Passeport">Passeport</option>
                        <option value="Permis de conduire">Permis de conduire</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Numéro de pièce *</label>
                      <input
                        type="text"
                        value={formData.id_number}
                        onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      />
                    </div>
                    {/* Affichage conditionnel selon le type de document */}
                    {formData.id_type === 'CNI' || formData.id_type === 'Permis de conduire' ? (
                      <>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">
                            Document d'identité - Recto (PDF, JPG, PNG) *
                          </label>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange('id_document_recto', e.target.files?.[0] || null)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                          />
                          {profile?.id_document_recto_path && !files.id_document_recto && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Recto actuel: {profile.id_document_recto_path.split('/').pop()}
                            </p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">
                            Document d'identité - Verso (PDF, JPG, PNG) *
                          </label>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange('id_document_verso', e.target.files?.[0] || null)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                          />
                          {profile?.id_document_verso_path && !files.id_document_verso && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Verso actuel: {profile.id_document_verso_path.split('/').pop()}
                            </p>
                          )}
                        </div>
                      </>
                    ) : formData.id_type ? (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">
                          Document d'identité (PDF, JPG, PNG) *
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('id_document', e.target.files?.[0] || null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                        {profile?.id_document_path && !files.id_document && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Document actuel: {profile.id_document_path.split('/').pop()}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Documents supplémentaires */}
              {isEditing && (
                <div className="card">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Documents supplémentaires
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Justificatif de domicile (PDF, JPG, PNG) *</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('proof_of_address', e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      />
                      {profile?.proof_of_address_path && !files.proof_of_address && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Document actuel: {profile.proof_of_address_path.split('/').pop()}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Licence d'exploitation (PDF, JPG, PNG) *</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('business_license', e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      />
                      {profile?.business_license_path && !files.business_license && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Document actuel: {profile.business_license_path.split('/').pop()}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Numéro RCM *</label>
                      <input
                        type="text"
                        value={formData.rccm}
                        onChange={(e) => setFormData({ ...formData, rccm: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Document RCM (PDF, JPG, PNG) *</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('rccm_document', e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      />
                      {profile?.rccm_document_path && !files.rccm_document && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Document actuel: {profile.rccm_document_path.split('/').pop()}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Numéro contribuable *</label>
                      <input
                        type="text"
                        value={formData.tax_account_number}
                        onChange={(e) => setFormData({ ...formData, tax_account_number: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Document contribuable (PDF, JPG, PNG) *</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('tax_document', e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      />
                      {profile?.tax_document_path && !files.tax_document && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Document actuel: {profile.tax_document_path.split('/').pop()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Résumé du profil */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Résumé</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Complétion</span>
                    <span className="font-medium">{completion}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Statut</span>
                    <span className={`font-medium ${
                      profile.profile_verified ? 'text-green-600' : isComplete ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {profile.profile_verified ? 'Vérifié' : isComplete ? 'En attente' : 'Incomplet'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Conformité</span>
                    <span className={`font-medium ${
                      profile.compliance_status === 'conforme' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {profile.compliance_status === 'conforme' ? 'Conforme' : 'Non conforme'}
                    </span>
                  </div>
                  {profile.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Téléphone</span>
                      <span className="font-medium">{profile.phone}</span>
                    </div>
                  )}
                  {profile.city && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ville</span>
                      <span className="font-medium">{profile.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bouton d'enregistrement */}
              {isEditing && (
                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Enregistrement en cours...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Enregistrer les modifications
                      </>
                    )}
                  </button>
                  {saving && (
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      Veuillez patienter, ne pas fermer cette page...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
