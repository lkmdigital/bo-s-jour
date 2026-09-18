'use client';

import { ChevronDown, RotateCcw, Search } from 'lucide-react';
import { Children, isValidElement, type ReactNode } from 'react';

/**
 * Retour client 2026-09-18 : style de référence des filtres des dashboards —
 * une seule rangée : chaque filtre dans sa propre case, séparés par de fins
 * traits verticaux, bouton "Filtrer" pour valider les dates, bouton de
 * réinitialisation (icône rouge) tout à droite.
 */
export function FilterDivider() {
  return <span aria-hidden="true" className="hidden md:block self-stretch w-px bg-gray-200 dark:bg-gray-700" />;
}

export function FilterBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  const items = Children.toArray(children).filter((c) => isValidElement(c));
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 flex flex-wrap items-center gap-3 ${className}`}>
      {items.map((item, i) => (
        <div key={i} className="contents">
          {i > 0 && <FilterDivider />}
          {item}
        </div>
      ))}
    </div>
  );
}

const boxClass =
  'border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/30 transition-shadow';

export function FilterSelect({
  value,
  onChange,
  children,
  className = '',
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`${boxClass} appearance-none bg-gray-100 dark:bg-gray-900 pl-3 pr-8 py-2 w-full`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
    </div>
  );
}

export function FilterSearch({
  value,
  onChange,
  onSubmit,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={`relative flex-1 min-w-[220px] ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${boxClass} w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-900`}
      />
    </form>
  );
}

export function FilterResetButton({ onClick, title = 'Réinitialiser les filtres' }: { onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="p-2 rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
    >
      <RotateCcw className="w-4 h-4" />
    </button>
  );
}

export { boxClass as filterBoxClass };
