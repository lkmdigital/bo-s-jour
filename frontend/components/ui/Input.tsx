'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, hint, leftIcon, rightIcon, className, containerClassName, id, required, ...props },
    ref
  ) => {
    const autoId = useId();
    const inputId = id || autoId;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5"
          >
            {label}
            {required && <span className="text-primary ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              'w-full rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              'py-2.5 text-base',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon ? 'pr-10' : 'pr-3.5',
              error
                ? 'border-[#EE233C] focus:ring-[#EE233C]/30 focus:border-[#EE233C]'
                : 'border-gray-300 dark:border-gray-600',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </span>
          )}
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-[#EE233C]">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-gray-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
