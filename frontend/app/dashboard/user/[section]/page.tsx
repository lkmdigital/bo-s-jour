'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';

const TITLES: Record<string, { title: string; desc: string }> = {
  programme: { title: 'Programme Membre', desc: 'Niveaux de fidélité, points et récompenses arriveront bientôt.' },
  paiements: { title: 'Paiements', desc: 'L’historique de vos paiements et reçus sera disponible ici.' },
  avis: { title: 'Mes avis', desc: 'Retrouvez et gérez vos avis déposés depuis cet espace.' },
  profil: { title: 'Mon profil', desc: 'La gestion complète de votre profil arrive prochainement.' },
  documents: { title: 'Documents', desc: 'Vos factures, reçus et bons de réservation seront regroupés ici.' },
  voyages: { title: 'Mes voyages', desc: '« Mon Voyage » : votre carnet de séjours en Côte d’Ivoire, bientôt.' },
  decouvrir: { title: 'Découvrir la Côte d’Ivoire', desc: 'Idées de destinations et d’activités, prochainement.' },
  parametres: { title: 'Paramètres', desc: 'Préférences, notifications et sécurité arrivent bientôt.' },
  aide: { title: 'Aide & Support', desc: 'Notre centre d’aide sera bientôt intégré à votre espace.' },
  notifications: { title: 'Notifications', desc: 'Le centre de notifications sera disponible ici.' },
};

export default function MemberSectionPlaceholder() {
  const params = useParams();
  const section = String(params.section || '');
  const info = TITLES[section] || { title: 'Bientôt disponible', desc: 'Cette section arrive prochainement.' };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{info.title}</h1>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center max-w-xl">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-primary/10 text-primary items-center justify-center mb-4">
          <Sparkles className="w-7 h-7" />
        </span>
        <h2 className="text-lg font-semibold mb-2">Bientôt disponible</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{info.desc}</p>
        <Link href="/dashboard/user" className="btn-outline inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
