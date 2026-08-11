'use client';

import Link from 'next/link';
import { ArrowRight, Bell, Sparkles } from 'lucide-react';

// Colonne droite persistante de l'espace membre : Programme Membre (à venir),
// Notifications (état honnête — pas d'API voyageur), Assistant IA (à venir).
// Aucune donnée de fidélité / notification fabriquée.
export default function MemberAside() {
  return (
    <aside className="space-y-6">
      {/* Programme Membre */}
      <div className="bg-gray-900 text-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Programme Membre</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">Bientôt</span>
        </div>
        <p className="text-sm text-gray-300">
          Niveaux de fidélité, points et récompenses exclusives arrivent prochainement.
        </p>
        <Link href="/dashboard/user/programme" className="inline-flex items-center gap-1 text-sm text-primary-light mt-4 hover:underline">
          En savoir plus <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Notifications (pas d'API voyageur → état honnête) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-bold flex items-center gap-2 mb-3">
          <Bell className="w-5 h-5 text-primary" /> Notifications
        </h3>
        <div className="text-center py-6">
          <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Aucune notification pour le moment.</p>
          <p className="text-xs text-gray-400 mt-1">Vos confirmations et messages apparaîtront ici.</p>
        </div>
      </div>

      {/* Assistant IA — Bientôt */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-primary/20 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="leading-tight">
            <h3 className="font-bold text-sm">Assistant IA bo séjour</h3>
            <span className="text-[10px] font-semibold text-primary">BIENTÔT</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Bientôt, votre assistant vous proposera des recommandations d&apos;hébergements personnalisées
          selon vos goûts et vos voyages.
        </p>
      </div>
    </aside>
  );
}
