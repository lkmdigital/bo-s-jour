'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';

export interface DialCountry {
  iso: string;
  name: string;
  dial: string;
}

// Côte d'Ivoire en premier (défaut), puis Afrique de l'Ouest/Centrale, puis le reste.
export const DIAL_COUNTRIES: DialCountry[] = [
  { iso: 'CI', name: "Côte d'Ivoire", dial: '+225' },
  { iso: 'BJ', name: 'Bénin', dial: '+229' },
  { iso: 'BF', name: 'Burkina Faso', dial: '+226' },
  { iso: 'CM', name: 'Cameroun', dial: '+237' },
  { iso: 'CV', name: 'Cap-Vert', dial: '+238' },
  { iso: 'CG', name: 'Congo', dial: '+242' },
  { iso: 'CD', name: 'RD Congo', dial: '+243' },
  { iso: 'GA', name: 'Gabon', dial: '+241' },
  { iso: 'GM', name: 'Gambie', dial: '+220' },
  { iso: 'GH', name: 'Ghana', dial: '+233' },
  { iso: 'GN', name: 'Guinée', dial: '+224' },
  { iso: 'GW', name: 'Guinée-Bissau', dial: '+245' },
  { iso: 'LR', name: 'Liberia', dial: '+231' },
  { iso: 'ML', name: 'Mali', dial: '+223' },
  { iso: 'MR', name: 'Mauritanie', dial: '+222' },
  { iso: 'NE', name: 'Niger', dial: '+227' },
  { iso: 'NG', name: 'Nigeria', dial: '+234' },
  { iso: 'SN', name: 'Sénégal', dial: '+221' },
  { iso: 'SL', name: 'Sierra Leone', dial: '+232' },
  { iso: 'TD', name: 'Tchad', dial: '+235' },
  { iso: 'TG', name: 'Togo', dial: '+228' },
  { iso: 'DZ', name: 'Algérie', dial: '+213' },
  { iso: 'AO', name: 'Angola', dial: '+244' },
  { iso: 'BI', name: 'Burundi', dial: '+257' },
  { iso: 'KM', name: 'Comores', dial: '+269' },
  { iso: 'DJ', name: 'Djibouti', dial: '+253' },
  { iso: 'EG', name: 'Égypte', dial: '+20' },
  { iso: 'ET', name: 'Éthiopie', dial: '+251' },
  { iso: 'KE', name: 'Kenya', dial: '+254' },
  { iso: 'MG', name: 'Madagascar', dial: '+261' },
  { iso: 'MU', name: 'Maurice', dial: '+230' },
  { iso: 'MA', name: 'Maroc', dial: '+212' },
  { iso: 'RW', name: 'Rwanda', dial: '+250' },
  { iso: 'ZA', name: 'Afrique du Sud', dial: '+27' },
  { iso: 'TN', name: 'Tunisie', dial: '+216' },
  { iso: 'FR', name: 'France', dial: '+33' },
  { iso: 'BE', name: 'Belgique', dial: '+32' },
  { iso: 'CH', name: 'Suisse', dial: '+41' },
  { iso: 'LU', name: 'Luxembourg', dial: '+352' },
  { iso: 'DE', name: 'Allemagne', dial: '+49' },
  { iso: 'ES', name: 'Espagne', dial: '+34' },
  { iso: 'IT', name: 'Italie', dial: '+39' },
  { iso: 'PT', name: 'Portugal', dial: '+351' },
  { iso: 'GB', name: 'Royaume-Uni', dial: '+44' },
  { iso: 'NL', name: 'Pays-Bas', dial: '+31' },
  { iso: 'US', name: 'États-Unis', dial: '+1' },
  { iso: 'CA', name: 'Canada', dial: '+1' },
  { iso: 'BR', name: 'Brésil', dial: '+55' },
  { iso: 'CN', name: 'Chine', dial: '+86' },
  { iso: 'IN', name: 'Inde', dial: '+91' },
  { iso: 'LB', name: 'Liban', dial: '+961' },
  { iso: 'AE', name: 'Émirats arabes unis', dial: '+971' },
  { iso: 'TR', name: 'Turquie', dial: '+90' },
];

const DEFAULT_DIAL = '+225';

// Deux pays partagent +1 : on l'affiche une seule fois dans la liste.
const DIAL_OPTIONS = DIAL_COUNTRIES.filter((c, i, all) => all.findIndex((x) => x.dial === c.dial) === i);
const DIALS_LONGEST_FIRST = DIAL_OPTIONS.map((c) => c.dial).sort((a, b) => b.length - a.length);

// Drapeau emoji dérivé du code ISO (indicateurs régionaux Unicode).
function flag(iso: string) {
  return String.fromCodePoint(...iso.split('').map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** Sépare "+225 0700000000" en { dial: '+225', national: '0700000000' } (sans indicatif reconnu : +225 par défaut). */
export function splitPhone(value: string): { dial: string; national: string } {
  const v = (value || '').trim();
  if (v.startsWith('+')) {
    const compact = v.replace(/\s+/g, '');
    const dial = DIALS_LONGEST_FIRST.find((d) => compact.startsWith(d));
    if (dial) return { dial, national: v.slice(v.indexOf(dial) + dial.length).trim() };
  }
  return { dial: DEFAULT_DIAL, national: v };
}

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  containerClassName?: string;
}

/**
 * Champ téléphone avec indicatif pays (+225 par défaut). La valeur échangée
 * reste une seule chaîne "+225 0700000000" (vide tant qu'aucun numéro n'est
 * saisi), compatible avec tout ce qui la consomme déjà (validation, OTP…).
 */
export default function PhoneInput({ label, value, onChange, required, hint, placeholder = '07 00 00 00 00', containerClassName }: PhoneInputProps) {
  const id = useId();
  const parsed = splitPhone(value);
  // L'indicatif choisi doit survivre à un numéro encore vide (la valeur émise est alors '').
  const [chosenDial, setChosenDial] = useState(parsed.dial);
  const dial = value.trim() ? parsed.dial : chosenDial;
  const national = parsed.national;

  const emit = (nextDial: string, nextNational: string) => {
    setChosenDial(nextDial);
    const digits = nextNational.trim();
    onChange(digits ? `${nextDial} ${digits}` : '');
  };

  const fieldClass = 'rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200';

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
          {label}
          {required && <span className="text-primary ml-0.5">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <select
          aria-label="Indicatif du pays"
          value={dial}
          onChange={(e) => emit(e.target.value, national)}
          className={cn(fieldClass, 'w-[12rem] shrink-0 pl-2.5 pr-1 text-sm')}
        >
          {DIAL_OPTIONS.map((c) => (
            <option key={c.dial} value={c.dial}>
              {flag(c.iso)} {c.name} ({c.dial})
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          value={national}
          onChange={(e) => emit(dial, e.target.value)}
          placeholder={placeholder}
          className={cn(fieldClass, 'flex-1 min-w-0 px-3.5 placeholder:text-gray-400')}
        />
      </div>
      {hint && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}
