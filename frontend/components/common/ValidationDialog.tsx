'use client';

import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Circle, FileText, User, Phone, Building2, Receipt } from 'lucide-react';
import Link from 'next/link';

export interface ComplianceRequirement {
  key: string;
  label: string;
  ok?: boolean;
  info?: string;
}

export interface ValidationDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  requirements?: ComplianceRequirement[];
  complianceStatus?: 'conforme' | 'non_conforme' | null;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionHref?: string;
  showCancel?: boolean;
  cancelLabel?: string;
  variant?: 'warning' | 'info' | 'success';
}

const iconMap: Record<string, React.ReactNode> = {
  manager_identity: <User className="w-4 h-4" />,
  id_document: <FileText className="w-4 h-4" />,
  id_number: <FileText className="w-4 h-4" />,
  establishment_phone: <Phone className="w-4 h-4" />,
  phone_fixed: <Phone className="w-4 h-4" />,
  whatsapp: <Phone className="w-4 h-4" />,
  rccm: <Building2 className="w-4 h-4" />,
  tax_account_number: <Receipt className="w-4 h-4" />,
  rccm_document: <FileText className="w-4 h-4" />,
  business_license: <FileText className="w-4 h-4" />,
  tax_document: <Receipt className="w-4 h-4" />,
};

export default function ValidationDialog({
  open,
  title = 'Validation requise',
  message,
  requirements = [],
  complianceStatus,
  onClose,
  onAction,
  actionLabel = 'Compléter mon profil',
  actionHref,
  showCancel = true,
  cancelLabel = 'Fermer',
  variant = 'warning',
}: ValidationDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const missingRequirements = requirements.filter((r) => !r.ok);
  const completedRequirements = requirements.filter((r) => r.ok);

  const variantStyles = {
    warning: {
      icon: <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      headerBg: 'bg-amber-100 dark:bg-amber-900/30',
      progressBg: 'bg-amber-200 dark:bg-amber-800',
      progressFill: 'bg-amber-500 dark:bg-amber-400',
    },
    info: {
      icon: <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      headerBg: 'bg-blue-100 dark:bg-blue-900/30',
      progressBg: 'bg-blue-200 dark:bg-blue-800',
      progressFill: 'bg-blue-500 dark:bg-blue-400',
    },
    success: {
      icon: <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />,
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      headerBg: 'bg-green-100 dark:bg-green-900/30',
      progressBg: 'bg-green-200 dark:bg-green-800',
      progressFill: 'bg-green-500 dark:bg-green-400',
    },
  };

  const styles = variantStyles[variant];
  const progressPercent = requirements.length > 0
    ? Math.round((completedRequirements.length / requirements.length) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl border ${styles.border} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${styles.headerBg} px-6 py-4 border-b ${styles.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {styles.icon}
              <h2
                id="validation-dialog-title"
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {message}
            </p>
          )}

          {/* Progress bar */}
          {requirements.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  Progression du profil
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {progressPercent}%
                </span>
              </div>
              <div className={`h-2 rounded-full ${styles.progressBg}`}>
                <div
                  className={`h-2 rounded-full ${styles.progressFill} transition-all duration-300`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Missing requirements */}
          {missingRequirements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Documents et informations manquants ({missingRequirements.length})
              </h3>
              <ul className="space-y-2">
                {missingRequirements.map((req) => (
                  <li
                    key={req.key}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      {iconMap[req.key] || <Circle className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {req.label}
                      </p>
                      {req.info && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {req.info}
                        </p>
                      )}
                    </div>
                    <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Completed requirements (collapsible, show first 2) */}
          {completedRequirements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400 mb-3">
                Documents validés ({completedRequirements.length})
              </h3>
              <ul className="space-y-2">
                {completedRequirements.slice(0, 2).map((req) => (
                  <li
                    key={req.key}
                    className="flex items-center gap-3 p-2 bg-green-50/50 dark:bg-green-900/10 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-green-800 dark:text-green-300">
                      {req.label}
                    </span>
                  </li>
                ))}
                {completedRequirements.length > 2 && (
                  <li className="text-xs text-gray-500 dark:text-gray-400 pl-11">
                    +{completedRequirements.length - 2} autres documents validés
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Status badge */}
          {complianceStatus && (
            <div className="flex items-center justify-center">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  complianceStatus === 'conforme'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                }`}
              >
                {complianceStatus === 'conforme' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Profil conforme
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Profil non conforme
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary w-full sm:w-auto"
            >
              {cancelLabel}
            </button>
          )}
          {actionHref ? (
            <Link
              href={actionHref}
              onClick={onAction}
              className="btn-primary w-full sm:w-auto text-center"
            >
              {actionLabel}
            </Link>
          ) : onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="btn-primary w-full sm:w-auto"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
