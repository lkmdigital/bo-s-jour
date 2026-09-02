'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import { isAdminOrController, isAdmin, isController } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  ArrowLeft,
  FileCheck,
  Building2,
  User,
  Calendar,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  AlertCircle,
  Star,
  Save,
  Info,
} from 'lucide-react';
import Link from 'next/link';

interface InspectionDetail {
  id: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  result?: 'approved' | 'rejected' | 'pending_review';
  score?: number;
  scheduled_at?: string;
  started_at?: string;
  paused_at?: string | null;
  completed_at?: string;
  observations?: string;
  recommendations?: string;
  rejection_reason?: string;
  accommodation?: {
    id: number;
    name: string;
    city: string;
    address: string;
    type: string;
    host?: {
      id: number;
      name: string;
      email: string;
    };
  };
  inspector?: {
    id: number;
    name: string;
    email: string;
  };
  responses?: Array<{
    id: number;
    checklist_id: number;
    value_boolean?: boolean;
    value_rating?: number;
    value_text?: string;
    comment?: string;
    media_files?: string[];
    checklist?: {
      id: number;
      name: string;
      description?: string;
      type: 'boolean' | 'rating' | 'text';
    };
  }>;
  created_at: string;
}

interface ChecklistItem {
  id: number;
  key: string;
  label: string;
  type: 'rating' | 'boolean';
  value: any;
  description: string;
}

interface ChecklistGroup {
  [key: string]: ChecklistItem[];
}

interface CriteriaResponse {
  [key: string]: {
    id?: number;
    rating?: number;
    boolean?: boolean;
    comment?: string;
    saved?: boolean;
  };
}

const groupLabels: { [key: string]: string } = {
  general: 'Informations générales',
  location: 'Localisation',
  capacity: 'Capacité et équipements',
  services: 'Services et équipements',
  additional: 'Services supplémentaires',
  pricing: 'Tarifs et politique',
};

