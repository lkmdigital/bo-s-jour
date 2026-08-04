'use client';

import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function ComingSoon({ icon: Icon, title, description }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-12 text-center">
        <Icon className="w-12 h-12 mx-auto text-bosejour-red/60 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Bientôt disponible</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">{description}</p>
      </div>
    </div>
  );
}
