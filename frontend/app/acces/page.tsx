'use client';

import Link from 'next/link';
import Logo from '@/components/common/Logo';
import { Building2, Users, Check, ArrowRight } from 'lucide-react';

const PARTNER_FEATURES = [
  'Tableau de bord avec KPI',
  'Gestion des réservations',
  'Calendrier interactif',
  'Finances et comptabilité',
  'Gestion des clients',
];

const TRAVELER_FEATURES = [
  "Recherche d'hébergements",
  'Gestion des réservations',
  'Programme de fidélité',
  'Mes favoris',
  'Avis et recommandations',
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 mb-8">
      {items.map((f) => (
        <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
          <Check className="w-4 h-4 text-primary flex-shrink-0" />
          {f}
        </li>
      ))}
    </ul>
  );
}

export default function AccessChoicePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-primary/5 to-white dark:from-gray-900 dark:to-gray-950">
      {/* En-tête */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <Logo href="/" size="md" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">Choisissez votre interface</p>
      </div>

      {/* Cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Interface Partenaire */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 flex flex-col shadow-sm hover:shadow-lg transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mb-6">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Interface Partenaire</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Pour les gérants d&apos;hôtels et établissements
          </p>
          <FeatureList items={PARTNER_FEATURES} />
          <Link
            href="/auth/login?type=partenaire"
            className="btn-secondary w-full inline-flex items-center justify-center gap-2 mt-auto"
          >
            Accéder <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Interface Voyageur (mise en avant) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-primary p-8 flex flex-col shadow-md hover:shadow-xl transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Interface Voyageur</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Pour les clients et voyageurs</p>
          <FeatureList items={TRAVELER_FEATURES} />
          <Link
            href="/auth/login?type=voyageur"
            className="btn-primary w-full inline-flex items-center justify-center gap-2 mt-auto"
          >
            Accéder <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Pied */}
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-10 text-center">
        Plateforme de réservation d&apos;hébergements en Côte d&apos;Ivoire
      </p>
    </div>
  );
}
