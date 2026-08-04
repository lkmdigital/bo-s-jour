'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  // Pilule rouge pleine — CTA principaux (Réserver, Payer, Confirmer)
  primary:
    'bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow-lg',
  // Pilule noire — actions secondaires fortes
  secondary:
    'bg-black text-white hover:bg-gray-800 shadow-sm hover:shadow-md',
  // Contour rouge — actions alternatives
  outline:
    'border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white',
  // Sans fond — actions discrètes
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
  // Rouge accent — actions destructrices (supprimer, annuler)
  danger:
    'bg-[#EE233C] text-white hover:brightness-90 shadow-sm',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-sm px-4 py-2 gap-1.5',
  md: 'text-base px-6 py-2.5 gap-2',
  lg: 'text-lg px-8 py-3.5 gap-2.5',
};

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const base =
  'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300 ' +
  'hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ' +
  'disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100';

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      base,
      VARIANTS[variant],
      SIZES[size],
      fullWidth && 'w-full',
      className
    );

    const content = (
      <>
        {loading ? (
          <Loader2 className="h-[1.1em] w-[1.1em] animate-spin" aria-hidden />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </>
    );

    if ('href' in props && props.href !== undefined) {
      const { href, ...anchorProps } = props as ButtonAsLink;
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes}
          {...anchorProps}
        >
          {content}
        </Link>
      );
    }

    const { disabled, type = 'button', ...btnProps } = props as ButtonAsButton;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled || loading}
        className={classes}
        {...btnProps}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
