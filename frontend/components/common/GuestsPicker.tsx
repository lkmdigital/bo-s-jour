'use client';

import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MAX_GUESTS = 20;

/** « 2 adultes · 1 enfant » — le total voyageurs = adultes + enfants. */
export function guestsSummary(adults: number, children: number): string {
  const a = `${adults} adulte${adults > 1 ? 's' : ''}`;
  return children > 0 ? `${a} · ${children} enfant${children > 1 ? 's' : ''}` : a;
}

interface Props {
  adults: number;
  children: number;
  onChange: (adults: number, children: number) => void;
  /** 'field' : champ de formulaire (fiche établissement) ; 'bar' : cellule de la barre de recherche. */
  variant?: 'field' | 'bar';
  className?: string;
}

function Row({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-2">
      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{label}</p>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Retirer : ${label}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center hover:border-gray-900 disabled:opacity-40 disabled:hover:border-gray-300">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="min-w-[2ch] text-center font-semibold text-sm text-gray-900 dark:text-gray-100">{value}</span>
        <button type="button" aria-label={`Ajouter : ${label}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center hover:border-gray-900 disabled:opacity-40 disabled:hover:border-gray-300">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Sélecteur adultes / enfants (retour client 2026-09-24). Au moins un adulte,
 * `MAX_GUESTS` voyageurs au total.
 */
export default function GuestsPicker({ adults, children, onChange, variant = 'field', className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = adults + children;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const trigger = variant === 'bar' ? (
    <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm text-left w-full text-gray-700">
      {guestsSummary(adults, children)}
    </button>
  ) : (
    <button type="button" onClick={() => setOpen((o) => !o)}
      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-left flex items-center gap-2 focus:ring-2 focus:ring-primary">
      <Users className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="truncate">{guestsSummary(adults, children)}</span>
    </button>
  );

  return (
    <div ref={ref} className={cn('relative', className)}>
      {trigger}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4">
          <Row label="Adultes" value={adults} min={1} max={MAX_GUESTS - children}
            onChange={(v) => onChange(v, children)} />
          <Row label="Enfants" value={children} min={0} max={MAX_GUESTS - adults}
            onChange={(v) => onChange(adults, v)} />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{total} voyageur{total > 1 ? 's' : ''} au total</p>
          <button type="button" onClick={() => setOpen(false)} className="btn-primary w-full mt-3 py-2 text-sm">OK</button>
        </div>
      )}
    </div>
  );
}