export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inspectionId = params?.id as string;
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [checklist, setChecklist] = useState<ChecklistGroup>({});
  const [responses, setResponses] = useState<CriteriaResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const confirmAction = useConfirm();
  const { showError, showWarning } = useToast();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || !isAdminOrController(user))) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && isAdminOrController(user) && inspectionId) {
      fetchInspection();
      fetchChecklist();
    }
  }, [isAuthenticated, user, inspectionId]);

  const fetchInspection = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/inspections/${inspectionId}`);
      setInspection(response.data.data);
      
      // Charger les réponses existantes
      if (response.data.data.responses) {
        const existingResponses: CriteriaResponse = {};
        response.data.data.responses.forEach((resp: any) => {
          // On utilise le nom du critère comme clé
          if (resp.checklist?.name) {
            existingResponses[resp.checklist.name] = {
              id: resp.checklist.id,
              rating: resp.value_rating,
              boolean: resp.value_boolean,
              comment: resp.comment,
              saved: true,
            };
          }
        });
        setResponses(existingResponses);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement de l\'inspection');
      console.error('Error fetching inspection:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklist = async () => {
    try {
      const response = await api.get(`/admin/inspections/${inspectionId}/checklist`);
      const checklistData = response.data.data || {};
      setChecklist(checklistData);
      // Ouvrir le premier groupe par défaut
      const firstGroup = Object.keys(checklistData)[0];
      if (firstGroup) {
        setActiveGroup(firstGroup);
      }
      
      // Initialiser les réponses avec les IDs des critères
      const initialResponses: CriteriaResponse = {};
      Object.keys(checklistData).forEach((groupKey) => {
        checklistData[groupKey].forEach((item: ChecklistItem) => {
          initialResponses[item.key] = {
            id: item.id,
            rating: undefined,
            comment: '',
            saved: false,
          };
        });
      });
      setResponses(prev => ({ ...prev, ...initialResponses }));
    } catch (err: any) {
      console.error('Error fetching checklist:', err);
    }
  };

  const handleStart = async () => {
    const ok = await confirmAction({
      title: 'Démarrer l\'inspection',
      message: 'Êtes-vous sûr de vouloir démarrer cette inspection ?',
      confirmLabel: 'Démarrer',
      cancelLabel: 'Annuler',
    });
    if (!ok) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/inspections/${inspectionId}/start`);
      fetchInspection();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors du démarrage');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setActionLoading(true);
      await api.post(`/admin/inspections/${inspectionId}/pause`);
      fetchInspection();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la mise en pause');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRatingChange = (key: string, rating: number) => {
    setResponses(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        rating,
        saved: false,
      },
    }));
  };

  const handleBooleanChange = (key: string, value: boolean) => {
    setResponses(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        boolean: value,
        saved: false,
      },
    }));
  };

  const handleCommentChange = (key: string, comment: string) => {
    setResponses(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        comment,
        saved: false,
      },
    }));
  };

  const saveResponse = async (key: string, item: ChecklistItem) => {
    if (!inspection || inspection.status !== 'in_progress') {
      showWarning('L\'inspection doit être en cours pour enregistrer des réponses');
      return;
    }

    // Vérifier que l'utilisateur est le contrôleur assigné ou un admin
    if (isController(user) && inspection.inspector?.id !== user?.id) {
      showError('Vous n\'êtes pas autorisé à modifier cette inspection. Seul le contrôleur assigné peut ajouter des réponses.');
      return;
    }

    try {
      setSaving(key);
      const response = responses[key];
      
      if (item.type === 'rating' && !response?.rating) {
        showWarning('Veuillez attribuer une note avant de sauvegarder');
        setSaving(null);
        return;
      }
      
      if (item.type === 'boolean' && response?.boolean === undefined) {
        showWarning('Veuillez sélectionner Oui ou Non avant de sauvegarder');
        setSaving(null);
        return;
      }
      
      const payload: any = {
        criteria_key: key, // Utiliser le nom du critère comme clé
        value_rating: response?.rating,
        value_boolean: response?.boolean,
        comment: response?.comment || undefined,
      };

      // Si on a déjà un ID, l'utiliser
      if (item.id) {
        payload.checklist_id = item.id;
      }

      await api.post(`/admin/inspections/${inspectionId}/responses`, payload);
      
      setResponses(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          id: item.id,
          saved: true,
        },
      }));
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
      console.error('Error saving response:', err);
    } finally {
      setSaving(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
          <Clock className="w-4 h-4" />
          Planifiée
        </span>
      ),
      in_progress: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1">
          <Play className="w-4 h-4" />
          En cours
        </span>
      ),
      completed: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Complétée
        </span>
      ),
      cancelled: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 flex items-center gap-1">
          <XCircle className="w-4 h-4" />
          Annulée
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || badges.scheduled;
  };

  const getResultBadge = (result?: string) => {
    if (!result) return null;
    const badges = {
      approved: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Approuvée
        </span>
      ),
      rejected: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
          <XCircle className="w-4 h-4" />
          Rejetée
        </span>
      ),
      pending_review: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          En révision
        </span>
      ),
    };
    return badges[result as keyof typeof badges];
  };

  const renderRatingStars = (key: string, currentRating?: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRatingChange(key, rating)}
            disabled={!inspection || inspection.status !== 'in_progress'}
            className={`p-1 transition-colors ${
              currentRating && currentRating >= rating
                ? 'text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            } ${!inspection || inspection.status !== 'in_progress' ? 'cursor-not-allowed opacity-50' : 'hover:text-yellow-400'}`}
          >
            <Star className="w-5 h-5 fill-current" />
          </button>
        ))}
        {currentRating && (
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            ({currentRating}/5)
          </span>
        )}
      </div>
    );
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

  if (!isAuthenticated || !user || !isAdminOrController(user)) {
    return null;
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="container mx-auto px-4 py-8">
          <div className="card">
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">
              {error || 'Inspection non trouvée'}
            </p>
            <Link href="/dashboard/admin/inspections" className="btn-secondary text-center block w-fit mx-auto">
              Retour à la liste
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // L'utilisateur peut éditer seulement si :
  // 1. L'inspection est en cours
  // 2. ET (l'utilisateur est un admin OU l'utilisateur est le contrôleur assigné)
  const canEdit = inspection.status === 'in_progress' && 
    (isAdmin(user) || (isController(user) && inspection.inspector?.id === user?.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin/inspections"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <FileCheck className="w-8 h-8" />
                Inspection #{inspection.id}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Vérification des informations de l'établissement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Afficher les boutons seulement si l'utilisateur est le contrôleur assigné ou un admin */}
            {inspection.status === 'scheduled' && (
              (isAdmin(user) || (isController(user) && inspection.inspector?.id === user?.id)) ? (
                <button
                  onClick={handleStart}
                  disabled={actionLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Démarrer l'inspection
                </button>
              ) : (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Seul le contrôleur assigné peut démarrer cette inspection
                </div>
              )
            )}
            {inspection.status === 'in_progress' && (
              (isAdmin(user) || (isController(user) && inspection.inspector?.id === user?.id)) ? (
                <button
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="btn-secondary flex items-center gap-2"
                >
                  {inspection.paused_at ? (
                    <>
                      <Play className="w-4 h-4" />
                      Reprendre
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      Mettre en pause
                    </>
                  )}
                </button>
              ) : (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Seul le contrôleur assigné peut modifier cette inspection
                </div>
              )
            )}
            <Link href="/dashboard/admin/inspections" className="btn-secondary">
              Retour à la liste
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Statut et informations */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="card">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Statut</label>
            <div className="mt-1">{getStatusBadge(inspection.status)}</div>
          </div>
          {inspection.result && (
            <div className="card">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultat</label>
              <div className="mt-1">{getResultBadge(inspection.result)}</div>
            </div>
          )}
          {inspection.score !== undefined && inspection.score !== null && (
            <div className="card">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Score</label>
              <div className="mt-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof inspection.score === 'number' ? inspection.score.toFixed(1) : inspection.score}/100
                </span>
              </div>
            </div>
          )}
          {inspection.accommodation && (
            <div className="card">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                Établissement
              </label>
              <div className="mt-1">
                <p className="font-medium text-gray-900 dark:text-white">{inspection.accommodation.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{inspection.accommodation.city}</p>
              </div>
            </div>
          )}
        </div>

        {/* Checklist interactive par groupes */}
        {Object.keys(checklist).length > 0 && (
          <div className="space-y-6">
            {/* Navigation des groupes */}
            <div className="card">
              <div className="flex flex-wrap gap-2">
                {Object.keys(checklist).map((groupKey) => (
                  <button
                    key={groupKey}
                    onClick={() => setActiveGroup(groupKey)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeGroup === groupKey
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {groupLabels[groupKey] || groupKey}
                    <span className="ml-2 text-xs opacity-75">
                      ({checklist[groupKey].length})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Affichage du groupe actif */}
            {activeGroup && checklist[activeGroup] && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  {groupLabels[activeGroup] || activeGroup}
                </h2>
                <div className="space-y-6">
                  {checklist[activeGroup].map((item) => {
                    const response = responses[item.key] || {};
                    const isSaved = response.saved;
                    
                    return (
                      <div
                        key={item.key}
                        className={`p-4 rounded-lg border-2 ${
                          isSaved
                            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                              {item.label}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {item.description}
                            </p>
                            {item.value !== null && item.value !== undefined && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Valeur déclarée : </span>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {typeof item.value === 'boolean' 
                                    ? (item.value ? 'Oui' : 'Non')
                                    : String(item.value)}
                                </span>
                              </div>
                            )}
                          </div>
                          {isSaved && (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
                          )}
                        </div>

                        <div className="space-y-3">
                          {/* Note (étoiles) ou Oui/Non selon le type */}
                          {item.type === 'rating' ? (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Note (1-5 étoiles) *
                              </label>
                              {renderRatingStars(item.key, response.rating)}
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Réponse *
                              </label>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => handleBooleanChange(item.key, true)}
                                  disabled={!canEdit}
                                  className={`px-4 py-2 rounded-lg transition-colors ${
                                    response.boolean === true
                                      ? 'bg-green-500 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <CheckCircle className="w-4 h-4 inline mr-2" />
                                  Oui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBooleanChange(item.key, false)}
                                  disabled={!canEdit}
                                  className={`px-4 py-2 rounded-lg transition-colors ${
                                    response.boolean === false
                                      ? 'bg-red-500 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <XCircle className="w-4 h-4 inline mr-2" />
                                  Non
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Commentaire */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Commentaire
                            </label>
                            <textarea
                              value={response.comment || ''}
                              onChange={(e) => handleCommentChange(item.key, e.target.value)}
                              disabled={!canEdit}
                              rows={3}
                              placeholder="Ajoutez vos observations..."
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Bouton sauvegarder */}
                          {canEdit && (
                            <button
                              onClick={() => saveResponse(item.key, item)}
                              disabled={
                                (item.type === 'rating' && !response.rating) ||
                                (item.type === 'boolean' && response.boolean === undefined) ||
                                saving === item.key
                              }
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                ((item.type === 'rating' && response.rating) || 
                                 (item.type === 'boolean' && response.boolean !== undefined)) && !isSaved
                                  ? 'bg-primary text-white hover:bg-primary/90'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <Save className="w-4 h-4" />
                              {saving === item.key ? 'Enregistrement...' : isSaved ? 'Enregistré' : 'Enregistrer'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message si aucune inspection en cours */}
            {!canEdit && inspection.status === 'scheduled' && (
              <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-blue-800 dark:text-blue-400">
                    Démarrez l'inspection pour commencer à vérifier les critères
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Informations complémentaires */}
        {(inspection.observations || inspection.recommendations || inspection.rejection_reason) && (
          <div className="mt-6 space-y-6">
            {inspection.observations && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Observations
                </h2>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{inspection.observations}</p>
              </div>
            )}
            {inspection.recommendations && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Recommandations
                </h2>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{inspection.recommendations}</p>
              </div>
            )}
            {inspection.rejection_reason && (
              <div className="card border-l-4 border-red-500">
                <h2 className="text-xl font-semibold text-red-900 dark:text-red-400 mb-4">
                  Raison du rejet
                </h2>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{inspection.rejection_reason}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
