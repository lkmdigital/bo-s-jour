'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { CheckCircle2, XCircle, FileText, ArrowRight } from 'lucide-react';

interface ComplianceRequirement {
  label: string;
  ok: boolean;
}

export default function HostDocumentsPage() {
  const [requirements, setRequirements] = useState<Record<string, ComplianceRequirement>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/host/profile')
      .then((res) => {
        setRequirements(res.data?.compliance_requirements ?? {});
        setStatus(res.data?.compliance_status ?? null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur lors du chargement des documents'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );
  }

  const items = Object.entries(requirements);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Statut de vos documents légaux et administratifs
          </p>
        </div>
        <Link
          href="/dashboard/host/profile"
          className="inline-flex items-center gap-1 text-sm font-semibold text-bosejour-red"
        >
          Modifier / téléverser <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

      {status && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-3">
          <FileText className="w-6 h-6 text-bosejour-red" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Statut global</p>
            <p className="font-semibold text-gray-900 dark:text-white capitalize">{status}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {items.length === 0 ? (
          <p className="p-5 text-gray-500 dark:text-gray-400">Aucune exigence documentaire pour l&apos;instant</p>
        ) : (
          items.map(([key, req]) => (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <span className="text-gray-800 dark:text-gray-200">{req.label}</span>
              {req.ok ? (
                <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Fourni
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
                  <XCircle className="w-4 h-4" /> Manquant
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
