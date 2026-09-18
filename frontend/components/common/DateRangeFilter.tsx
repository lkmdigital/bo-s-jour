'use client';

import { Children, isValidElement, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FilterBar, FilterResetButton, FilterSelect, filterBoxClass } from './FilterBar';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { key: '7', label: '7 derniers jours' },
  { key: '30', label: '30 derniers jours' },
  { key: '90', label: '90 derniers jours' },
  { key: 'month', label: 'Mois en cours' },
  { key: 'year', label: 'Cette année' },
];

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangeFilterProps {
  from: string;
  to: string;
  onRangeChange: (from: string, to: string) => void;
  /** Décrit ce que la période filtre (info-bulle de la case dates). */
  label?: string;
  /** Autres filtres (FilterSelect…) affichés dans la même rangée, après les dates. */
  children?: ReactNode;
  /** Affiche le bouton de réinitialisation (icône rouge) en fin de rangée. */
  onReset?: () => void;
  /** Sans cadre blanc (déjà dans un conteneur). */
  bare?: boolean;
  className?: string;
}

function presetRange(key: string): DateRange {
  const now = new Date();
  if (key === 'month') return { from: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: formatDate(now) };
  if (key === 'year') return { from: formatDate(new Date(now.getFullYear(), 0, 1)), to: formatDate(now) };
  const from = new Date(now);
  from.setDate(from.getDate() - Number(key));
  return { from: formatDate(from), to: formatDate(now) };
}

/**
 * Rangée de filtres au style de référence client (2026-09-18) :
 * [Période rapide ▾] | [jj/mm/aaaa au jj/mm/aaaa] [Filtrer] | autres filtres | [↺].
 * Les dates ne s'appliquent qu'au clic sur "Filtrer" (brouillon local) ; les
 * périodes rapides s'appliquent immédiatement.
 */
export default function DateRangeFilter({
  from,
  to,
  onRangeChange,
  label = 'Période',
  children,
  onReset,
  bare = false,
  className = '',
}: DateRangeFilterProps) {
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to]);

  const applyDraft = () => {
    if (draftFrom && draftTo) onRangeChange(draftFrom, draftTo);
  };

  const dateInput = 'bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-900 dark:text-white';

  const items: ReactNode[] = [
    <FilterSelect
      key="preset"
      ariaLabel="Période rapide"
      value=""
      onChange={(k) => {
        if (!k) return;
        const r = presetRange(k);
        onRangeChange(r.from, r.to);
      }}
    >
      <option value="">Période rapide</option>
      {PRESETS.map((p) => (
        <option key={p.key} value={p.key}>
          {p.label}
        </option>
      ))}
    </FilterSelect>,
    <div key="dates" className="flex flex-wrap items-center gap-2" title={label}>
      <input
        type="date"
        aria-label={`${label} — du`}
        value={draftFrom}
        onChange={(e) => setDraftFrom(e.target.value)}
        className={`${filterBoxClass} ${dateInput}`}
      />
      <span className="text-sm text-gray-500">au</span>
      <input
        type="date"
        aria-label={`${label} — au`}
        value={draftTo}
        onChange={(e) => setDraftTo(e.target.value)}
        className={`${filterBoxClass} ${dateInput}`}
      />
      <button
        type="button"
        onClick={applyDraft}
        className="px-4 py-2 rounded-md bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-colors whitespace-nowrap"
      >
        Filtrer
      </button>
    </div>,
    ...Children.toArray(children).filter((c) => isValidElement(c)),
  ];
  if (onReset) items.push(<FilterResetButton key="reset" onClick={onReset} />);

  return <FilterBar className={`${bare ? '!bg-transparent !border-0 !p-0 dark:!bg-transparent' : ''} ${className}`}>{items}</FilterBar>;
}

export function useDefaultDateRange(defaultDays = 30): DateRange {
  return useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - defaultDays);
    return { from: formatDate(start), to: formatDate(end) };
  }, [defaultDays]);
}
