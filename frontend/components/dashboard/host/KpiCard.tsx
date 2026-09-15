'use client';

import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface KpiCardProps {
  icon: LucideIcon;
  iconColorClass?: string;
  label: string;
  value: string;
  change?: number; // pourcentage, positif ou négatif
  // Retour client 2026-09-15 : les cartes "Vue d'ensemble" doivent renvoyer
  // vers le module concerné (ex. "Revenus ce mois" -> Finances). Optionnel :
  // sans href, la carte reste un simple encart, comme avant.
  href?: string;
}

export default function KpiCard({ icon: Icon, iconColorClass = 'text-bosejour-red', label, value, change, href }: KpiCardProps) {
  const hasChange = typeof change === 'number' && !Number.isNaN(change);
  const isPositive = hasChange && (change as number) >= 0;

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <Icon className={`w-6 h-6 ${iconColorClass}`} />
        {hasChange && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {change}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </>
  );

  const className = `bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm${
    href ? ' block transition-colors hover:border-primary/40 hover:shadow-md' : ''
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
