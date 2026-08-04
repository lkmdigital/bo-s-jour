import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ajoute un effet de survol (pour les cartes cliquables) */
  interactive?: boolean;
  /** Rembourrage interne (défaut: p-6) */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export default function Card({
  interactive = false,
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-2xl shadow-md',
        PADDING[padding],
        interactive && 'transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
