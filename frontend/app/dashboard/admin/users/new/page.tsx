'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isController, isAdmin } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeft, UserPlus, CheckCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    status: 'active',
    role_ids: [] as number[],
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Rediriger les contrôleurs vers leur page d'inspections
      if (isController(user)) {
        router.push('/dashboard/admin/inspections');
        return;
      }
      // Rediriger les non-admins vers la page de login
      if (!isAdmin(user)) {
        router.push('/auth/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user)) {
      fetchRoles();
    }
  }, [isAuthenticated, user]);

  const fetchRoles = async () => {
    try {
      const response = await api.get('/admin/users/roles');
      setRoles(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (formData.password !== formData.password_confirmation) {
      setError('Les mots de passe ne correspondent pas');
      setSubmitting(false);
      return;
    }

    // Vérifier qu'au moins un rôle RBAC est sélectionné
    if (formData.role_ids.length === 0) {
      setError('Veuillez sélectionner au moins un rôle');
      setSubmitting(false);
      return;
    }

    try {
      // Déterminer le rôle legacy en fonction du premier rôle RBAC sélectionné
      // Cela permet de maintenir la compatibilité avec le backend
      const firstRole = roles.find(r => formData.role_ids.includes(r.id));
      let legacyRole = 'user'; // Par défaut
      
      if (firstRole) {
        // Mapper les rôles RBAC vers les rôles legacy
        const roleMapping: Record<string, string> = {
          'super_admin': 'admin',
          'admin': 'admin',
          'gerant': 'admin',
          'controleur': 'admin',
          'host': 'host',
          'user': 'user',
        };
        legacyRole = roleMapping[firstRole.name] || 'user';
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        role: legacyRole, // Rôle legacy automatique basé sur RBAC
        status: formData.status,
        role_ids: formData.role_ids,
      };

      await api.post('/admin/users', payload);
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/admin/users');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de l\'utilisateur');
      console.error('Error creating user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRole = (roleId: number) => {
    setFormData(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  const generateRandomPassword = (length = 12) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pwd = '';
    const array = new Uint32Array(length);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        pwd += chars[array[i] % chars.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        pwd += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return pwd;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword(14);
    setFormData(prev => ({
      ...prev,
      password: newPassword,
      password_confirmation: newPassword,
    }));
    setShowPassword(true);
    setError(null);
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

  if (!isAuthenticated || !user || !isAdmin(user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/dashboard/admin/users"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <UserPlus className="w-8 h-8" />
              Créer un utilisateur
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Ajouter un nouvel utilisateur avec ses rôles
            </p>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-400">Utilisateur créé avec succès ! Redirection...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card max-w-3xl">
          <div className="space-y-6">
            {/* Informations de base */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Informations de base
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Statut *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="blocked">Bloqué</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Mot de passe
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Mot de passe * (min. 8 caractères)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <KeyRound className="w-3 h-3" />
                        Générer
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showPassword ? 'Masquer' : 'Afficher'}
                      </button>
                    </div>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Entrer ou générer un mot de passe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirmer le mot de passe *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={formData.password_confirmation}
                    onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Confirmer le mot de passe"
                  />
                </div>
              </div>
              {formData.password && showPassword && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 break-all">
                  Mot de passe généré / actuel : <span className="font-mono">{formData.password}</span>
                </p>
              )}
            </div>

            {/* Rôles RBAC */}
            {roles.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Rôles *
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Sélectionnez au moins un rôle à assigner à cet utilisateur. Vous pouvez sélectionner plusieurs rôles si nécessaire.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.role_ids.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{role.display_name}</p>
                        {role.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{role.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/dashboard/admin/users" className="btn-secondary">
                Annuler
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Création...' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

