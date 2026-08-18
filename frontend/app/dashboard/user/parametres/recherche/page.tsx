'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useAppearanceStore, PriceFormat, DefaultSort, LandingPage } from '@/stores/appearanceStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import MemberSettingsPageHeader from '@/components/dashboard/user/MemberSettingsPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { SlidersHorizontal, Banknote, SortAsc, Home as HomeIcon } from 'lucide-react';

export default function MemberSearchSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const {
    priceFormat, resultsPerPage, defaultSort, landingPage,
    setPriceFormat, setResultsPerPage, setDefaultSort, setLandingPage,
  } = useAppearanceStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/parametres/recherche');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <LoadingSpinner message="Chargement…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6 max-w-2xl">
        <MemberSettingsPageHeader
          icon={SlidersHorizontal}
          title="Recherche & navigation"
          description="Vos préférences pour parcourir les hébergements."
        />

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {/* Format des prix */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2"><Banknote className="w-4 h-4" /> Format des prix</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              <button
                type="button"
                onClick={() => setPriceFormat('standard')}
                className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${priceFormat === 'standard' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
              >
                195 000 F
              </button>
              <button
                type="button"
                onClick={() => setPriceFormat('compact')}
                className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${priceFormat === 'compact' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
              >
                195K F
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">S&apos;applique aux prochaines pages consultées.</p>
          </div>

          {/* Tri par défaut + résultats par page */}
          <div className="pt-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><SortAsc className="w-4 h-4" /> Tri par défaut</p>
              <select
                value={defaultSort}
                onChange={(e) => setDefaultSort(e.target.value as DefaultSort)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="recommended">Recommandés</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="rating">Mieux notés</option>
              </select>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Résultats par page</p>
              <select
                value={resultsPerPage}
                onChange={(e) => setResultsPerPage(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value={9}>9</option>
                <option value={12}>12</option>
                <option value={18}>18</option>
              </select>
            </div>
          </div>

          {/* Page d'accueil après connexion */}
          <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium mb-2 flex items-center gap-2"><HomeIcon className="w-4 h-4" /> Page d&apos;accueil après connexion</p>
            <select
              value={landingPage}
              onChange={(e) => setLandingPage(e.target.value as LandingPage)}
              className="w-full max-w-xs px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="home">Accueil du site</option>
              <option value="dashboard">Tableau de bord</option>
              <option value="reservations">Mes réservations</option>
              <option value="recherche">Recherche</option>
            </select>
          </div>
        </section>
      </div>

      <MemberAside />
    </div>
  );
}
