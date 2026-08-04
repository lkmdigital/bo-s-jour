'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from 'react';
import ValidationDialog, { ValidationDialogProps, ComplianceRequirement } from './ValidationDialog';

export interface ValidationOptions {
  title?: string;
  message?: string;
  requirements?: ComplianceRequirement[];
  complianceStatus?: 'conforme' | 'non_conforme' | null;
  actionLabel?: string;
  actionHref?: string;
  showCancel?: boolean;
  cancelLabel?: string;
  variant?: 'warning' | 'info' | 'success';
  onAction?: () => void;
}

type ShowValidation = (options: ValidationOptions) => void;

const ValidationContext = createContext<ShowValidation | null>(null);

export function ValidationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ValidationDialogProps & { open: boolean }>({
    open: false,
    title: 'Validation requise',
    message: undefined,
    requirements: [],
    complianceStatus: null,
    actionLabel: 'Compléter mon profil',
    actionHref: undefined,
    showCancel: true,
    cancelLabel: 'Fermer',
    variant: 'warning',
    onClose: () => {},
    onAction: undefined,
  });

  const showValidation = useCallback((options: ValidationOptions) => {
    setState({
      open: true,
      title: options.title ?? 'Validation requise',
      message: options.message,
      requirements: options.requirements ?? [],
      complianceStatus: options.complianceStatus,
      actionLabel: options.actionLabel ?? 'Compléter mon profil',
      actionHref: options.actionHref,
      showCancel: options.showCancel ?? true,
      cancelLabel: options.cancelLabel ?? 'Fermer',
      variant: options.variant ?? 'warning',
      onClose: () => setState((s) => ({ ...s, open: false })),
      onAction: options.onAction,
    });
  }, []);

  const handleClose = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  return (
    <ValidationContext.Provider value={showValidation}>
      {children}
      <ValidationDialog
        open={state.open}
        title={state.title}
        message={state.message}
        requirements={state.requirements}
        complianceStatus={state.complianceStatus}
        actionLabel={state.actionLabel}
        actionHref={state.actionHref}
        showCancel={state.showCancel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        onClose={handleClose}
        onAction={state.onAction}
      />
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within ValidationProvider');
  }
  return context;
}
