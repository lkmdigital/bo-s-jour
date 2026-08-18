'use client';

import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** En-tête commun aux sous-pages de Paramètres (espace voyageur). L'authentification
 * reste gérée individuellement par chaque page, comme le reste de l'espace membre. */
export default function MemberSettingsPageHeader({ icon: Icon, title, description }: Props) {
  return (
    <div>
      <Link
        href="/dashboard/user/parametres"
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Paramètres
      </Link>

      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Icon className="w-7 h-7 text-primary" />
        {title}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
    </div>
  );
}
