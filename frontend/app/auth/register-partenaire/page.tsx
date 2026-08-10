'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import Link from 'next/link';
import { User, Building2, Upload, X, MapPin, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';

interface RegisterFormData {
  // Champs communs
  email: string;
  password: string;
  password_confirmation: string;
  role: 'user' | 'host';
  
  // Champs voyageur
  name?: string;
  nationality?: string;
  phone?: string;
  id_type?: string;
  id_number?: string;
  id_document_recto?: FileList;
  id_document_verso?: FileList;
  
  // Champs hôte
  establishment_name?: string;
  accommodation_type?: string;
  address_line1?: string;
  city?: string;
  phone_fixed?: string;
  whatsapp?: string;
}

const ID_TYPES = [
  { value: 'CNI', label: 'CNI (Carte Nationale d\'Identité)', requiresVerso: true },
  { value: 'Passeport', label: 'Passeport', requiresVerso: false },
  { value: 'Permis', label: 'Permis de conduire', requiresVerso: true },
];

const ACCOMMODATION_TYPES = [
  { value: 'hotel', label: 'Hôtel' },
  { value: 'motel', label: 'Motel' },
  { value: 'guesthouse', label: 'Maison d\'hôtes' },
  { value: 'apartment', label: 'Appartement' },
  { value: 'apartment_hotel', label: 'Appart\'hôtel' },
  { value: 'residence', label: 'Résidence' },
];

const COUNTRIES = [
  'Côte d\'Ivoire',
  'Burkina Faso',
  'Mali',
  'Sénégal',
  'Guinée',
  'Ghana',
  'Nigeria',
  'Bénin',
  'Togo',
  'Niger',
  'Autre',
];

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  // Demande permission push 4s après inscription réussie
  useNotificationPermission(registered, 4000);
  // Page dédiée Partenaire : verrouillée en mode hôte (pas de sélecteur de rôle).
  const [selectedRole, setSelectedRole] = useState<'user' | 'host' | null>('host');
  const [idDocumentRectoPreview, setIdDocumentRectoPreview] = useState<string | null>(null);
  const [idDocumentVersoPreview, setIdDocumentVersoPreview] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationInfo, setLocationInfo] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<RegisterFormData>({
    defaultValues: {
      role: 'user',
    },
  });

  const password = watch('password');
  const idType = watch('id_type');
  const selectedIdType = ID_TYPES.find(type => type.value === idType);

  const handleRoleSelect = (role: 'user' | 'host') => {
    setSelectedRole(role);
    reset({
      role,
      email: '',
      password: '',
      password_confirmation: '',
      name: '',
      nationality: '',
      phone: '',
      id_type: '',
      id_number: '',
    });
    setIdDocumentRectoPreview(null);
    setIdDocumentVersoPreview(null);
  };

  const handleRectoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdDocumentRectoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVersoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdDocumentVersoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeRectoPreview = () => {
    setIdDocumentRectoPreview(null);
    const input = document.getElementById('id_document_recto') as HTMLInputElement;
    if (input) input.value = '';
  };

  const removeVersoPreview = () => {
    setIdDocumentVersoPreview(null);
    const input = document.getElementById('id_document_verso') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleDetectLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationInfo({
        type: 'error',
        message: 'La géolocalisation n\'est pas disponible sur ce navigateur.',
      });
      return;
    }

    setDetectingLocation(true);
    setLocationInfo({
      type: 'info',
      message: 'Recherche de votre position...',
    });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          // Utiliser l'API Nominatim d'OpenStreetMap pour le géocodage inversé
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'Bosejour/1.0'
              }
            }
          );

          if (!response.ok) {
            throw new Error('Erreur lors de la récupération de l\'adresse');
          }

          const data = await response.json();
          
          if (data && data.address) {
            const address = data.address;
            // Construire l'adresse complète
            const addressParts: string[] = [];
            
            // Ajouter les éléments de l'adresse dans un ordre logique
            if (address.road) addressParts.push(address.road);
            if (address.neighbourhood || address.suburb) {
              addressParts.push(address.neighbourhood || address.suburb);
            }
            if (address.quarter) addressParts.push(address.quarter);
            if (address.village || address.town || address.city) {
              addressParts.push(address.village || address.town || address.city);
            }
            
            const fullAddress = addressParts.join(', ');
            
            if (fullAddress) {
              setValue('address_line1', fullAddress, { shouldValidate: true });
              
              // Remplir aussi la ville si disponible
              if (address.city || address.town || address.village) {
                setValue('city', address.city || address.town || address.village, { shouldValidate: true });
              }
              
              setLocationInfo({
                type: 'success',
                message: 'Adresse détectée et remplie automatiquement. Vous pouvez la modifier si nécessaire.',
              });
            } else {
              // Si on ne peut pas construire une adresse complète, utiliser juste les coordonnées
              setValue('address_line1', `${lat.toFixed(6)}, ${lng.toFixed(6)}`, { shouldValidate: true });
              setLocationInfo({
                type: 'info',
                message: 'Position détectée. Veuillez compléter l\'adresse manuellement.',
              });
            }
          } else {
            // Si pas d'adresse trouvée, utiliser les coordonnées
            setValue('address_line1', `${lat.toFixed(6)}, ${lng.toFixed(6)}`, { shouldValidate: true });
            setLocationInfo({
              type: 'info',
              message: 'Position détectée. Veuillez compléter l\'adresse manuellement.',
            });
          }
        } catch (error) {
          console.error('Erreur lors du géocodage inversé:', error);
          // En cas d'erreur, utiliser quand même les coordonnées
          setValue('address_line1', `${lat.toFixed(6)}, ${lng.toFixed(6)}`, { shouldValidate: true });
          setLocationInfo({
            type: 'info',
            message: 'Position détectée. Veuillez compléter l\'adresse manuellement.',
          });
        } finally {
          setDetectingLocation(false);
        }
      },
      (geoError) => {
        let message = 'Impossible de récupérer votre position.';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          message = 'Vous avez refusé l\'accès à la localisation.';
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = 'Votre position est indisponible pour le moment.';
        } else if (geoError.code === geoError.TIMEOUT) {
          message = 'La recherche de localisation a expiré.';
        }
        setLocationInfo({ type: 'error', message });
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!selectedRole) {
      setError('Veuillez sélectionner un type de compte');
      return;
    }

    if (data.password !== data.password_confirmation) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Préparer les données pour l'envoi
      const formData = new FormData();
      
      formData.append('email', data.email);
      formData.append('password', data.password);
      formData.append('password_confirmation', data.password_confirmation);
      formData.append('role', selectedRole);

      if (selectedRole === 'user') {
        formData.append('name', data.name || '');
        formData.append('nationality', data.nationality || '');
        formData.append('phone', data.phone || '');
        formData.append('id_type', data.id_type || '');
        formData.append('id_number', data.id_number || '');
        
        if (data.id_document_recto && data.id_document_recto[0]) {
          formData.append('id_document_recto', data.id_document_recto[0]);
        }
        
        if (selectedIdType?.requiresVerso && data.id_document_verso && data.id_document_verso[0]) {
          formData.append('id_document_verso', data.id_document_verso[0]);
        }
      } else if (selectedRole === 'host') {
        formData.append('name', data.name || '');
        formData.append('establishment_name', data.establishment_name || '');
        formData.append('accommodation_type', data.accommodation_type || '');
        formData.append('address_line1', data.address_line1 || '');
        formData.append('city', data.city || '');
        if (data.phone_fixed) {
          formData.append('phone_fixed', data.phone_fixed);
        }
        if (data.whatsapp) {
          formData.append('whatsapp', data.whatsapp);
        }
      }

      // Utiliser l'API avec FormData
      const response = await api.post('/register', formData);

      // Récupérer l'utilisateur créé et le token
      const newUser = response.data.user;
      const token = response.data.token;

      // Stocker le token et l'utilisateur dans localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(newUser));
      }

      // Mettre à jour le store d'authentification pour connecter l'utilisateur
      useAuthStore.setState({ 
        user: newUser, 
        token: token, 
        isAuthenticated: true,
        isLoading: false 
      });

      // Recharger l'utilisateur depuis l'API pour avoir les rôles RBAC à jour
      try {
        const freshUserResponse = await api.get('/me');
        const freshUser = freshUserResponse.data;
        if (freshUser) {
          useAuthStore.setState({ user: freshUser });
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(freshUser));
          }
        }
      } catch (err) {
        // En cas d'erreur, on utilise les données d'inscription
        console.log('Impossible de recharger l\'utilisateur, utilisation des données d\'inscription');
      }
      
      setRegistered(true);

      if (newUser?.role === 'controleur') {
        router.push('/dashboard/admin/inspections');
        return;
      }
      
      // Vérifier s'il y a un paramètre redirect (sauf pour les contrôleurs)
      const redirectPath = searchParams.get('redirect');
      
      if (redirectPath) {
        // Rediriger vers la page demandée
        router.push(decodeURIComponent(redirectPath));
      } else {
        // Rediriger selon le rôle : hôte vers dashboard, utilisateur vers page d'accueil
        if (newUser?.role === 'host') {
          router.push('/dashboard/host');
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      // Gérer les erreurs de validation
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const firstError = Object.values(errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        setError(err.response?.data?.message || err.message || 'Erreur lors de l\'inscription');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-6 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center break-words">Créer mon espace partenaire</h1>

          {!selectedRole ? (
            // Étape 1 : Sélection du type de compte
            <div className="card">
              <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 break-words px-2">
                Choisissez le type de compte que vous souhaitez créer
              </p>
              <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={() => handleRoleSelect('user')}
                  className="p-4 sm:p-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-primary/10">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-base sm:text-xl font-bold break-words">Voyageur</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                    Je cherche un hébergement pour mes voyages
                  </p>
                </button>

                <button
                  onClick={() => handleRoleSelect('host')}
                  className="p-4 sm:p-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:bg-primary/10">
                      <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-base sm:text-xl font-bold break-words">Propriétaire (Hôte)</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                    Je souhaite proposer mon hébergement
                  </p>
                </button>
              </div>
            </div>
          ) : (
            // Étape 2 : Formulaire d'inscription
            <div className="card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                <h2 className="text-lg sm:text-2xl font-bold break-words">
                  Inscription établissement / propriétaire
                </h2>
                <Link
                  href="/auth/register"
                  className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-primary whitespace-nowrap"
                >
                  Je suis voyageur
                </Link>
              </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-2.5 sm:p-3 rounded-lg mb-4 text-xs sm:text-sm break-words">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                {selectedRole === 'user' ? (
                  // Formulaire Voyageur
                  <>
            <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                        Nom et prénoms <span className="text-red-500">*</span>
                      </label>
              <input
                type="text"
                        {...register('name', { required: 'Nom et prénoms requis' })}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="Ex: KOUASSI Jean"
              />
              {errors.name && (
                <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.name.message}</p>
              )}
            </div>

            <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                        Nationalité <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('nationality', { required: 'Nationalité requise' })}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      >
                        <option value="">Sélectionner une nationalité</option>
                        {COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                      {errors.nationality && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.nationality.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                        Numéro de téléphone / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        {...register('phone', { required: 'Numéro de téléphone requis' })}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="Ex: +225 07 12 34 56 78"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                        Type de pièce <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('id_type', { required: 'Type de pièce requis' })}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      >
                        <option value="">Sélectionner un type de pièce</option>
                        {ID_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {errors.id_type && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.id_type.message}</p>
                      )}
                    </div>

                    {idType && (
                      <>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                            Numéro de la pièce <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('id_number', { required: 'Numéro de pièce requis' })}
                            className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                            placeholder="Ex: 123456789"
                          />
                          {errors.id_number && (
                            <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.id_number.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                            Image recto <span className="text-red-500">*</span>
                          </label>
                          <div className="space-y-2">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                              {idDocumentRectoPreview ? (
                                <div className="relative w-full h-full">
                                  <img
                                    src={idDocumentRectoPreview}
                                    alt="Recto"
                                    className="w-full h-full object-contain rounded-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={removeRectoPreview}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-words">
                                    Cliquez pour télécharger
                                  </p>
                                </div>
                              )}
                              <input
                                id="id_document_recto"
                                type="file"
                                accept="image/*"
                                {...register('id_document_recto', { required: 'Image recto requise' })}
                                onChange={(e) => {
                                  register('id_document_recto').onChange(e);
                                  handleRectoFileChange(e);
                                }}
                                className="hidden"
                              />
                            </label>
                            {errors.id_document_recto && (
                              <p className="text-red-500 text-xs sm:text-sm break-words">{errors.id_document_recto.message}</p>
                            )}
                          </div>
                        </div>

                        {selectedIdType?.requiresVerso && (
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                              Image verso <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                                {idDocumentVersoPreview ? (
                                  <div className="relative w-full h-full">
                                    <img
                                      src={idDocumentVersoPreview}
                                      alt="Verso"
                                      className="w-full h-full object-contain rounded-lg"
                                    />
                                    <button
                                      type="button"
                                      onClick={removeVersoPreview}
                                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-words">
                                      Cliquez pour télécharger
                                    </p>
                                  </div>
                                )}
                                <input
                                  id="id_document_verso"
                                  type="file"
                                  accept="image/*"
                                  {...register('id_document_verso', { required: 'Image verso requise' })}
                                  onChange={(e) => {
                                    register('id_document_verso').onChange(e);
                                    handleVersoFileChange(e);
                                  }}
                                  className="hidden"
                                />
                              </label>
                              {errors.id_document_verso && (
                                <p className="text-red-500 text-xs sm:text-sm break-words">{errors.id_document_verso.message}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  // Formulaire Hôte
                  <>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                        Nom de l'établissement <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('establishment_name', { required: 'Nom de l\'établissement requis' })}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="Ex: Hôtel Le Paradis"
                      />
                      {errors.establishment_name && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.establishment_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                        Type d'hébergement <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('accommodation_type', { required: 'Type d\'hébergement requis' })}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      >
                        <option value="">Sélectionner un type</option>
                        {ACCOMMODATION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {errors.accommodation_type && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.accommodation_type.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                        Adresse complète (quartier ou rue) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          {...register('address_line1', { required: 'Adresse requise' })}
                          className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                          placeholder="Ex: Cocody, Angré 7ème Tranche"
                        />
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          disabled={detectingLocation}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs sm:text-sm"
                          title="Détecter ma localisation"
                        >
                          {detectingLocation ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="hidden sm:inline">Détection...</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4" />
                              <span className="hidden sm:inline">Localiser</span>
                            </>
                          )}
                        </button>
                      </div>
                      {locationInfo && (
                        <div className={`mt-2 p-2 rounded-lg text-xs sm:text-sm ${
                          locationInfo.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : locationInfo.type === 'error'
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        }`}>
                          {locationInfo.message}
                        </div>
                      )}
                      {errors.address_line1 && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.address_line1.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                        Ville / Région <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('city', { required: 'Ville requise' })}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="Ex: Abidjan"
                      />
                      {errors.city && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                        Nom et prénom du propriétaire ou du gérant <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('name', { required: 'Nom et prénom requis' })}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="Ex: KOUASSI Jean"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                          Téléphone fixe
                        </label>
                        <input
                          type="tel"
                          {...register('phone_fixed')}
                          className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                          placeholder="Ex: +225 27 22 12 34 56"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                          WhatsApp <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          {...register('whatsapp', { required: 'Numéro WhatsApp requis' })}
                          className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                          placeholder="Ex: +225 07 12 34 56 78"
                        />
                        {errors.whatsapp && (
                          <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.whatsapp.message}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Champs communs */}
            <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                    Adresse mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...register('email', { required: 'Email requis' })}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="votre@email.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.email.message}</p>
                  )}
            </div>
            <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Mot de passe requis', minLength: 8 })}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-10 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.password.message}</p>
              )}
            </div>

            <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 break-words">
                    Confirmer le mot de passe <span className="text-red-500">*</span>
                  </label>
              <div className="relative">
                <input
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  {...register('password_confirmation', {
                    required: 'Confirmation requise',
                    validate: (value) => value === password || 'Les mots de passe ne correspondent pas',
                  })}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-10 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  title={showPasswordConfirmation ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPasswordConfirmation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password_confirmation && (
                <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.password_confirmation.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 text-sm sm:text-base py-2 sm:py-2.5"
            >
              {loading ? 'Création en cours...' : 'Créer mon espace'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
              Vous avez déjà un compte ?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Accéder à mon espace
              </Link>
            </p>
          </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-6 sm:py-12">
          <p className="text-center text-gray-600 dark:text-gray-400">Chargement...</p>
        </main>
        <Footer />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
