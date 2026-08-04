import { BadgeCheck, Tag, Clock, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'promo'
  | 'verified'
  | 'pending'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral';

const VARIANTS: Record<BadgeVariant, string> = {
  promo: 'bg-primary text-white',
  verified: 'bg-[#4B5F5A] text-white',
  pending: 'bg-[#F7E8C6] text-[#7a5a00]',
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-[#EE233C]',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
};

// Icône par défaut selon la variante (surchargée par la prop `icon`)
const DEFAULT_ICONS: Partial<Record<BadgeVariant, React.ReactNode>> = {
  promo: <Tag className="h-3.5 w-3.5" aria-hidden />,
  verified: <BadgeCheck className="h-3.5 w-3.5" aria-hidden />,
  pending: <Clock className="h-3.5 w-3.5" aria-hidden />,
  success: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
  danger: <XCircle className="h-3.5 w-3.5" aria-hidden />,
  warning: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
  info: <Info className="h-3.5 w-3.5" aria-hidden />,
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  /** Affiche une icône : true = icône par défaut de la variante, ou un noeud custom */
  icon?: React.ReactNode | boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({
  variant = 'neutral',
  children,
  icon = false,
  size = 'md',
  className,
}: BadgeProps) {
  const resolvedIcon = icon === true ? DEFAULT_ICONS[variant] : icon || null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-full whitespace-nowrap',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        VARIANTS[variant],
        className
      )}
    >
      {resolvedIcon}
      {children}
    </span>
  );
}

/** Raccourcis prêts à l'emploi */
export function PromoBadge({ children = 'Promo', ...rest }: Partial<BadgeProps>) {
  return (
    <Badge variant="promo" icon {...rest}>
      {children}
    </Badge>
  );
}

export function VerifiedBadge({ children = 'Vérifié', ...rest }: Partial<BadgeProps>) {
  return (
    <Badge variant="verified" icon {...rest}>
      {children}
    </Badge>
  );
}
